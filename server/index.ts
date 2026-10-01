import { stripCodeFences, ensureRenderCall } from './generator';
import { withModelFallback } from './fallback';
import { describeApiError, missingKeyMessage } from './errors';
import {
  extractAnthropicDelta,
  extractGoogleDelta,
  formatEvent,
  isGoogleTruncated,
  takeDataLines,
} from './stream';

// 우선순위 순서. 앞 모델이 실패하면 다음 모델로 폴백한다.
const GOOGLE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];

const SYSTEM_PROMPT = `You are a React component generator. Generate a single React component based on the user's description.

Rules:
- Use inline styles only (no CSS imports, no CSS modules)
- Do NOT use import statements — React is already available in scope as a global
- Define the component as a function, then call render(<ComponentName />) at the end
- Make the component visually appealing with proper styling
- Use React hooks if needed (e.g., React.useState, React.useEffect)
- The component must be completely self-contained
- Respond with ONLY the code block — no explanations, no markdown fences
- Use descriptive variable names and clean formatting
- For colors, prefer modern palettes (gradients, shadows, etc.)
- Ensure the component is interactive where appropriate (hover states, click handlers, etc.)
- Do NOT use TypeScript syntax — no type annotations, no interfaces, no generics, no "as" casts. Write plain JavaScript only.

Example output format:
const GradientButton = () => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      style={{
        background: hovered
          ? 'linear-gradient(135deg, #667eea, #764ba2)'
          : 'linear-gradient(135deg, #764ba2, #667eea)',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Click me
    </button>
  );
};

render(<GradientButton />);`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type Provider = 'anthropic' | 'google';

const ENV_KEYS: Record<Provider, string | undefined> = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
};

function resolveApiKey(provider: Provider, clientKey?: string): string | null {
  return clientKey || ENV_KEYS[provider] || null;
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  return data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

async function callGoogleModel(prompt: string, apiKey: string, model: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{
      content: { parts: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };

  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
  }

  return (
    candidate?.content?.parts
      ?.map((part) => part.text)
      ?.join('') ?? ''
  );
}

async function callGoogle(prompt: string, apiKey: string): Promise<string> {
  return withModelFallback(GOOGLE_MODELS, (model) => callGoogleModel(prompt, apiKey, model));
}

type OnDelta = (text: string) => void;

/** 업스트림 SSE 본문을 끝까지 읽어 완결된 data 줄마다 콜백을 부른다. */
async function readSSE(body: ReadableStream<Uint8Array>, onData: (data: string) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { data, rest } = takeDataLines(buffer);
    buffer = rest;

    for (const chunk of data) onData(chunk);
  }
}

async function streamAnthropic(prompt: string, apiKey: string, onDelta: OnDelta) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  await readSSE(response.body, (data) => {
    const text = extractAnthropicDelta(data);
    if (text) onDelta(text);
  });
}

async function streamGoogleModel(
  prompt: string,
  apiKey: string,
  model: string,
  onDelta: OnDelta,
) {
  // alt=sse 를 붙이지 않으면 JSON 배열이 조각으로 와서 줄 단위 파싱이 불가능하다.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  await readSSE(response.body, (data) => {
    if (isGoogleTruncated(data)) {
      throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
    }

    const text = extractGoogleDelta(data);
    if (text) onDelta(text);
  });
}

async function streamGoogle(prompt: string, apiKey: string, onDelta: OnDelta) {
  // withModelFallback 을 쓰지 않는다 — 델타를 이미 내보낸 뒤 다음 모델로 넘어가면
  // 같은 코드가 두 번 흘러 클라이언트 화면이 깨진다. 아무것도 내보내지 않았을
  // 때만 폴백한다.
  let lastError: unknown;

  for (const model of GOOGLE_MODELS) {
    let emitted = false;

    try {
      await streamGoogleModel(prompt, apiKey, model, (text) => {
        emitted = true;
        onDelta(text);
      });
      return;
    } catch (err) {
      lastError = err;
      if (emitted) throw err;
    }
  }

  throw lastError;
}

const server = Bun.serve({
  port: 3002,
  async fetch(req) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/api/config') {
      return Response.json(
        {
          envKeys: {
            anthropic: !!ENV_KEYS.anthropic,
            google: !!ENV_KEYS.google,
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    if (req.method === 'POST' && url.pathname === '/api/generate/stream') {
      const { prompt, apiKey, provider = 'anthropic' } = (await req.json()) as {
        prompt: string;
        apiKey?: string;
        provider?: Provider;
      };

      const resolvedKey = resolveApiKey(provider, apiKey);

      // 스트림을 열기 전에 막는다 — 한 번 200 으로 응답하면 상태 코드를 못 바꾼다.
      if (!resolvedKey) {
        return Response.json(
          { error: missingKeyMessage(provider) },
          { status: 400, headers: CORS_HEADERS },
        );
      }

      if (!prompt) {
        return Response.json(
          { error: 'Prompt is required' },
          { status: 400, headers: CORS_HEADERS },
        );
      }

      const encoder = new TextEncoder();

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (event: string, data: unknown) =>
            controller.enqueue(encoder.encode(formatEvent(event, data)));

          let raw = '';

          try {
            const onDelta = (text: string) => {
              raw += text;
              send('delta', { text });
            };

            if (provider === 'google') {
              await streamGoogle(prompt, resolvedKey, onDelta);
            } else {
              await streamAnthropic(prompt, resolvedKey, onDelta);
            }

            // 정규화는 스트림이 끝난 뒤 전체 텍스트에 한 번 적용한다 —
            // 코드펜스 제거와 render() 주입은 부분 문자열에 걸 수 없다
            // (AGENTS.md 규칙 8·9).
            send('done', { code: ensureRenderCall(stripCodeFences(raw)) });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            send('error', describeApiError(message));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/generate') {
      try {
        const { prompt, apiKey, provider = 'anthropic' } = (await req.json()) as {
          prompt: string;
          apiKey?: string;
          provider?: Provider;
        };

        const resolvedKey = resolveApiKey(provider, apiKey);

        if (!resolvedKey) {
          return Response.json(
            { error: missingKeyMessage(provider) },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        if (!prompt) {
          return Response.json(
            { error: 'Prompt is required' },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        const text =
          provider === 'google'
            ? await callGoogle(prompt, resolvedKey)
            : await callAnthropic(prompt, resolvedKey);

        const code = ensureRenderCall(stripCodeFences(text));

        return Response.json({ code }, { headers: CORS_HEADERS });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        const { status, error } = describeApiError(message);

        return Response.json({ error }, { status, headers: CORS_HEADERS });
      }
    }

    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: CORS_HEADERS }
    );
  },
});

console.log(`API server running at http://localhost:${server.port}`);

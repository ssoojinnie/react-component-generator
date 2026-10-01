// 스트리밍 응답을 다루는 순수 함수들. 프로바이더별 SSE 청크에서 텍스트 델타를
// 뽑아내고, 클라이언트로 보낼 SSE 이벤트를 만든다. 부수효과가 없어 단위 테스트가 된다.

/** SSE 이벤트 한 건을 만든다. JSON 직렬화가 본문의 줄바꿈을 이스케이프해 준다. */
export function formatEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * 업스트림 SSE 버퍼에서 완결된 `data:` 줄의 본문만 꺼내고, 끝나지 않은 꼬리를 남긴다.
 * 업스트림 청크는 줄 경계와 무관하게 잘리므로 rest 를 다음 청크 앞에 붙여야 한다.
 */
export function takeDataLines(buffer: string): { data: string[]; rest: string } {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';

  const data: string[] = [];
  for (const line of lines) {
    const trimmed = line.endsWith('\r') ? line.slice(0, -1) : line;
    if (trimmed.startsWith('data:')) {
      data.push(trimmed.slice('data:'.length).trim());
    }
  }

  return { data, rest };
}

function parse(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    // 네트워크 경계에서 잘린 조각이 들어올 수 있다. 버리고 다음 청크를 기다린다.
    return null;
  }
}

/** Anthropic 스트림의 content_block_delta 에서 텍스트를 뽑는다. */
export function extractAnthropicDelta(data: string): string | null {
  const parsed = parse(data) as {
    type?: string;
    delta?: { type?: string; text?: string };
  } | null;

  if (parsed?.type !== 'content_block_delta') return null;
  if (parsed.delta?.type !== 'text_delta') return null;

  return parsed.delta.text ?? null;
}

type GoogleChunk = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
} | null;

/** Google 스트림의 candidates[0].content.parts 텍스트를 이어 붙인다. */
export function extractGoogleDelta(data: string): string | null {
  const parsed = parse(data) as GoogleChunk;
  const parts = parsed?.candidates?.[0]?.content?.parts;
  if (!parts?.length) return null;

  const text = parts.map((part) => part.text ?? '').join('');
  return text || null;
}

/**
 * 토큰 상한으로 응답이 잘렸는지 본다. 이 처리는 Google 에만 있는 비대칭이다
 * (AGENTS.md 규칙 12) — Anthropic 쪽에는 대응하는 stop_reason 검사가 없다.
 */
export function isGoogleTruncated(data: string): boolean {
  const parsed = parse(data) as GoogleChunk;
  return parsed?.candidates?.[0]?.finishReason === 'MAX_TOKENS';
}

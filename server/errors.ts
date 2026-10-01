// 업스트림 에러를 사용자에게 보여줄 메시지와 HTTP 상태로 바꾼다.
// 스트리밍 라우트와 일반 라우트가 같은 문구를 쓰도록 한곳에 모았다.

interface ApiError {
  status: number;
  error: string;
}

const KEY_ENV_NAME = {
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
} as const;

export function missingKeyMessage(provider: 'anthropic' | 'google'): string {
  return `API key is required. Set ${KEY_ENV_NAME[provider]} in .env or enter it manually.`;
}

export function describeApiError(message: string): ApiError {
  if (message.includes('503')) {
    return {
      status: 503,
      error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
    };
  }

  if (message.includes('429')) {
    return { status: 429, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' };
  }

  return { status: 500, error: message };
}

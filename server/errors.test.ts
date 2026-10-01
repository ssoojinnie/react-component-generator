import { describe, expect, it } from 'vitest';
import { describeApiError, missingKeyMessage } from './errors';

// 두 라우트(일반·스트리밍)가 같은 문구를 내도록 한곳에서 만든다.
describe('missingKeyMessage', () => {
  it('anthropic 은 ANTHROPIC_API_KEY 를 가리킨다', () => {
    expect(missingKeyMessage('anthropic')).toBe(
      'API key is required. Set ANTHROPIC_API_KEY in .env or enter it manually.',
    );
  });

  it('google 은 GOOGLE_API_KEY 를 가리킨다', () => {
    expect(missingKeyMessage('google')).toBe(
      'API key is required. Set GOOGLE_API_KEY in .env or enter it manually.',
    );
  });
});

describe('describeApiError', () => {
  it('503 은 과부하 안내로 바꾼다', () => {
    expect(describeApiError('Gemini API error: 503')).toEqual({
      status: 503,
      error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
    });
  });

  it('429 는 요청 과다 안내로 바꾼다', () => {
    expect(describeApiError('Claude API error: 429')).toEqual({
      status: 429,
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    });
  });

  it('그 외는 원래 메시지를 500 으로 돌려준다', () => {
    expect(describeApiError('생성된 코드가 너무 길어 잘렸습니다.')).toEqual({
      status: 500,
      error: '생성된 코드가 너무 길어 잘렸습니다.',
    });
  });
});

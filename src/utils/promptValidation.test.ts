import { describe, it, expect } from 'vitest';
import { MAX_PROMPT_LENGTH, validatePrompt } from './promptValidation';

describe('validatePrompt', () => {
  it('500자 이하면 유효하다', () => {
    expect(validatePrompt('프로필 카드')).toEqual({ valid: true, error: null });
  });

  it('정확히 500자는 유효하다', () => {
    expect(validatePrompt('가'.repeat(500))).toEqual({ valid: true, error: null });
  });

  it('500자를 넘으면 초과 길이를 알려준다', () => {
    expect(validatePrompt('가'.repeat(503))).toEqual({
      valid: false,
      error: '프롬프트는 500자까지 입력할 수 있습니다. 현재 503자입니다.',
    });
  });

  it('앞뒤 공백은 길이에서 제외한다', () => {
    expect(validatePrompt(`  ${'가'.repeat(500)}  `)).toEqual({ valid: true, error: null });
  });

  it('상한값을 상수로 공개한다', () => {
    expect(MAX_PROMPT_LENGTH).toBe(500);
  });
});

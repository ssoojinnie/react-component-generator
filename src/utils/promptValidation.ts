export const MAX_PROMPT_LENGTH = 500;

export interface PromptValidation {
  valid: boolean;
  error: string | null;
}

// 제출 시점에 prompt.trim()을 보내므로(PromptInput.handleSubmit),
// 길이도 같은 기준인 trim 후 값으로 센다.
export function validatePrompt(prompt: string): PromptValidation {
  const length = prompt.trim().length;

  if (length > MAX_PROMPT_LENGTH) {
    return {
      valid: false,
      error: `프롬프트는 ${MAX_PROMPT_LENGTH}자까지 입력할 수 있습니다. 현재 ${length}자입니다.`,
    };
  }

  return { valid: true, error: null };
}

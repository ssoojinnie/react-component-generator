import type { GeneratedComponent, Provider } from '../types';

export const MAX_HISTORY = 10;

// 한 도메인(localhost:5173)을 다른 앱과 공유할 수 있으니 접두사를 붙인다.
export const STORAGE_KEYS = {
  apiKey: 'rcg.apiKey',
  provider: 'rcg.provider',
  history: 'rcg.history',
  components: 'rcg.components',
} as const;

const PROVIDERS: Provider[] = ['anthropic', 'google'];

// localStorage 값은 사용자가 직접 고칠 수 있고 앱 버전이 바뀌면 모양도 달라진다.
// 그래서 읽기 쪽은 전부 "검증하고, 이상하면 버린다"로 통일한다 — 깨진 값 하나가
// 앱 전체를 시작조차 못 하게 만드는 쪽이 훨씬 나쁘다.
function parseArray(raw: string | null): unknown[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addPrompt(history: string[], prompt: string): string[] {
  const trimmed = prompt.trim();
  if (!trimmed) return history;

  return [trimmed, ...history.filter((p) => p !== trimmed)].slice(0, MAX_HISTORY);
}

export function parseHistory(raw: string | null): string[] {
  return parseArray(raw)
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .slice(0, MAX_HISTORY);
}

export function parseProvider(raw: string | null): Provider | null {
  return PROVIDERS.find((p) => p === raw) ?? null;
}

export function parseComponents(raw: string | null): GeneratedComponent[] {
  const result: GeneratedComponent[] = [];

  for (const item of parseArray(raw)) {
    if (typeof item !== 'object' || item === null) continue;

    const { id, prompt, code, createdAt } = item as Record<string, unknown>;
    if (
      typeof id !== 'string' ||
      typeof prompt !== 'string' ||
      typeof code !== 'string' ||
      typeof createdAt !== 'string'
    ) {
      continue;
    }

    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) continue;

    result.push({ id, prompt, code, createdAt: date });
  }

  return result;
}

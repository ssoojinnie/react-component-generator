import type { GeneratedComponent, Provider } from '../types';

export const MAX_HISTORY = 10;

// 한 도메인(localhost:5173)을 다른 앱과 공유할 수 있으니 접두사를 붙인다.
export const STORAGE_KEYS = {
  provider: 'rcg.provider',
  history: 'rcg.history',
  components: 'rcg.components',
} as const;

// API 키는 저장하지 않는다. react-live가 모델이 만든 코드를 이 페이지와 같은
// realm에서 실행하므로(LivePreview의 noInline), localStorage에 둔 키는 생성된
// 코드가 그대로 읽어 외부로 보낼 수 있다. sessionStorage도 같은 realm이라
// 해결되지 않는다. 이전 버전이 저장해 둔 키는 시작할 때 지운다.
export const LEGACY_API_KEY_KEY = 'rcg.apiKey';

export function purgeStoredApiKey(): void {
  try {
    localStorage.removeItem(LEGACY_API_KEY_KEY);
  } catch {
    // 스토리지가 막힌 환경이면 애초에 저장된 키도 없다.
  }
}

// 복원된 창은 접은 상태로 띄운다 — 펼쳐서 복원하면 저장된 코드가 로드마다
// 자동 실행되고, 폭주하는 코드에서 새로고침으로 빠져나올 수 없게 된다.
export function restoredIds(components: GeneratedComponent[]): string[] {
  return components.map((c) => c.id);
}

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

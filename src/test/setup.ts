import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// 이 런타임(Bun + jsdom)이 주는 전역 localStorage는 Storage 인터페이스가 아니다
// (getItem/setItem/clear가 없는 맨 객체). 영속 state 로직을 테스트하려면
// 실제 브라우저와 같은 모양이 필요하므로 메모리 구현으로 교체한다.
if (typeof window.localStorage?.clear !== 'function') {
  const store = new Map<string, string>();

  const memoryStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };

  Object.defineProperty(window, 'localStorage', {
    value: memoryStorage,
    configurable: true,
  });
}

// 각 테스트 후 렌더된 DOM을 정리해 테스트 간 격리를 보장한다.
// localStorage도 함께 비운다 — 영속 state(usePersistentState)를 쓰는 테스트가
// 남긴 값이 다음 테스트에서 되살아나면 실패가 아니라 순서 의존으로 나타난다.
afterEach(() => {
  cleanup();
  localStorage.clear();
});

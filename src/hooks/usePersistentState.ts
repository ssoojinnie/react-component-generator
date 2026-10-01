import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

function read<T>(
  key: string,
  fallback: T,
  parse: (raw: string | null) => T | null,
): T {
  try {
    return parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    // 프라이빗 모드·차단된 스토리지에서는 getItem 자체가 던진다.
    return fallback;
  }
}

/**
 * state를 localStorage에 붙여 새로고침 후에도 살아남게 한다.
 *
 * 문자열은 인용부호 없이 그대로 저장한다 — 사용자가 개발자 도구에서 값을 직접
 * 보거나 고칠 수 있는 쪽이 API 키·프로바이더 같은 스칼라 값에는 더 낫다.
 */
export function usePersistentState<T>(
  key: string,
  fallback: T,
  parse: (raw: string | null) => T | null,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => read(key, fallback, parse));

  useEffect(() => {
    try {
      localStorage.setItem(
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      );
    } catch {
      // 저장 실패(용량 초과 등)로 화면 동작까지 막지는 않는다.
    }
  }, [key, value]);

  return [value, setValue];
}

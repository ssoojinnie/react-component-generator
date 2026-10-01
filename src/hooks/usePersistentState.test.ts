import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePersistentState } from './usePersistentState';

const asString = (raw: string | null) => raw;

describe('usePersistentState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('저장된 값이 없으면 기본값을 쓴다', () => {
    const { result } = renderHook(() => usePersistentState('k', 'fallback', asString));

    expect(result.current[0]).toBe('fallback');
  });

  it('저장된 값을 파서로 읽어 초기값으로 쓴다', () => {
    localStorage.setItem('k', '42');

    const { result } = renderHook(() =>
      usePersistentState('k', 0, (raw) => (raw ? Number(raw) : null)),
    );

    expect(result.current[0]).toBe(42);
  });

  it('파서가 null을 주면 기본값으로 돌아간다', () => {
    localStorage.setItem('k', '쓰레기값');

    const { result } = renderHook(() => usePersistentState('k', 'fallback', () => null));

    expect(result.current[0]).toBe('fallback');
  });

  it('값을 바꾸면 localStorage에 쓴다', () => {
    const { result } = renderHook(() => usePersistentState('k', '', asString));

    act(() => result.current[1]('새 값'));

    expect(localStorage.getItem('k')).toBe('새 값');
  });

  it('객체 값은 JSON으로 직렬화한다', () => {
    const { result } = renderHook(() =>
      usePersistentState<string[]>('k', [], () => null),
    );

    act(() => result.current[1](['a', 'b']));

    expect(localStorage.getItem('k')).toBe('["a","b"]');
  });

  // 사파리 프라이빗 모드 등 localStorage가 던지는 환경에서도 앱은 떠야 한다.
  it('localStorage 읽기가 실패하면 기본값으로 동작한다', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('접근 거부');
    });

    const { result } = renderHook(() => usePersistentState('k', 'fallback', asString));

    expect(result.current[0]).toBe('fallback');
    vi.restoreAllMocks();
  });

  it('localStorage 쓰기가 실패해도 state는 갱신된다', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('용량 초과');
    });

    const { result } = renderHook(() => usePersistentState('k', '', asString));

    act(() => result.current[1]('새 값'));

    expect(result.current[0]).toBe('새 값');
    vi.restoreAllMocks();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LEGACY_API_KEY_KEY,
  MAX_HISTORY,
  addPrompt,
  parseComponents,
  parseHistory,
  parseProvider,
  purgeStoredApiKey,
  restoredIds,
} from './storage';

describe('addPrompt', () => {
  it('새 프롬프트를 맨 앞에 넣는다', () => {
    expect(addPrompt(['이전'], '새것')).toEqual(['새것', '이전']);
  });

  it('공백을 제거한 값으로 저장한다', () => {
    expect(addPrompt([], '  카드 만들어줘  ')).toEqual(['카드 만들어줘']);
  });

  it('빈 프롬프트는 추가하지 않는다', () => {
    expect(addPrompt(['이전'], '   ')).toEqual(['이전']);
  });

  it('이미 있는 프롬프트는 중복 없이 맨 앞으로 옮긴다', () => {
    expect(addPrompt(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it(`${MAX_HISTORY}개를 넘으면 오래된 항목을 버린다`, () => {
    const full = Array.from({ length: MAX_HISTORY }, (_, i) => `p${i}`);
    const result = addPrompt(full, '최신');

    expect(result).toHaveLength(MAX_HISTORY);
    expect(result[0]).toBe('최신');
    expect(result).not.toContain(`p${MAX_HISTORY - 1}`);
  });
});

describe('purgeStoredApiKey', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('이전 버전이 저장한 API 키를 지운다', () => {
    localStorage.setItem(LEGACY_API_KEY_KEY, 'sk-ant-예전키');

    purgeStoredApiKey();

    expect(localStorage.getItem(LEGACY_API_KEY_KEY)).toBeNull();
  });

  it('스토리지 접근이 실패해도 던지지 않는다', () => {
    vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('접근 거부');
    });

    expect(() => purgeStoredApiKey()).not.toThrow();
  });
});

describe('restoredIds', () => {
  it('복원된 컴포넌트의 id를 모두 준다', () => {
    const at = new Date('2026-10-01T00:00:00.000Z');

    expect(
      restoredIds([
        { id: 'a', prompt: 'p', code: 'c', createdAt: at },
        { id: 'b', prompt: 'p', code: 'c', createdAt: at },
      ]),
    ).toEqual(['a', 'b']);
  });

  it('복원된 것이 없으면 빈 배열을 준다', () => {
    expect(restoredIds([])).toEqual([]);
  });
});

describe('parseHistory', () => {
  it('문자열 배열을 그대로 읽는다', () => {
    expect(parseHistory('["a","b"]')).toEqual(['a', 'b']);
  });

  it('값이 없으면 빈 배열을 준다', () => {
    expect(parseHistory(null)).toEqual([]);
  });

  it('깨진 JSON이면 빈 배열을 준다', () => {
    expect(parseHistory('{not json')).toEqual([]);
  });

  it('배열이 아니면 빈 배열을 준다', () => {
    expect(parseHistory('{"a":1}')).toEqual([]);
  });

  it('문자열이 아니거나 빈 항목은 버린다', () => {
    expect(parseHistory('["a",1,null,"  ","b"]')).toEqual(['a', 'b']);
  });

  it(`${MAX_HISTORY}개까지만 읽는다`, () => {
    const raw = JSON.stringify(
      Array.from({ length: MAX_HISTORY + 5 }, (_, i) => `p${i}`),
    );

    expect(parseHistory(raw)).toHaveLength(MAX_HISTORY);
  });
});

describe('parseProvider', () => {
  it('알려진 프로바이더를 읽는다', () => {
    expect(parseProvider('anthropic')).toBe('anthropic');
    expect(parseProvider('google')).toBe('google');
  });

  it('모르는 값이면 null을 준다', () => {
    expect(parseProvider('openai')).toBeNull();
    expect(parseProvider(null)).toBeNull();
  });
});

describe('parseComponents', () => {
  const stored = JSON.stringify([
    {
      id: '1',
      prompt: '카드',
      code: 'render(<div />)',
      createdAt: '2026-10-01T00:00:00.000Z',
    },
  ]);

  it('저장된 컴포넌트를 읽는다', () => {
    expect(parseComponents(stored)).toEqual([
      {
        id: '1',
        prompt: '카드',
        code: 'render(<div />)',
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
      },
    ]);
  });

  it('createdAt을 Date로 되살린다', () => {
    expect(parseComponents(stored)[0].createdAt).toBeInstanceOf(Date);
  });

  it('값이 없거나 깨졌으면 빈 배열을 준다', () => {
    expect(parseComponents(null)).toEqual([]);
    expect(parseComponents('{not json')).toEqual([]);
    expect(parseComponents('"문자열"')).toEqual([]);
  });

  it('필수 필드가 없는 항목은 버린다', () => {
    const raw = JSON.stringify([
      { id: '1', prompt: '카드', createdAt: '2026-10-01T00:00:00.000Z' },
      { id: '2', prompt: '버튼', code: 'render(<b />)', createdAt: '2026-10-01T00:00:00.000Z' },
    ]);

    expect(parseComponents(raw).map((c) => c.id)).toEqual(['2']);
  });

  it('createdAt이 유효한 날짜가 아니면 버린다', () => {
    const raw = JSON.stringify([
      { id: '1', prompt: '카드', code: 'render(<div />)', createdAt: '언제인지모름' },
    ]);

    expect(parseComponents(raw)).toEqual([]);
  });
});

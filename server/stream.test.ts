import { describe, expect, it } from 'vitest';
import {
  extractAnthropicDelta,
  extractGoogleDelta,
  formatEvent,
  isGoogleTruncated,
  takeDataLines,
} from './stream';

// 업스트림(Anthropic·Google) SSE 를 읽을 때 청크는 줄 경계와 무관하게 잘린다.
describe('takeDataLines', () => {
  it('완결된 data 줄의 본문만 뽑는다', () => {
    expect(takeDataLines('data: {"a":1}\n')).toEqual({
      data: ['{"a":1}'],
      rest: '',
    });
  });

  it('data 가 아닌 줄은 버린다', () => {
    expect(takeDataLines('event: content_block_delta\ndata: {"a":1}\n')).toEqual({
      data: ['{"a":1}'],
      rest: '',
    });
  });

  it('완결되지 않은 꼬리는 rest 로 남긴다', () => {
    expect(takeDataLines('data: {"a":1}\ndata: {"b"')).toEqual({
      data: ['{"a":1}'],
      rest: 'data: {"b"',
    });
  });

  it('줄이 하나도 끝나지 않았으면 전부 rest 다', () => {
    expect(takeDataLines('data: {"a"')).toEqual({ data: [], rest: 'data: {"a"' });
  });

  it('CRLF 줄바꿈도 읽는다', () => {
    expect(takeDataLines('data: {"a":1}\r\n')).toEqual({
      data: ['{"a":1}'],
      rest: '',
    });
  });
});

describe('formatEvent', () => {
  it('SSE 이벤트 한 건을 이름과 JSON 본문으로 만든다', () => {
    expect(formatEvent('delta', { text: '안녕' })).toBe(
      'event: delta\ndata: {"text":"안녕"}\n\n',
    );
  });

  it('본문에 줄바꿈이 있어도 JSON 이스케이프되어 한 줄로 나간다', () => {
    expect(formatEvent('delta', { text: 'a\nb' })).toBe(
      'event: delta\ndata: {"text":"a\\nb"}\n\n',
    );
  });
});

describe('extractAnthropicDelta', () => {
  it('content_block_delta 에서 텍스트를 뽑는다', () => {
    const data =
      '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"const A"}}';
    expect(extractAnthropicDelta(data)).toBe('const A');
  });

  it('텍스트 델타가 아닌 이벤트는 무시한다', () => {
    expect(extractAnthropicDelta('{"type":"message_start","message":{}}')).toBeNull();
  });

  it('깨진 JSON 은 무시한다', () => {
    expect(extractAnthropicDelta('{깨짐')).toBeNull();
  });
});

describe('extractGoogleDelta', () => {
  it('candidates 의 parts 텍스트를 뽑는다', () => {
    const data = '{"candidates":[{"content":{"parts":[{"text":"const A"}],"role":"model"}}]}';
    expect(extractGoogleDelta(data)).toBe('const A');
  });

  it('parts 가 여러 개면 이어 붙인다', () => {
    const data = '{"candidates":[{"content":{"parts":[{"text":"a"},{"text":"b"}]}}]}';
    expect(extractGoogleDelta(data)).toBe('ab');
  });

  it('후보가 없으면 무시한다', () => {
    expect(extractGoogleDelta('{"candidates":[]}')).toBeNull();
  });

  it('깨진 JSON 은 무시한다', () => {
    expect(extractGoogleDelta('{깨짐')).toBeNull();
  });
});

// 토큰 상한 절단은 Google 에만 있는 처리다 (AGENTS.md 규칙 12).
describe('isGoogleTruncated', () => {
  it('finishReason 이 MAX_TOKENS 이면 참이다', () => {
    expect(isGoogleTruncated('{"candidates":[{"finishReason":"MAX_TOKENS"}]}')).toBe(true);
  });

  it('정상 종료면 거짓이다', () => {
    expect(isGoogleTruncated('{"candidates":[{"finishReason":"STOP"}]}')).toBe(false);
  });

  it('깨진 JSON 이면 거짓이다', () => {
    expect(isGoogleTruncated('{깨짐')).toBe(false);
  });
});

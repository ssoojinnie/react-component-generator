import { describe, expect, it } from 'vitest';
import { createEventParser } from './sse';

describe('createEventParser', () => {
  it('완결된 이벤트 하나를 읽는다', () => {
    const parser = createEventParser();

    expect(parser.push('event: delta\ndata: {"text":"a"}\n\n')).toEqual([
      { event: 'delta', data: '{"text":"a"}' },
    ]);
  });

  it('한 번에 들어온 이벤트 두 개를 모두 읽는다', () => {
    const parser = createEventParser();

    const events = parser.push('event: delta\ndata: 1\n\nevent: delta\ndata: 2\n\n');

    expect(events).toEqual([
      { event: 'delta', data: '1' },
      { event: 'delta', data: '2' },
    ]);
  });

  // 네트워크 청크는 이벤트 경계와 무관하게 잘린다.
  it('이벤트 중간에서 잘려 들어오면 다음 청크까지 기다린다', () => {
    const parser = createEventParser();

    expect(parser.push('event: delta\ndata: {"te')).toEqual([]);
    expect(parser.push('xt":"a"}\n\n')).toEqual([
      { event: 'delta', data: '{"text":"a"}' },
    ]);
  });

  it('완결되지 않은 꼬리는 이벤트로 내보내지 않는다', () => {
    const parser = createEventParser();

    expect(parser.push('event: delta\ndata: 1\n\nevent: del')).toEqual([
      { event: 'delta', data: '1' },
    ]);
  });

  it('이벤트 이름이 없으면 message 로 본다', () => {
    const parser = createEventParser();

    expect(parser.push('data: 1\n\n')).toEqual([{ event: 'message', data: '1' }]);
  });

  it('data 줄이 여러 개면 줄바꿈으로 이어 붙인다', () => {
    const parser = createEventParser();

    expect(parser.push('event: delta\ndata: a\ndata: b\n\n')).toEqual([
      { event: 'delta', data: 'a\nb' },
    ]);
  });

  it('콜론으로 시작하는 주석 줄은 버린다', () => {
    const parser = createEventParser();

    expect(parser.push(': keep-alive\nevent: delta\ndata: 1\n\n')).toEqual([
      { event: 'delta', data: '1' },
    ]);
  });

  it('data 가 없는 블록은 이벤트로 내보내지 않는다', () => {
    const parser = createEventParser();

    expect(parser.push('event: ping\n\n')).toEqual([]);
  });

  it('CRLF 줄바꿈도 읽는다', () => {
    const parser = createEventParser();

    expect(parser.push('event: delta\r\ndata: 1\r\n\r\n')).toEqual([
      { event: 'delta', data: '1' },
    ]);
  });
});

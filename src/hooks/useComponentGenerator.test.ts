import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useComponentGenerator } from './useComponentGenerator';

/** SSE 본문을 흘려보내는 가짜 응답. 청크를 나눠 보내 경계 처리까지 태운다. */
function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function mockFetch(response: Response | Promise<Response>) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useComponentGenerator 스트리밍', () => {
  it('델타가 오면 코드가 누적된다', async () => {
    mockFetch(
      sseResponse([
        'event: delta\ndata: {"text":"const A"}\n\n',
        'event: delta\ndata: {"text":" = 1;"}\n\n',
      ]),
    );

    const { result } = renderHook(() => useComponentGenerator());

    await act(async () => {
      await result.current.generate('카드', undefined, 'google');
    });

    expect(result.current.components[0].code).toBe('const A = 1;');
  });

  it('스트리밍 중인 컴포넌트의 id 를 알려준다', async () => {
    let release: (() => void) | undefined;
    const encoder = new TextEncoder();

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: delta\ndata: {"text":"const A"}\n\n'));
        release = () => controller.close();
      },
    });

    mockFetch(new Response(body, { status: 200 }));

    const { result } = renderHook(() => useComponentGenerator());

    act(() => {
      void result.current.generate('카드', undefined, 'google');
    });

    // id 끼리 비교만 하면 둘 다 undefined 일 때 공허하게 통과한다.
    await waitFor(() => {
      expect(result.current.components).toHaveLength(1);
      expect(typeof result.current.streamingId).toBe('string');
      expect(result.current.streamingId).toBe(result.current.components[0].id);
    });

    await act(async () => {
      release?.();
    });
  });

  it('done 이 오면 최종 코드로 바꾼다', async () => {
    mockFetch(
      sseResponse([
        'event: delta\ndata: {"text":"const A = 1;"}\n\n',
        'event: done\ndata: {"code":"const A = 1;\\n\\nrender(<A />);"}\n\n',
      ]),
    );

    const { result } = renderHook(() => useComponentGenerator());

    await act(async () => {
      await result.current.generate('카드', undefined, 'google');
    });

    expect(result.current.components[0].code).toBe('const A = 1;\n\nrender(<A />);');
  });

  it('스트림이 끝나면 streamingId 를 비운다', async () => {
    mockFetch(sseResponse(['event: done\ndata: {"code":"render(<A />);"}\n\n']));

    const { result } = renderHook(() => useComponentGenerator());

    await act(async () => {
      await result.current.generate('카드', undefined, 'google');
    });

    expect(result.current.streamingId).toBeNull();
  });

  it('error 이벤트가 오면 에러를 띄우고 미완성 컴포넌트를 치운다', async () => {
    mockFetch(
      sseResponse([
        'event: delta\ndata: {"text":"const A"}\n\n',
        'event: error\ndata: {"error":"요청이 너무 많습니다."}\n\n',
      ]),
    );

    const { result } = renderHook(() => useComponentGenerator());

    await act(async () => {
      await result.current.generate('카드', undefined, 'google');
    });

    expect(result.current.error).toBe('요청이 너무 많습니다.');
    expect(result.current.components).toHaveLength(0);
  });

  it('스트림을 열기 전 400 응답이면 본문의 에러를 쓴다', async () => {
    mockFetch(
      new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useComponentGenerator());

    await act(async () => {
      await result.current.generate('카드', undefined, 'google');
    });

    expect(result.current.error).toBe('Prompt is required');
    expect(result.current.components).toHaveLength(0);
  });
});

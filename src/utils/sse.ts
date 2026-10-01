export interface SSEEvent {
  event: string;
  data: string;
}

/**
 * SSE 바이트 스트림을 이벤트 단위로 끊어 읽는다.
 *
 * fetch 의 ReadableStream 청크는 이벤트 경계와 무관하게 잘리므로, 완결되지 않은
 * 꼬리를 버퍼에 남겨 다음 청크와 이어 붙인다. 상태를 클로저에 가두어 호출부가
 * 버퍼를 직접 다루지 않게 한다.
 */
export function createEventParser() {
  let buffer = '';

  return {
    push(chunk: string): SSEEvent[] {
      buffer += chunk;

      // 블록 구분자는 빈 줄이다. 마지막 조각은 아직 완결되지 않았으므로 남겨 둔다.
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';

      const events: SSEEvent[] = [];

      for (const block of blocks) {
        let name = 'message';
        const dataLines: string[] = [];

        for (const line of block.split(/\r?\n/)) {
          if (line.startsWith(':')) continue;

          if (line.startsWith('event:')) {
            name = line.slice('event:'.length).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice('data:'.length).trim());
          }
        }

        // data 가 없는 블록(연결 유지용 ping 등)은 소비자에게 올리지 않는다.
        if (dataLines.length > 0) {
          events.push({ event: name, data: dataLines.join('\n') });
        }
      }

      return events;
    },
  };
}

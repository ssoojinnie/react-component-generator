import { useState, useCallback } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { createEventParser } from '../utils/sse';
import { STORAGE_KEYS, parseComponents } from '../utils/storage';
import { usePersistentState } from './usePersistentState';

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  isLoading: boolean;
  error: string | null;
  /** 지금 코드가 흘러 들어오고 있는 컴포넌트. 없으면 null. */
  streamingId: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  // 생성 결과는 새로고침 후에도 열려 있어야 한다. 로딩·에러는 그 요청 한 번의
  // 상태이므로 저장하지 않는다.
  const [components, setComponents] = usePersistentState<GeneratedComponent[]>(
    STORAGE_KEYS.components,
    [],
    parseComponents,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const generate = useCallback(
    async (prompt: string, apiKey: string | undefined, provider: Provider) => {
      setIsLoading(true);
      setError(null);

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      try {
        const res = await fetch('/api/generate/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
        });

        // 스트림을 열기 전 단계의 실패(키 누락 등)는 JSON 본문으로 온다.
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to generate component');
        }

        // 창을 먼저 띄워 코드가 쌓이는 과정을 보여준다.
        setComponents((prev) => [
          { id, prompt, code: '', createdAt: new Date() },
          ...prev,
        ]);
        setStreamingId(id);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const parser = createEventParser();
        let streamError: string | null = null;

        const setCode = (code: string) =>
          setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, code } : c)));

        let code = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          for (const event of parser.push(decoder.decode(value, { stream: true }))) {
            const payload = JSON.parse(event.data);

            if (event.event === 'delta') {
              code += payload.text;
              setCode(code);
            } else if (event.event === 'done') {
              // 서버가 코드펜스 제거와 render() 주입을 끝낸 최종본으로 갈아탄다.
              code = payload.code;
              setCode(code);
            } else if (event.event === 'error') {
              streamError = payload.error;
            }
          }
        }

        if (streamError) throw new Error(streamError);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        // 끝까지 못 간 창은 치운다 — 반쪽 코드를 남겨 두면 미리보기가 깨진다.
        setComponents((prev) => prev.filter((c) => c.id !== id));
      } finally {
        setStreamingId(null);
        setIsLoading(false);
      }
    },
    [setComponents],
  );

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, [setComponents]);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, [setComponents]);

  return {
    components,
    isLoading,
    error,
    streamingId,
    generate,
    removeComponent,
    clearAll,
  };
}

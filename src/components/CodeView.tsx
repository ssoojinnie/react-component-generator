import { useEffect, useRef, useState } from 'react';

interface CodeViewProps {
  code: string;
  /** 코드가 아직 흘러 들어오는 중인가. */
  isStreaming?: boolean;
}

export function CodeView({ code, isStreaming = false }: CodeViewProps) {
  const [copied, setCopied] = useState(false);
  const blockRef = useRef<HTMLPreElement>(null);

  // 새로 들어온 줄이 보이도록 바닥에 붙여 둔다. setState 가 아니라 DOM 조작이므로
  // effect 에서 해도 react-hooks/set-state-in-effect 에 걸리지 않는다.
  useEffect(() => {
    if (!isStreaming) return;
    const block = blockRef.current;
    if (block) block.scrollTop = block.scrollHeight;
  }, [code, isStreaming]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = code.split('\n').length;

  return (
    <div className="code">
      <div className="code__bar">
        <span className="code__path">
          GeneratedComponent.tsx —{' '}
          {isStreaming ? (
            <span className="code__live">생성 중</span>
          ) : (
            `${lineCount}줄`
          )}
        </span>
        <button
          className="btn btn--compact"
          onClick={handleCopy}
          // 반쪽짜리 코드를 복사해 가면 쓸 수 없다.
          disabled={isStreaming}
          type="button"
        >
          {copied ? '복사됨' : '코드 복사'}
        </button>
      </div>
      <pre className="code__block" ref={blockRef}>
        <code>{code}</code>
        {isStreaming && <span className="code__caret" aria-hidden="true" />}
      </pre>
    </div>
  );
}

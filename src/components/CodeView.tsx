import { useState } from 'react';

interface CodeViewProps {
  code: string;
}

export function CodeView({ code }: CodeViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = code.split('\n').length;

  return (
    <div className="code">
      <div className="code__bar">
        <span className="code__path">GeneratedComponent.tsx — {lineCount}줄</span>
        <button className="btn btn--compact" onClick={handleCopy} type="button">
          {copied ? '복사됨' : '코드 복사'}
        </button>
      </div>
      <pre className="code__block">
        <code>{code}</code>
      </pre>
    </div>
  );
}

import { useState } from 'react';
import type { GeneratedComponent } from '../types';
import { LivePreview } from './LivePreview';
import { CodeView } from './CodeView';
import { RefreshIcon, WindowIcon } from './Icons';

interface ComponentCardProps {
  component: GeneratedComponent;
  isMinimized: boolean;
  /** 코드가 아직 흘러 들어오는 중인가. */
  isStreaming: boolean;
  onToggleMinimize: (id: string) => void;
  onRemove: (id: string) => void;
  onRegenerate: (prompt: string) => void;
  isLoading: boolean;
}

type Tab = 'preview' | 'code';

export function ComponentCard({
  component,
  isMinimized,
  isStreaming,
  onToggleMinimize,
  onRemove,
  onRegenerate,
  isLoading,
}: ComponentCardProps) {
  // 스트리밍으로 태어난 창은 코드 탭에서 시작한다.
  const [activeTab, setActiveTab] = useState<Tab>(isStreaming ? 'code' : 'preview');
  const [previewKey, setPreviewKey] = useState(0);

  // 생성이 끝나는 순간 미리보기로 넘긴다. effect 가 아니라 렌더 중 이전 값과
  // 비교하는 패턴이다 — react-hooks/set-state-in-effect 가 error 레벨이다
  // (AGENTS.md 규칙 7).
  const [wasStreaming, setWasStreaming] = useState(isStreaming);
  if (wasStreaming !== isStreaming) {
    setWasStreaming(isStreaming);
    setActiveTab(isStreaming ? 'code' : 'preview');
  }
  const createdAt = component.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="cwindow" id={`cwindow-${component.id}`}>
      <div className="titlebar">
        <WindowIcon className="titlebar__icon" />
        <span className="titlebar__text">{component.prompt}</span>
        <div className="titlebar__controls">
          <button
            className="titlebar__btn"
            onClick={() => onToggleMinimize(component.id)}
            aria-expanded={!isMinimized}
            title={isMinimized ? '창 펼치기' : '창 접기'}
            type="button"
          >
            {isMinimized ? '❐' : '_'}
          </button>
          <button
            className="titlebar__btn"
            onClick={() => onRemove(component.id)}
            title="컴포넌트 닫기"
            type="button"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="cwindow__toolbar">
            <button
              className="btn btn--icon"
              onClick={() => setPreviewKey((k) => k + 1)}
              title="미리보기 다시 실행"
              aria-label="미리보기 다시 실행"
              type="button"
            >
              <RefreshIcon />
            </button>
            <span className="cwindow__separator" aria-hidden="true" />
            <button
              className="btn btn--compact"
              onClick={() => onRegenerate(component.prompt)}
              disabled={isLoading || isStreaming}
              type="button"
            >
              {isLoading ? '생성 중...' : '같은 요청으로 다시 생성'}
            </button>
            <span className="cwindow__stamp">
              {isStreaming ? '코드 생성 중...' : createdAt}
            </span>
          </div>

          <div className="tabs" role="tablist">
            <button
              className={`tab ${activeTab === 'preview' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('preview')}
              role="tab"
              aria-selected={activeTab === 'preview'}
              // 반쪽짜리 코드를 react-live 가 평가하면 에러만 뜬다.
              disabled={isStreaming}
              type="button"
            >
              미리보기
            </button>
            <button
              className={`tab ${activeTab === 'code' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('code')}
              role="tab"
              aria-selected={activeTab === 'code'}
              type="button"
            >
              코드
            </button>
          </div>

          <div className="tabpanel" role="tabpanel">
            {activeTab === 'preview' ? (
              <LivePreview key={previewKey} code={component.code} />
            ) : (
              <CodeView code={component.code} isStreaming={isStreaming} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { GeneratedComponent } from '../types';
import { LivePreview } from './LivePreview';
import { CodeView } from './CodeView';
import { RefreshIcon, WindowIcon } from './Icons';

interface ComponentCardProps {
  component: GeneratedComponent;
  isMinimized: boolean;
  onToggleMinimize: (id: string) => void;
  onRemove: (id: string) => void;
  onRegenerate: (prompt: string) => void;
  isLoading: boolean;
}

type Tab = 'preview' | 'code';

export function ComponentCard({
  component,
  isMinimized,
  onToggleMinimize,
  onRemove,
  onRegenerate,
  isLoading,
}: ComponentCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [previewKey, setPreviewKey] = useState(0);
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
              disabled={isLoading}
              type="button"
            >
              {isLoading ? '생성 중...' : '같은 요청으로 다시 생성'}
            </button>
            <span className="cwindow__stamp">{createdAt}</span>
          </div>

          <div className="tabs" role="tablist">
            <button
              className={`tab ${activeTab === 'preview' ? 'tab--active' : ''}`}
              onClick={() => setActiveTab('preview')}
              role="tab"
              aria-selected={activeTab === 'preview'}
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
              <CodeView code={component.code} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

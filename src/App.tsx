import { useCallback, useEffect, useState } from 'react';
import { PromptInput } from './components/PromptInput';
import { ComponentCard } from './components/ComponentCard';
import { Taskbar } from './components/Taskbar';
import { MessageBox } from './components/MessageBox';
import { AppIcon, EmptyIcon, KeyMissingIcon, KeyReadyIcon } from './components/Icons';
import { useComponentGenerator } from './hooks/useComponentGenerator';
import { usePersistentState } from './hooks/usePersistentState';
import {
  STORAGE_KEYS,
  addPrompt,
  parseHistory,
  parseProvider,
  purgeStoredApiKey,
  restoredIds,
} from './utils/storage';
import type { Provider } from './types';
import './App.css';

const PROVIDER_CONFIG = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  google: { label: 'Google', placeholder: 'AIza...' },
} as const;

// 모듈 로드 시 한 번: 키를 저장했던 버전을 쓰던 브라우저에서 값을 걷어낸다.
purgeStoredApiKey();

function App() {
  // API 키는 저장하지 않는다 — 이유는 utils/storage.ts의 LEGACY_API_KEY_KEY 주석.
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = usePersistentState<Provider>(
    STORAGE_KEYS.provider,
    'google',
    parseProvider,
  );
  const [history, setHistory] = usePersistentState<string[]>(
    STORAGE_KEYS.history,
    [],
    parseHistory,
  );
  const [envKeys, setEnvKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });
  const { components, isLoading, error, streamingId, generate, removeComponent, clearAll } =
    useComponentGenerator();
  // 저장소에서 되살아난 창만 접힌 상태로 시작한다. 새로 생성한 창은 펼쳐진다.
  const [minimized, setMinimized] = useState<string[]>(() => restoredIds(components));
  const [keyError, setKeyError] = useState<string | null>(null);
  const [errorDismissed, setErrorDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvKeys(data.envKeys))
      .catch(() => {});
  }, []);

  // A fresh failure re-opens the dialog. `generate` clears the error before
  // each attempt, so a repeat of the same message still reads as a change.
  const [seenError, setSeenError] = useState(error);
  if (error !== seenError) {
    setSeenError(error);
    setErrorDismissed(false);
  }

  const hasEnvKey = envKeys[provider];
  const providerLabel = PROVIDER_CONFIG[provider].label;
  const keyReady = hasEnvKey || apiKey.trim().length > 0;

  const handleGenerate = (prompt: string) => {
    if (!keyReady) {
      setKeyError(
        `${providerLabel} API 키가 없습니다. 오른쪽 실행 설정에 키를 입력하거나 서버 .env에 설정한 뒤 다시 시도하세요.`,
      );
      return;
    }
    setKeyError(null);
    setHistory((prev) => addPrompt(prev, prompt));
    generate(prompt, apiKey || undefined, provider);
  };

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setApiKey('');
    setKeyError(null);
  };

  const dismissKeyError = () => {
    setKeyError(null);
    document.getElementById('api-key')?.focus();
  };

  const toggleMinimize = useCallback((id: string) => {
    setMinimized((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleRemove = useCallback(
    (id: string) => {
      setMinimized((prev) => prev.filter((x) => x !== id));
      removeComponent(id);
    },
    [removeComponent],
  );

  const handleSelectTask = useCallback((id: string) => {
    setMinimized((prev) => prev.filter((x) => x !== id));
    document.getElementById(`cwindow-${id}`)?.scrollIntoView({ block: 'nearest' });
  }, []);

  const handleClearAll = () => {
    setMinimized([]);
    clearAll();
  };

  const statusText = isLoading
    ? '컴포넌트를 생성하는 중...'
    : components.length > 0
      ? `컴포넌트 ${components.length}개를 열어 두었습니다.`
      : '요청을 입력하면 컴포넌트를 만듭니다.';

  return (
    <>
      <div className="desktop">
        <div className="window window--app">
          <div className="titlebar titlebar--app">
            <AppIcon className="titlebar__icon" />
            <span className="titlebar__text">
              React 컴포넌트 생성기 — {providerLabel}
            </span>
            <div className="titlebar__controls" aria-hidden="true">
              <span className="titlebar__ornament">_</span>
              <span className="titlebar__ornament">❐</span>
              <span className="titlebar__ornament">✕</span>
            </div>
          </div>

          <div className="menubar" aria-hidden="true">
            <span>파일</span>
            <span>편집</span>
            <span>보기</span>
            <span>도구</span>
            <span>도움말</span>
          </div>

          <div className="window__body">
            <div className="workbench">
              <PromptInput
                onGenerate={handleGenerate}
                isLoading={isLoading}
                history={history}
                onClearHistory={() => setHistory([])}
              />

              <fieldset className="groupbox">
                <legend>실행 설정</legend>

                <div className="runtime__group">
                  <label className="field-label" htmlFor="provider">
                    모델 제공자
                  </label>
                  <select
                    id="provider"
                    className="dropdown"
                    value={provider}
                    onChange={(e) => handleProviderChange(e.target.value as Provider)}
                  >
                    {Object.entries(PROVIDER_CONFIG).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="runtime__group">
                  <label className="field-label" htmlFor="api-key">
                    API 키
                  </label>
                  <div className="key-row">
                    <input
                      id="api-key"
                      className="textbox"
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        hasEnvKey ? '서버 키 사용 중' : PROVIDER_CONFIG[provider].placeholder
                      }
                    />
                    <button
                      className="btn btn--compact"
                      onClick={() => setShowKey(!showKey)}
                      type="button"
                    >
                      {showKey ? '숨기기' : '보기'}
                    </button>
                  </div>
                  <p className="key-status">
                    {hasEnvKey ? (
                      <KeyReadyIcon className="key-status__icon" />
                    ) : (
                      <KeyMissingIcon className="key-status__icon" />
                    )}
                    <span>
                      {hasEnvKey
                        ? `서버의 ${providerLabel} 키로 바로 생성할 수 있습니다. 여기에 입력하면 그 키를 대신 씁니다.`
                        : `${providerLabel} 키를 입력하거나 서버 .env에 설정하세요.`}
                    </span>
                  </p>
                </div>
              </fieldset>
            </div>

            {isLoading && !streamingId && (
              <div className="progress" role="status">
                <p className="progress__label">
                  {providerLabel}에 요청을 보냈습니다. 응답을 기다리는 중입니다.
                </p>
                <div className="progress__track">
                  <div className="progress__blocks" />
                </div>
              </div>
            )}

            {keyError && (
              <MessageBox
                title="API 키 필요"
                heading="키가 설정되지 않아 요청을 보낼 수 없습니다."
                message={keyError}
                onDismiss={dismissKeyError}
              />
            )}

            {error && !errorDismissed && (
              <MessageBox
                title="생성 실패"
                heading="컴포넌트를 만들지 못했습니다."
                message={error}
                onDismiss={() => setErrorDismissed(true)}
              />
            )}

            <div className="results-area">
              {components.length > 0 && (
                <div className="results__bar">
                  <h2>열린 컴포넌트 {components.length}개</h2>
                  <button className="btn btn--compact" onClick={handleClearAll} type="button">
                    모두 닫기
                  </button>
                </div>
              )}

              <div className="results">
              {components.length === 0 && !isLoading && (
                <div className="empty">
                  <EmptyIcon />
                  <div>
                    <h2>아직 만든 컴포넌트가 없습니다.</h2>
                    <p>
                      만들고 싶은 UI를 위 입력란에 설명하고 [컴포넌트 생성]을 누르세요. 생성된
                      컴포넌트는 각각 하나의 창으로 열리고, 미리보기와 코드를 함께 확인할 수
                      있습니다.
                    </p>
                  </div>
                </div>
              )}

              <div className="results__stack">
                {components.map((component) => (
                  <ComponentCard
                    key={component.id}
                    component={component}
                    isMinimized={minimized.includes(component.id)}
                    isStreaming={streamingId === component.id}
                    onToggleMinimize={toggleMinimize}
                    onRemove={handleRemove}
                    onRegenerate={handleGenerate}
                    isLoading={isLoading}
                  />
                ))}
              </div>
              </div>
            </div>
          </div>

          <div className="statusbar">
            <div className="statusbar__panel statusbar__panel--grow">{statusText}</div>
            <div className="statusbar__panel statusbar__panel--hide-sm">
              {providerLabel}
            </div>
            <div className="statusbar__panel">{keyReady ? '키 연결됨' : '키 없음'}</div>
          </div>
        </div>
      </div>

      <Taskbar
        components={components}
        minimized={minimized}
        onSelect={handleSelectTask}
      />
    </>
  );
}

export default App;

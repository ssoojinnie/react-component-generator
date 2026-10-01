import { useState } from 'react';
import { MAX_PROMPT_LENGTH, validatePrompt } from '../utils/promptValidation';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

const EXAMPLES = [
  'SaaS 관리자용 KPI 카드 3개. 매출, 활성 사용자, 전환율을 비교 가능한 형태로 표시',
  '설정 페이지의 알림 토글 패널. 이메일, 슬랙, 주간 리포트 옵션 포함',
  '검색 필터 바. 상태, 담당자, 날짜 범위를 선택하고 결과 수를 보여주는 UI',
  '온보딩 체크리스트. 5단계 진행률과 완료/대기 상태를 보여주는 카드',
  '요금제 비교 카드 3개. 추천 플랜을 강조하고 CTA 버튼 포함',
  '테이블 행 상세보기 패널. 선택한 고객의 기본 정보와 최근 활동 표시',
];

export function PromptInput({ onGenerate, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');

  const trimmed = prompt.trim();
  const { valid, error } = validatePrompt(prompt);
  const canSubmit = Boolean(trimmed) && valid && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onGenerate(trimmed);
    }
  };

  return (
    <fieldset className="groupbox">
      <legend>새 컴포넌트</legend>

      <form onSubmit={handleSubmit} className="composer">
        <div className="composer__row">
          <div>
            <label className="field-label" htmlFor="prompt">
              만들고 싶은 UI를 설명하세요
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: 고객 목록 테이블 위에 들어갈 검색 필터 바를 만들어줘. 상태, 담당자, 날짜 범위 필터가 필요해."
              className="prompt-textarea"
              rows={4}
              aria-invalid={!valid}
              aria-describedby="prompt-length"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit(e);
                }
              }}
            />
            <p
              id="prompt-length"
              className={`composer__counter ${valid ? '' : 'composer__counter--over'}`}
            >
              {trimmed.length} / {MAX_PROMPT_LENGTH}자
            </p>
          </div>
          <button type="submit" className="btn btn--default" disabled={!canSubmit}>
            {isLoading ? '생성 중...' : '컴포넌트 생성'}
          </button>
        </div>
        {error ? (
          <p className="composer__error" role="alert">
            {error}
          </p>
        ) : (
          <p className="composer__hint">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> 로도 생성할 수 있습니다.
          </p>
        )}
      </form>

      <div className="examples">
        <label className="field-label" htmlFor="examples">
          예시에서 가져오기
        </label>
        <div className="listbox" id="examples">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              className={`listbox__item ${
                prompt === example ? 'listbox__item--selected' : ''
              }`}
              onClick={() => setPrompt(example)}
              title={example}
              type="button"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

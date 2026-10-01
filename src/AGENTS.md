# AGENTS.md — src/

루트 `../AGENTS.md`의 규칙이 그대로 적용된다. 여기에는 이 디렉토리에만 해당하는 내용만 적는다.

## Module Context

Vite + React 19 프론트엔드. 프롬프트를 받아 `/api/generate`에 보내고, 돌아온 코드를 react-live로 렌더링한다. 서버 상태는 `useComponentGenerator` 훅 하나가 전부 소유한다.

## Tech Stack & Constraints

- **상태 라이브러리 없음.** Redux, Zustand, TanStack Query 등을 도입하지 마라. 생성 결과는 `useComponentGenerator`(`hooks/useComponentGenerator.ts`)의 `useState`에, UI 상태는 각 컴포넌트의 로컬 state에 둔다.
- **HTTP는 전역 `fetch`만 쓴다.** axios를 추가하지 마라. 호출 지점은 `hooks/useComponentGenerator.ts:23`과 `App.tsx`의 `/api/config` 두 곳뿐이다.
- **CSS는 일반 CSS 파일 두 개뿐이다.** `index.css`(리셋·토큰·전역), `App.css`(컴포넌트). Tailwind, CSS Modules, styled-components를 도입하지 마라.
- **외부 폰트·CDN 금지.** 현재 서체는 시스템 폰트 스택이고(`index.css`의 `--ui-font`, `--mono-font`), 아이콘은 `components/Icons.tsx`에 인라인 SVG로 직접 그려져 있다. 오프라인에서 동작하는 상태를 유지하라.

## Design System: Windows 97

UI는 의도적인 Windows 97 파스티슈다. 모던 SaaS 스타일(둥근 모서리, 드롭섀도, 그라디언트 장식)로 되돌리지 마라.

- **깊이는 베벨로만 표현한다.** `index.css:26` 이하의 `--raise`, `--sink`, `--press`, `--raise-thin`, `--sink-thin` 중에서 고른다. 새 `box-shadow`를 직접 쓰지 말고 이 토큰을 재사용하라.
- **`border-radius`는 0이다.** 어디에도 추가하지 마라.
- **색은 `index.css:11-23`의 시스템 팔레트 토큰만 쓴다.** 새 hex 리터럴을 CSS에 넣지 마라. 예외는 `components/Icons.tsx`의 SVG 내부 색상으로, 16px 그리드 아이콘의 고정 팔레트다.
- **타이포는 한 종류.** `--ui-font` 12px 기준, 상태바·작업표시줄 11px. 코드 표시에만 `--mono-font`. 11px 미만으로 내리지 마라.
- **포커스 표시를 지우지 마라.** `index.css:63`의 `:focus-visible` 점선 사각형이 당시 UI 관용구인 동시에 유일한 키보드 포커스 표시다.
- **창 버튼은 실제 동작에 연결한다.** `.titlebar__btn`은 `<button>`이고 최소화·닫기를 수행한다(`components/ComponentCard.tsx:40` 이하). 반면 앱 창 상단의 `.titlebar__ornament`는 `<span>`에 `aria-hidden`이며 프레임 장식이다(`App.tsx:110-114`). 이 구분을 유지하라 — 장식을 버튼으로 바꾸면 키보드 사용자가 죽은 컨트롤에 빠진다.
- **모션은 `prefers-reduced-motion`을 존중한다.** 현재 유일한 비사용자 트리거 모션인 진행 막대가 `App.css:377`에서 이를 처리한다. 새 애니메이션도 같은 처리를 넣어라.

## Implementation Patterns

- **컴포넌트는 named export 함수.** `export function ComponentCard(...)` 형태다. `App.tsx`만 default export다.
- **Props 인터페이스는 파일 상단, 컴포넌트 바로 위에 선언한다.** 공유 타입만 `types/index.ts`에 둔다.
- **상태는 가장 낮은 공통 조상에 둔다.** 최소화 상태가 `App.tsx`에 있는 이유는 `Taskbar`와 `ComponentCard`가 함께 읽기 때문이다. 한 컴포넌트만 쓰는 상태는 그 안에 둔다 (`ComponentCard`의 `activeTab`, `previewKey`).
- **미리보기 리마운트는 `key` 증가로 한다.** `previewKey`를 올려 `LivePreview`를 새로 만든다(`components/ComponentCard.tsx`). 애니메이션 컴포넌트를 다시 재생하는 유일한 수단이다.
- **프로바이더를 바꾸면 입력된 키를 비운다.** `handleProviderChange`(`App.tsx`)가 `setApiKey('')`를 호출한다. Anthropic 키를 Google로 보내는 실수를 막는 장치다.

## Testing Strategy

```bash
bun run test -- src/components/PromptInput.test.tsx
```

- 테스트는 대상 파일과 같은 디렉토리에 `*.test.tsx`로 둔다 (`components/PromptInput.test.tsx`).
- **구현이 아니라 역할로 쿼리한다.** 기존 테스트가 `getByRole('button', { name: '컴포넌트 생성' })`, `getByRole('textbox')`를 쓴다. `querySelector`나 className 기반 쿼리를 쓰지 마라.
- **버튼 라벨은 테스트가 고정하고 있다.** `'컴포넌트 생성'`과 `'생성 중...'`을 바꾸면 `PromptInput.test.tsx:9`, `:20`, `:27`이 깨진다. 문구를 바꾸려면 테스트를 함께 고쳐라.
- 상호작용은 `userEvent`로 한다 (`fireEvent` 아님).
- DOM 정리는 `test/setup.ts`가 전역으로 처리한다. 개별 테스트에서 `cleanup()`을 호출하지 마라.

## Local Golden Rules

**Don't: effect 안에서 setState를 직접 호출하지 마라.**
`react-hooks/set-state-in-effect`가 error다. 외부 값 변화에 state를 맞춰야 하면 렌더 중 이전 값과 비교하는 패턴을 쓴다. 적용 예시가 `App.tsx:37-42`에 있다 (에러가 바뀌면 다이얼로그를 다시 연다).

**Don't: `LiveProvider`의 `noInline`을 제거하지 마라.**
`components/LivePreview.tsx:9`의 `noInline`이 `render(...)` 규약의 전제다. 제거하면 서버의 `ensureRenderCall`이 주입한 호출이 오히려 에러를 낸다.

**Don't: 생성된 코드를 프론트에서 다시 가공하지 마라.**
코드 정규화는 서버 책임이다(`server/generator.ts`). 여기서 한 번 더 손대면 두 곳이 서로를 모르는 채 같은 문자열을 건드리게 된다.

**Do: 미리보기 캔버스를 생성 컴포넌트와 격리된 상태로 유지한다.**
`.preview__canvas`는 디더 패턴 배경만 제공한다. 여기에 폰트·색상 상속을 추가하면 생성 컴포넌트가 실제 사용 환경과 다르게 보인다.

**Do: 새 사용자 노출 문자열은 한국어로, 동작 중심으로 쓴다.**
버튼은 눌렀을 때 일어나는 일을 그대로 말한다 (`'모두 닫기'`, `'코드 복사'`). 빈 상태는 다음에 할 일을 안내한다 (`App.tsx`의 `.empty`).

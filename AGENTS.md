# AGENTS.md

프로젝트 소개, 기능 목록, 기본 실행 절차는 `README.md`를 참조한다. 이 문서는 에이전트 전용 행동 규칙만 다룬다.

## Operational Commands

패키지 매니저는 **bun 고정**이다. `bun.lock`만 존재하며 `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`은 없다. npm, yarn, pnpm 명령을 실행하지 마라.

```bash
bun install            # 의존성 설치
bun run dev            # API(3002) + Vite(5173) 동시 실행 (concurrently)
bun run server         # API 서버만 (bun --watch)
bun run test           # vitest 1회 실행
bun run test:watch     # vitest watch
bun run lint           # eslint
bun run build          # tsc -b && vite build
```

변경을 보고하기 전 최소 `bun run lint`와 `bun run test`를 통과시켜라. UI를 수정했다면 `bun run build`까지 확인한다.

단일 테스트 파일 실행: `bun run test -- server/generator.test.ts`

### 환경 변수

서버 프로세스에서만 읽는다. 이름은 `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` 두 개뿐이다 (`server/index.ts:59-62`).

**저장소에 `.env.example` 파일이 없다.** `.env`를 직접 만들거나 UI에서 키를 입력하는 경로를 사용하라. `README.md`의 "API 키 설정" 절도 이 두 경로만 안내한다 — `cp .env.example .env`를 되살리지 마라.

## Golden Rules

### Immutable (절대 위반 금지)

**1. API 키를 클라이언트로 내보내지 마라.**
`/api/config`는 키 존재 여부를 boolean으로만 반환한다 (`server/index.ts:147-157`의 `!!ENV_KEYS.anthropic`). 키 값 자체를 응답에 넣는 변경은 금지한다. 같은 이유로 키를 `VITE_` 접두사 환경변수로 옮기지 마라 — Vite는 `VITE_*`를 클라이언트 번들에 인라인한다. Google 키는 URL 쿼리스트링에 실리므로(`server/index.ts:99`) 이 호출 경로는 서버에 머물러야 한다.

**2. 서버 CORS는 개발 전용 설정이다.**
`Access-Control-Allow-Origin: '*'`(`server/index.ts:51-55`)인 동시에 클라이언트가 보낸 `apiKey`를 그대로 수락한다(`server/index.ts:161-167`). 이 조합을 공개 배포하지 마라. 배포 관련 작업을 요청받으면 먼저 오리진 제한을 제안하라.

**3. 포트 3002와 5173 프록시는 한 쌍이다.**
`Bun.serve({ port: 3002 })`(`server/index.ts:139`)와 Vite 프록시 `'/api' -> http://localhost:3002`(`vite.config.ts:9-14`)는 서로를 가정한다. 한쪽만 바꾸면 전체 생성 흐름이 조용히 깨진다.

### Hard Constraints (어기면 즉시 깨짐)

**4. 생성 코드는 `render(...)` 호출이 있어야 미리보기가 그려진다.**
`LivePreview`가 `noInline` 모드로 react-live를 쓴다(`src/components/LivePreview.tsx:9`). 이 규약을 바꾸려면 `ensureRenderCall`(`server/generator.ts:16-24`)과 SYSTEM_PROMPT를 함께 바꿔야 한다.

**5. 생성 코드에 import 문과 TypeScript 문법을 허용하지 마라.**
react-live 평가기가 처리하지 못한다. SYSTEM_PROMPT가 둘 다 금지하고 있다(`server/index.ts:11`, `server/index.ts:20`). 프롬프트를 수정할 때 이 두 줄을 제거하지 마라.

**6. 테스트 파일은 vitest `include` 글롭 안에 두어라.**
`src/**/*.test.{ts,tsx}`와 `server/**/*.test.ts`만 수집된다(`vite.config.ts:20`). 이 밖에 둔 테스트는 실패가 아니라 **침묵으로 누락**된다.

**7. effect 안에서 setState를 직접 호출하지 마라.**
`react-hooks/set-state-in-effect`가 error 레벨이다(`eslint.config.js:15`). 값 변화에 반응해야 하면 렌더 중 이전 값과 비교하는 패턴을 쓴다 — 적용 예시는 `src/App.tsx:37-42`.

### Double Defense (한쪽만 지우지 마라)

**8. `render()` 보장은 이중으로 걸려 있다.**
SYSTEM_PROMPT가 모델에게 지시하고(`server/index.ts:12`), `ensureRenderCall`이 누락 시 서버에서 주입한다(`server/generator.ts:16-24`). 프롬프트를 믿고 `ensureRenderCall`을 제거하면 빈 미리보기가 재발한다.

**9. 코드펜스 제거도 이중이다.**
프롬프트가 펜스 출력을 금지하고(`server/index.ts:16`), `stripCodeFences`가 다시 제거한다(`server/generator.ts:5-10`). 모델은 이 지시를 자주 어기므로 후처리를 유지하라.

**10. API 키 검증도 이중이다.**
UI가 전송 전에 막고(`src/App.tsx`의 `handleGenerate`), 서버가 다시 검증한다(`server/index.ts:169-174`). 서버 검증은 UI를 거치지 않는 직접 호출에 대한 방어선이므로 제거하지 마라.

### Known Asymmetries (의도된 비대칭 — 섣불리 "통일"하지 마라)

**11. 모델 폴백은 Google에만 있다.**
`callGoogle`은 `GOOGLE_MODELS` 목록을 순회하지만(`server/index.ts:5`, `server/index.ts:134-136`), `callAnthropic`은 단일 모델을 하드코딩한다(`server/index.ts:77`). Anthropic에 폴백을 추가하려면 모델 ID 목록의 유효성을 먼저 확인하라.

**12. `MAX_TOKENS` 절단 처리도 Google에만 있다.**
`callGoogleModel`은 `finishReason === 'MAX_TOKENS'`를 감지해 한국어 안내를 던진다(`server/index.ts:123-125`). `callAnthropic`에는 대응하는 `stop_reason` 검사가 없다. 토큰 상한도 비대칭이다 — Anthropic 4096(`server/index.ts:78`), Google 8192(`server/index.ts:107`).

**13. 기본 provider가 서버와 UI에서 다르다.**
서버는 `provider` 누락 시 `'anthropic'`으로 처리하고(`server/index.ts:161`), UI 초기값은 `'google'`이다(`src/App.tsx:19`). API를 직접 호출하는 코드를 작성할 때 `provider`를 명시적으로 보내라.

### Test Boundary (팀이 그은 선)

**14. 순수 함수로 분리한 것은 테스트를 쓴다.**
`server/generator.ts:1-2`에 의도가 명시되어 있다 — 부수효과가 없어 단위 테스트가 가능하도록 분리했다. 현재 테스트가 있는 곳은 `server/generator.ts`, `server/fallback.ts`, `src/components/PromptInput.tsx` 세 곳뿐이다.

**15. 서버에 로직을 추가할 때는 `server/index.ts`가 아니라 별도 모듈에 넣어라.**
`server/index.ts`는 `Bun.serve` 부수효과 때문에 테스트되지 않는다. 변환·정규화·분기 로직은 `generator.ts` / `fallback.ts`처럼 순수 모듈로 빼고 테스트를 함께 작성한다.

## Project Context

프롬프트를 받아 AI로 React 컴포넌트를 생성하고, react-live로 즉시 렌더링해 미리보기와 코드를 함께 보여주는 로컬 워크벤치다.

Tech Stack: React 19, TypeScript, Vite 8, Bun(런타임 및 패키지 매니저), react-live, Vitest, Testing Library, ESLint 9.

## Standards & References

- 주석과 사용자 노출 문자열(에러 메시지, 라벨)은 **한국어**로 작성한다. 기존 코드 전체가 이 규칙을 따른다.
- 코드 주석은 "무엇"이 아니라 "왜"를 적는다. 참고 예시: `server/generator.ts:12-15`, `src/test/setup.ts:5`.
- 에러 메시지는 사과하지 않고, 무엇이 잘못됐고 어떻게 고치는지 알려준다. 참고: `server/index.ts:196`, `server/index.ts:203`.
- 커밋 메시지는 한국어로 작성한다. 커밋은 사용자가 요청할 때만 수행한다 (`/commit` 스킬 참조).
- `.env`는 `.gitignore`에 등재되어 있다. 키 값을 코드, 테스트 픽스처, 커밋 메시지에 넣지 마라.

### Maintenance Policy

이 문서의 규칙과 실제 코드가 어긋난 것을 발견하면, 코드를 규칙에 맞추기 전에 **어느 쪽이 옳은지 사용자에게 확인하고 이 문서의 수정안을 제안하라.** 특히 파일·라인 참조는 코드 변경에 따라 낡는다. 규칙을 인용하기 전 해당 위치가 여전히 유효한지 확인한다.

## Context Map

- **[API 서버 / AI 프로바이더 연동](./server/AGENTS.md)** — Bun.serve 라우트, 프롬프트, 모델 호출, 응답 정규화를 다룰 때.
- **[프론트엔드 / Windows 97 UI](./src/AGENTS.md)** — React 컴포넌트, 상태, 디자인 시스템을 다룰 때.

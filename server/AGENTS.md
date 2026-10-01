# AGENTS.md — server/

루트 `../AGENTS.md`의 규칙이 그대로 적용된다. 여기에는 이 디렉토리에만 해당하는 내용만 적는다.

## Module Context

Bun 런타임에서 도는 AI API 프록시다. 브라우저가 API 키를 직접 들고 프로바이더를 호출하지 않도록 중간에 서며, 모델 응답을 react-live가 실행할 수 있는 형태로 정규화해 돌려준다.

## Tech Stack & Constraints

- **Bun 전용.** `Bun.serve`를 쓰므로 Node로 실행되지 않는다. `bun run server`로만 구동한다.
- **의존성 0.** 이 디렉토리는 외부 패키지를 쓰지 않는다. HTTP는 전역 `fetch`, 응답은 `Response.json`으로 처리한다. axios, express, @anthropic-ai/sdk 등을 추가하지 마라 — 현재 구조가 의존성 없이 성립한다.
- **브라우저 API 금지.** `eslint.config.js:20`이 `globals.browser`를 전 파일에 적용하지만, 이 디렉토리는 Bun 프로세스에서 실행된다. `window`, `localStorage`, `document`는 lint를 통과해도 런타임에서 깨진다.

## Implementation Patterns

- **순수 모듈 + 얇은 서버.** 라우팅과 `Bun.serve`는 `index.ts`에, 테스트 가능한 로직은 `generator.ts` / `fallback.ts`에 둔다. 이 분리가 테스트 가능성의 전제다 (`generator.ts:1-2`).
- **모든 응답에 `CORS_HEADERS`를 붙인다.** 404와 에러 응답까지 포함이다(`index.ts:208-218`). 새 라우트를 추가할 때 빠뜨리면 브라우저에서 응답을 읽지 못한다.
- **에러는 throw하고 라우트 핸들러 한 곳에서 번역한다.** 프로바이더 호출 함수는 `throw new Error('... ${response.status}')` 형태로 상태 코드를 메시지에 담고(`index.ts:85`, `index.ts:112`), 바깥 catch가 문자열에서 `'503'` / `'429'`를 찾아 사용자용 한국어 메시지로 바꾼다(`index.ts:194-206`).
- **새 프로바이더 추가 시 손대는 곳:** `Provider` 타입(`index.ts:57`), `ENV_KEYS`(`index.ts:59-62`), 호출 함수, 분기(`index.ts:183-186`), 키 누락 메시지(`index.ts:171`), `/api/config` 응답(`index.ts:150-153`). 프론트의 `src/types/index.ts`와 `PROVIDER_CONFIG`도 함께 맞춰야 한다.

## Testing Strategy

```bash
bun run test -- server/generator.test.ts
bun run test -- server/fallback.test.ts
```

- 테스트 파일은 `server/*.test.ts`로 둔다. 하위 디렉토리에 두어도 `vite.config.ts:20`의 `server/**/*.test.ts`가 잡지만, 현재 관례는 평면 배치다.
- 테스트 이름은 한국어 서술문으로 쓴다 — `'언어 태그가 붙은 코드펜스를 제거한다'`(`generator.test.ts:5`).
- **엣지 케이스를 반드시 포함한다.** 기존 테스트가 정상 경로뿐 아니라 "펜스가 없을 때"(`generator.test.ts:15`), "컴포넌트 선언이 없을 때"(`generator.test.ts:36`), "목록이 비었을 때"(`fallback.test.ts:36`)를 모두 덮는다. 새 순수 함수도 같은 수준을 맞춰라.
- `index.ts`는 import만으로 포트 3002를 점유하므로 테스트에서 import하지 마라.

## Local Golden Rules

**Do: 프롬프트 변경 후 실제 생성을 한 번 확인한다.**
`SYSTEM_PROMPT`(`index.ts:7-49`)는 테스트가 없다. 여기를 수정하면 자동 검증 장치가 전혀 없으므로, 변경 후 실제로 컴포넌트를 생성해 미리보기가 그려지는지 눈으로 확인하라.

**Don't: `stripCodeFences`의 정규식을 "단순화"하지 마라.**
`replace(/```$/gm, '')`의 `m` 플래그와 `^```(?:jsx|tsx|...)?\n?` 의 언어 태그 그룹은 각각 별도 테스트로 고정되어 있다(`generator.test.ts:5`, `generator.test.ts:10`). 둘 다 모델이 실제로 내는 출력 형태에 대응한다.

**Don't: `ensureRenderCall`의 대문자 매칭을 완화하지 마라.**
`/(?:const|function)\s+([A-Z]\w+)/`(`generator.ts:19`)가 대문자로 시작하는 선언만 찾는 것은 의도적이다. 소문자 헬퍼 함수를 컴포넌트로 오인해 `render(<helper />)`를 주입하면 react-live가 DOM 태그로 해석해 깨진다.

**Don't: `withModelFallback`이 마지막 에러를 던지는 동작을 바꾸지 마라.**
`fallback.ts`는 모든 모델 실패 시 **마지막** 에러를 던진다. 이 동작에 테스트가 걸려 있고(`fallback.test.ts:27-34`), 라우트의 상태 코드 번역(`index.ts:194-206`)이 그 메시지에 의존한다. 첫 에러를 던지도록 바꾸면 429/503 처리가 조용히 무력화된다.

**Do: 키 존재 여부와 키 값을 구분한다.**
`/api/config`는 boolean만 반환한다(`index.ts:151-152`). 이 라우트에 디버깅 목적으로라도 키 일부(앞 4자리 등)를 넣지 마라.

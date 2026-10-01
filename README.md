# React 컴포넌트 생성기

프롬프트를 입력하면 AI가 React 컴포넌트를 즉시 생성하고, 실시간 미리보기와 코드를 제공합니다.

## 기술 스택

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Bun (AI API 프록시 서버)
- **AI Provider**: Anthropic Claude / Google Gemini (선택 가능)
- **미리보기**: react-live (런타임 렌더링)

## 사전 준비

- **[Bun](https://bun.sh) 1.4 이상** — 런타임과 패키지 매니저를 모두 겸합니다. Node.js나 npm은 필요하지 않습니다.
- **AI API 키** — Anthropic 또는 Google 중 최소 하나. 키가 없으면 컴포넌트를 생성할 수 없습니다.
  - Anthropic: https://console.anthropic.com
  - Google (Gemini): https://aistudio.google.com/apikey

```bash
# Bun 설치 (macOS / Linux)
curl -fsSL https://bun.sh/install | bash
```

> 이 프로젝트는 패키지 매니저를 bun으로 고정합니다. 저장소에는 `bun.lock`만 있으므로 `npm install` / `yarn` / `pnpm`을 쓰면 락파일이 어긋납니다.

## 설치

```bash
git clone https://github.com/ssoojinnie/react-component-generator.git
cd react-component-generator
bun install
```

## API 키 설정

두 가지 방법 중 하나를 고르면 됩니다. 어느 쪽이든 키는 서버 프로세스에만 머물고 클라이언트 번들에 포함되지 않습니다.

**방법 1 — `.env` 파일 (권장)**

프로젝트 루트에 `.env`를 직접 만들고 아래 중 필요한 항목을 채웁니다. 두 키 모두 선택 사항이며, 설정한 프로바이더는 UI에서 키 입력 없이 바로 사용할 수 있습니다.

```bash
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

`.env`는 `.gitignore`에 등재되어 있어 커밋되지 않습니다. 접두사에 `VITE_`를 붙이지 마십시오 — Vite는 `VITE_*` 변수를 클라이언트 번들에 그대로 인라인하므로 키가 브라우저로 노출됩니다.

**방법 2 — UI에서 직접 입력**

`.env` 없이 실행하고, 화면의 API 키 입력란에 키를 붙여넣습니다. 이 값은 브라우저 세션에만 유지되므로 새로 고치면 다시 입력해야 합니다.

## 실행

```bash
bun run dev
```

API 서버(3002)와 Vite 개발 서버(5173)가 함께 뜹니다. 브라우저에서 **http://localhost:5173** 으로 접속합니다.

두 포트는 한 쌍입니다 — Vite가 `/api` 요청을 `localhost:3002`로 프록시하므로, 한쪽 포트만 바꾸면 생성 흐름이 조용히 끊깁니다.

| 명령어 | 설명 |
|---|---|
| `bun run dev` | API 서버 + 프론트엔드 동시 실행 |
| `bun run server` | API 서버만 실행 (watch 모드) |
| `bun run test` | 테스트 1회 실행 |
| `bun run test:watch` | 테스트 watch 모드 |
| `bun run lint` | ESLint 검사 |
| `bun run build` | 타입 체크 + 프로덕션 빌드 |
| `bun run preview` | 빌드 결과물 미리보기 |

## 배포에 관한 주의

이 저장소는 **로컬 개발 전용** 설정입니다. API 서버가 모든 오리진을 허용(`Access-Control-Allow-Origin: *`)하는 동시에 클라이언트가 보낸 API 키를 그대로 받아들이므로, 이 상태로 공개 호스팅하면 누구나 서버를 경유해 요청을 보낼 수 있습니다. 배포한다면 오리진 제한을 먼저 추가하십시오.

## 주요 기능

- **멀티 프로바이더**: Anthropic Claude / Google Gemini 선택
- **실시간 미리보기**: 생성된 컴포넌트를 즉시 렌더링
- **새로고침**: 애니메이션 컴포넌트를 리마운트하여 다시 보기
- **재생성**: 같은 프롬프트로 AI에 다시 요청
- **예시 프롬프트**: 시각적 임팩트가 큰 예시 제공

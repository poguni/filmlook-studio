# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 따르는 규칙입니다.

## 프로젝트 한눈에 보기

- **앱:** 색감 사진관 (FilmLook Studio). 저장소 이름 `filmlook-studio`
- **하는 일:** JPEG 사진 한 장에 필름 시뮬레이션풍 프리셋 7종을 입혀 보고, 밀착 인화 8칸에서 골라 강도를 조절한 뒤 원본 해상도 JPEG로 저장하는 브라우저 앱(PWA)
- **성격:** 개인용 앱, 공개 GitHub 저장소와 개인 포트폴리오에 게시
- **입력:** 갤럭시 스마트폰·소니 미러리스로 찍은 일반 JPEG만 지원(최대 64MP)
- **화면:** 데스크톱 1440×900(16:10) 기준, 스마트폰 360~430px까지 반응형
- **테마:** A 암실, B 카메라 기어(기본), C 파스텔 사진관. 기능은 같고 겉모습만 다름

## 먼저 읽을 문서

| 문서 | 언제 읽나 |
|---|---|
| `docs/FilmLook Studio PRD.md` | 기능, 우선순위(P0/P1/P2), 기술 설계, 일정. 기능을 만들거나 바꾸기 전에 해당 ID(F-01, E-02 등) 확인. 색 처리 코드는 5.4 색 처리 명세를 따름. 같은 폴더의 `.html`은 md에서 만든 읽기용 버전 |
| `design/DESIGN.md` | 디자인 토큰, 컴포넌트 규칙, 테마별 장식·문구·움직임. 화면을 만들기 전에 반드시 확인 |
| `design/mockups/*.html` | 테마별 시안(데스크톱 + 스마트폰). 브라우저로 열어 실제 모습과 동작 확인 |

문서끼리 다를 때: 기능은 PRD, 모양은 DESIGN.md가 우선입니다. 시안 HTML은 참고용이며, 시안의 CSS `filter` 값은 실제 프리셋 값이 아닙니다.

## 폴더 구조

```
filmlook-studio/
├─ CLAUDE.md
├─ docs/              # PRD 등 기획 문서 (문서는 여기에만)
├─ design/            # DESIGN.md, mockups/, screenshots/ (디자인 자료는 여기에만)
├─ src/
│  ├─ app/            # 화면 컴포넌트 (Header, ContactSheet, Preview, ControlPanel)
│  ├─ themes/         # darkroom/ camera/ pastel/ — tokens.css, copy.ts, art/
│  ├─ state/          # 편집 상태 (preset, strength, compare, grain, mono, gimmick, theme)
│  ├─ gl/             # WebGL2 렌더러, 셰이더(.glsl), 타일 렌더링
│  ├─ color/          # 톤 커브, HSL, LUT 굽기, .cube 파서, F-Log2 변환
│  ├─ presets/        # 프리셋 JSON (ORIG 제외 7종)
│  ├─ io/             # JPEG 열기, EXIF 읽기·쓰기, 저장·공유
│  └─ tuning/         # 개발용 프리셋 튜닝 화면
├─ public/samples/    # 본인 촬영 샘플 JPEG (EXIF·GPS 제거 후 커밋)
└─ luts/private/      # 로컬 전용 LUT, git 제외
```

새 문서는 `docs/`, 디자인 관련 md·이미지·시안은 `design/`에 둡니다. 저장소 루트에는 `CLAUDE.md`, `README.md`, `LICENSE`, 설정 파일만 둡니다.

## 기술 스택

- Vite + React + TypeScript (strict)
- WebGL2 직접 작성(three.js 등 렌더링 라이브러리 쓰지 않음). LUT는 33³ 3D 텍스처
- EXIF: APP1만 다루는 작은 모듈을 직접 작성(필요하면 piexifjs 등). 처리 규칙은 PRD 6.3 ‘EXIF 처리’
- 글꼴: `@fontsource/*`로 앱에 포함(Google Fonts 링크 금지)
- 테스트: Vitest(색 변환·LUT·EXIF 단위 테스트), Playwright(화면 스모크 테스트)
- 배포: GitHub Actions → GitHub Pages

## 명령어

프로젝트를 만든 뒤 아래 스크립트를 `package.json`에 맞춰 둡니다. 스크립트 이름을 바꾸면 이 표도 함께 고칩니다.

| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 + 배포용 빌드 |
| `npm run test` | Vitest 단위 테스트 |
| `npm run e2e -- --trace off` | Playwright 스모크 테스트 |
| `npm run lint` | ESLint + Prettier 검사 (형식만 틀리면 `npx prettier --write .`로 정리) |

- 처음 받은 뒤에는 `npm install`과 `npx playwright install chromium`을 한 번 실행합니다.
- e2e는 개발 서버(5174 포트)에서만 열리는 검사용 창구 `window.__filmlook`(`src/app/devHook.ts`)으로 렌더 결과를 픽셀 단위로 비교합니다. 배포 빌드에는 들어가지 않습니다.
- 개발 서버 전용 기능(배포 빌드에서 빠짐): 프리셋 튜닝 화면 `/filmlook-studio/tuning`(PRD 7장, 문구는 `src/tuning/`에 둠), 저장 해상도 상한을 바꾸는 주소 값 `?cap=50`(`?cap=0`은 상한 없음)과 저장 시간 표시(PRD 6.3 실기기 측정용).
- `e2e/large.spec.ts`는 61MP 저장을 확인하므로 다른 테스트보다 오래 걸립니다.
- 테스트용 JPEG는 `e2e/fixtures.ts`가 즉석에서 만듭니다. 사진 파일을 테스트용으로 커밋하지 않습니다.

## 꼭 지킬 규칙

### 개인 정보와 네트워크
- 사진과 그 파생물(썸네일, LUT 결과)은 **절대 기기 밖으로 보내지 않습니다.** 서버 업로드, 외부 분석 도구, 외부 글꼴·CDN 요청을 넣지 않습니다.
- 저장 결과의 EXIF는 GPS를 포함해 그대로 보존하고, 회전 정보만 정방향으로 초기화합니다(PRD S-03). EXIF 썸네일(IFD1)은 지우고, APP2(MPF·게인 맵)와 원본 ICC 프로필은 옮기지 않습니다.
- `public/samples/`에 넣는 사진은 커밋 전에 GPS 등 EXIF를 지웁니다.

### 상표와 저작권
- 후지필름의 시뮬레이션 이름(Provia, Velvia, Classic Chrome 등)을 프리셋 **대표 이름이나 코드 식별자**로 쓰지 않습니다. 부제의 “○○에서 영감” 표기에만 씁니다.
- 후지필름 공식 LUT 등 재배포 조건이 불분명한 파일은 커밋하지 않습니다. `luts/private/`는 `.gitignore`에 있어야 합니다.
- 실제 카메라 회사의 로고·모델명·제품 디자인을 화면에 흉내 내지 않습니다.

### 색 처리
- 프리셋은 JSON 파라미터로 정의하고 실행 시 3D LUT로 굽습니다. 셰이더에 프리셋별 분기를 넣지 않습니다.
- LUT 굽기의 처리 순서·단위·색공간은 PRD 5.4를 따릅니다. 바꾸려면 PRD 5.4와 단위 테스트를 같은 변경에서 고칩니다.
- 강도 0%의 렌더 결과는 원본과 채널별 ±1 이내여야 합니다. JPEG 인코딩 전 렌더 결과(`readPixels`)로 비교하고, 강도 0%에서는 입자도 넣지 않습니다. 색 관련 코드를 바꾸면 이 테스트를 돌립니다.
- 고해상도 저장은 2048px 타일로 처리하고, 그레인은 원본 픽셀 좌표 기준으로 만들어 타일 이음매가 생기지 않게 합니다.
- 입력은 sRGB 기준입니다. Adobe RGB 사진은 변환하거나 경고합니다(PRD F-05).

### 테마와 UI
- 기능 컴포넌트는 하나만 만들고, 테마는 `data-theme` + CSS 변수(의미 토큰) + 문구 사전 + 장식 slot으로만 바꿉니다.
- 컴포넌트 안에 색상값을 직접 쓰거나 `if (theme === ...)` 분기를 쓰지 않습니다.
- 상태 이름은 DESIGN.md 3.3을 따릅니다(`preset`, `strength`, `compare`, `grain`, `mono`, `gimmick`, `theme`).
- 접근성: 실제 `<button>`·`<input>`·`<label>` 사용, 터치 영역 44px 이상, 대비 4.5:1 이상, `prefers-reduced-motion` 존중. 아이콘은 인라인 SVG, 이모지 금지.
- 사진과 맞닿는 미리보기 테두리 안쪽은 무채색(또는 C 테마의 흰색)으로 둡니다.

### 문구와 언어
- 화면 문구, 문서, 커밋 메시지 본문은 **한국어**로 쓰고 맞춤법·띄어쓰기를 확인합니다. 화면 문구는 `src/themes/<테마>/copy.ts`에만 둡니다.
- 코드 식별자, 파일 이름은 영어로 씁니다. 주석은 한국어로 짧게, “왜”를 적습니다.

## 작업 방식

- 기능 작업은 PRD의 마일스톤 순서(M1 엔진 → M2 MVP → M3 확장 → M4 마무리 → M5 테마 확장)를 따릅니다. M4까지는 B 카메라 기어 테마 1종으로 기능을 완성하고, A 암실·C 파스텔 테마와 테마 전환은 M5에서 만듭니다. 그래도 토큰·문구·장식 slot 구조는 처음부터 세 테마를 전제로 만듭니다. 우선순위가 낮은(P2) 기능은 요청이 있을 때만 만듭니다.
- 기능이나 화면 동작을 바꾸면 관련 문서(PRD의 요구 사항 표, DESIGN.md)도 같은 변경에서 고칩니다. PRD를 고치면 머리말의 문서 버전과 변경 내용을 갱신하고, `docs/FilmLook Studio PRD.html`도 md에서 다시 만듭니다.
- 완료 기준: `npm run build`, `npm run test`, `npm run lint`가 통과하고, 화면을 바꿨다면 데스크톱 1440×900과 스마트폰 390×844에서 “프리셋 고르기 → 비교 → 저장”을 직접 확인합니다. 확인하지 못한 것은 확인하지 못했다고 보고합니다.
- 커밋은 요청이 있을 때만 하고, 기능 단위로 작게 나눕니다. 메시지 형식: `feat: 밀착 인화 8칸 선택 표시 추가`(feat, fix, docs, design, refactor, test, chore).
- 사용자에게는 한국어 존댓말로 답합니다.

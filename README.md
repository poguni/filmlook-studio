# FilmLook Studio (색감 사진관)

사진 한 장에 필름 색감을 입혀 보는 웹 편집기입니다. JPEG 사진을 열면 원본과 프리셋 7종이 필름 스트립에 한꺼번에 깔리고, 마음에 드는 컷을 골라 강도·입자를 맞춘 뒤 원본 해상도 JPEG로 저장합니다.

**데모:** https://poguni.github.io/filmlook-studio/

## 특징

- **프리셋 7종을 한눈에:** 같은 사진에 7가지 룩을 깔아 놓고 비교합니다. 사진 위를 좌우로 끌면 원본과 결과가 나뉘어 보입니다.
- **원본 해상도 저장:** 2048px 타일로 나눠 렌더링해 큰 사진도 원본 크기로 저장합니다. 촬영 정보(EXIF)와 위치 정보는 그대로 남기고 회전 정보만 정방향으로 바꿉니다.
- **사진은 기기 밖으로 나가지 않습니다:** 모든 처리를 브라우저 안에서 합니다. 서버 업로드, 분석 도구, 외부 글꼴 요청이 없습니다.
- **직접 만든 색 처리:** 프리셋은 JSON 파라미터(톤 커브, OKLCh 8구간 HSL, 스플릿 토닝 등)로 정의하고, 실행할 때 33³ 3D LUT로 구워 WebGL2 셰이더 하나로 적용합니다.
- **내 LUT 쓰기:** `.cube` 파일을 불러오면 9번째 칸으로 붙습니다.

## 프리셋

| 코드 | 이름 | 부제 |
|---|---|---|
| P01 | 데일리 | Provia에서 영감 |
| V02 | 비비드 슬라이드 | Velvia에서 영감 |
| A03 | 소프트 포트레이트 | Astia에서 영감 |
| C04 | 다큐 크롬 | Classic Chrome에서 영감 |
| N05 | 네거 스냅 | Classic Neg.에서 영감 |
| E06 | 시네마 소프트 | Eterna에서 영감 |
| M07 | 모노 그레인 | Acros에서 영감 (흑백, 노랑·빨강·초록 필터) |

## 단축키

| 키 | 동작 |
|---|---|
| `1` ~ `8` | 원본, P01 ~ M07 |
| `9` | 불러온 LUT |
| `←` `→` | 비교 경계선 이동 |
| `\` (누르고 있기) | 원본 보기 |
| `Ctrl` + `S` | 저장 |

## 기술

- Vite, React, TypeScript
- WebGL2 (렌더링 라이브러리 없이 직접 작성): 3D LUT 텍스처, 사진 좌표 기준 입자, 타일 렌더링
- 색 처리: sRGB ↔ 선형광 ↔ OKLab/OKLCh, 단조 3차 톤 커브, 색역 안으로 채도 줄이기
- EXIF: APP1만 다루는 작은 모듈을 직접 작성
- 테스트: Vitest(색 처리·LUT·EXIF·.cube), Playwright(화면 동작과 렌더 픽셀 비교)
- 배포: GitHub Actions → GitHub Pages

## 직접 실행하기

Node.js 24 이상이 필요합니다.

```bash
npm install
npm run dev          # http://localhost:5173/filmlook-studio/
npm run test         # 단위 테스트
npx playwright install chromium
npm run e2e          # 화면 테스트
npm run build        # 배포용 빌드
```

샘플 사진은 `npm run samples -- 사진1.jpg 사진2.jpg 사진3.jpg`로 넣습니다. EXIF·GPS를 지운 사본이 `public/samples/`에 만들어집니다.

## 알려 두기

이 프로젝트는 개인 학습 및 포트폴리오용입니다. 후지필름(FUJIFILM Corporation)과 관련이 없으며, 후지필름의 승인이나 후원을 받지 않았습니다. 프리셋은 공개 자료를 참고해 직접 만든 근사치이며, 실제 필름 시뮬레이션과 결과가 다를 수 있습니다. 언급된 제품명은 각 소유자의 상표입니다.

- 결과는 RAW가 아닌 JPEG를 다시 가공한 근사치입니다.
- 갤럭시 Ultra HDR 사진은 HDR 정보(게인 맵)를 빼고 일반(SDR) JPEG로 저장합니다.

## 라이선스

- 코드: [MIT](LICENSE)
- 글꼴: Space Grotesk, Space Mono, IBM Plex Sans KR — SIL Open Font License 1.1 (`@fontsource` 패키지로 포함)

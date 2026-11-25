import type { Copy } from '../copy';

// B 카메라 기어 테마 문구 (design/DESIGN.md 5장)
export const copy: Copy = {
  open: '사진 넣기',
  save: '저장',
  'save.progress': '현상 중… {n}%',
  'save.info': 'JPEG 92% · GPS 유지',
  'save.downscaled': '이 기기에서는 {mp}MP로 저장',
  strength: '강도 · APERTURE',
  'strength.name': '강도',
  grain: '입자 · GRAIN DIAL',
  'grain.name': '입자',
  'grain.size': '입자 크기',
  'grain.small': '작게',
  'grain.large': '크게',
  'mono.title': '렌즈 필터',
  'mono.disabled': 'M07 흑백 전용',
  'mono.none': '없음',
  'mono.yellow': '노랑',
  'mono.red': '빨강',
  'mono.green': '초록',
  'compare.label': '원본과 결과 비교 위치',
  'compare.left': 'ORIGINAL',
  'compare.right': '{code} · {strength}%',
  'compare.hint': '사진을 좌우로 끌어 비교',
  'sheet.label': '밀착 인화 필름 스트립',
  'drop.hint': 'JPEG 사진을 끌어다 놓거나 ‘사진 넣기’를 누르세요',
  'frame.label': '{name} 선택',
  'error.notJpeg': 'JPEG 사진만 열 수 있습니다.',
  'error.decode': '사진을 여는 중 문제가 생겼습니다. 다른 사진으로 다시 시도해 주세요.',
  'error.save': '저장하는 중 문제가 생겼습니다. 다시 시도해 주세요.',
  'error.noWebgl2':
    '이 브라우저는 WebGL2를 지원하지 않아 사용할 수 없습니다. 최신 Chrome이나 Edge에서 열어 주세요.',
  'icc.adobeRgb': 'Adobe RGB 사진입니다. sRGB로 변환해 편집합니다.',
};

// 장식(art)에만 쓰는 문구
export const artCopy = {
  appName: 'FilmLook Studio',
  appNameKo: '색감 사진관',
  model: '· MODEL FS-01',
  frameCounter: 'FRAME COUNTER',
  cameraLabel: '레인지파인더 카메라 일러스트',
  asideLabel: '장전된 필름',
  loadedFilm: 'LOADED FILM',
  loaded: 'LOADED',
  canister: 'FS 400',
  summaryStrength: '강도',
  summaryGrain: '입자',
  summaryFilter: '흑백 필터',
  summarySave: '저장',
  /** 렌즈 필터 유리에 새긴 표기 (없음은 이름 그대로) */
  glass: { yellow: 'Y2', red: 'R25', green: 'G11' },
  fStops: ['f/16', 'f/8', 'f/4', 'f/2', 'f/1.4'],
};

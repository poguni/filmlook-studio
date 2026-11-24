import type { Copy } from '../copy';

// B 카메라 기어 테마 문구 (design/DESIGN.md 5장)
export const copy: Copy = {
  open: '사진 넣기',
  strength: '강도 · APERTURE',
  'drop.hint': 'JPEG 사진을 끌어다 놓거나 ‘사진 넣기’를 누르세요',
  'frame.label': '{name} 선택',
  'error.notJpeg': 'JPEG 사진만 열 수 있습니다.',
  'error.decode': '사진을 여는 중 문제가 생겼습니다. 다른 사진으로 다시 시도해 주세요.',
  'error.noWebgl2':
    '이 브라우저는 WebGL2를 지원하지 않아 사용할 수 없습니다. 최신 Chrome이나 Edge에서 열어 주세요.',
  'icc.adobeRgb': 'Adobe RGB 사진입니다. sRGB로 변환해 편집합니다.',
};

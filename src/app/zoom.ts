// 100% 확대 보기의 계산 (PRD E-07). 원본 해상도 사진에서 화면 크기만큼 잘라 1:1로 보여 줌

export interface Size {
  width: number;
  height: number;
}

/** 0~1로 나타낸 위치 (사진이나 화면 상자 안에서) */
export interface Point {
  x: number;
  y: number;
}

/** 원본 사진에서 잘라 낼 영역 (원본 픽셀) */
export interface Region {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * 화면 상자(view, 기기 픽셀)를 원본 1:1로 채우는 영역. center는 영역 가운데가 놓일 사진 위치.
 * 원본이 상자보다 작으면 같은 비율로 줄여 사진 전체가 들어가게 함
 */
export function zoomRegion(full: Size, view: Size, center: Point): Region {
  const scale = Math.min(1, full.width / view.width, full.height / view.height);
  const sw = clamp(Math.round(view.width * scale), 1, full.width);
  const sh = clamp(Math.round(view.height * scale), 1, full.height);
  return {
    sx: clamp(Math.round(center.x * full.width - sw / 2), 0, full.width - sw),
    sy: clamp(Math.round(center.y * full.height - sh / 2), 0, full.height - sh),
    sw,
    sh,
  };
}

/** 영역이 사진 밖으로 나가지 않게 고친 가운데 위치. 끌기가 가장자리에서 쌓이지 않게 함 */
export function clampCenter(full: Size, view: Size, center: Point): Point {
  const r = zoomRegion(full, view, center);
  return { x: (r.sx + r.sw / 2) / full.width, y: (r.sy + r.sh / 2) / full.height };
}

/**
 * 맞춤 화면의 한 점(at, 상자 안 0~1)을 눌러 확대할 때의 가운데 위치.
 * 누른 곳이 확대 후에도 손가락·커서 아래에 남게 함
 */
export function zoomCenterAt(full: Size, view: Size, at: Point): Point {
  const { sw, sh } = zoomRegion(full, view, { x: 0.5, y: 0.5 });
  return clampCenter(full, view, {
    x: at.x + ((0.5 - at.x) * sw) / full.width,
    y: at.y + ((0.5 - at.y) * sh) / full.height,
  });
}

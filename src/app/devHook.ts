// 개발 서버에서만 여는 검사용 창구. Playwright가 렌더 결과를 픽셀 단위로 비교할 때 씀 (PRD 9장 ‘색 정확도’)
import type { Pixels } from '../gl/renderer';

export interface DevHook {
  photoName: string | null;
  readRender: () => Pixels | null;
  readSource: () => Pixels | null;
}

declare global {
  interface Window {
    __filmlook?: DevHook;
  }
}

export function bitmapPixels(bitmap: ImageBitmap): Pixels {
  const c = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D 캔버스를 만들 수 없습니다');
  ctx.drawImage(bitmap, 0, 0);
  const img = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return { width: img.width, height: img.height, data: new Uint8Array(img.data.buffer) };
}

export function installDevHook(hook: DevHook): void {
  if (import.meta.env.DEV) window.__filmlook = hook;
}

// 썸네일과 저장에 함께 쓰는 화면 밖 렌더러. 미리보기 렌더러의 상태를 건드리지 않으려고 따로 둠
import type { Lut } from '../color/lut';
import { Renderer } from './renderer';

let shared: { canvas: OffscreenCanvas; renderer: Renderer } | null = null;

export function offscreenRenderer(): { canvas: OffscreenCanvas; renderer: Renderer } {
  if (!shared) {
    const canvas = new OffscreenCanvas(1, 1);
    const renderer = Renderer.create(canvas);
    if (!renderer) throw new Error('WebGL2를 쓸 수 없습니다');
    shared = { canvas, renderer };
  }
  return shared;
}

export interface ThumbnailJob {
  code: string;
  /** null이면 원본(강도 0) */
  lut: Lut | null;
}

/** 축소본 하나에 프레임별 LUT를 강도 100%로 입힌 썸네일 (design/DESIGN.md 6.1) */
export function renderThumbnails(
  source: ImageBitmap,
  jobs: ThumbnailJob[],
): Map<string, ImageBitmap> {
  const { canvas, renderer } = offscreenRenderer();
  renderer.setImage(source);
  const out = new Map<string, ImageBitmap>();
  for (const job of jobs) {
    if (job.lut) renderer.setLut(job.lut);
    renderer.render(job.lut ? 1 : 0);
    out.set(job.code, canvas.transferToImageBitmap());
  }
  return out;
}

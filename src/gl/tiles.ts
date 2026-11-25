// 원본 해상도 렌더링: 2048px 타일로 나눠 그린 뒤 한 캔버스에 이어 붙임 (PRD 6.3)
import type { Lut } from '../color/lut';
import { offscreenRenderer } from './offscreen';
import type { GrainSettings } from './renderer';

export const TILE_SIZE = 2048;

export interface TileOptions {
  lut: Lut | null;
  strength: number; // 0~1
  /** cell은 source 픽셀 단위 */
  grain?: GrainSettings;
  tileSize?: number;
  onProgress?: (done: number, total: number) => void;
}

const nextFrame = () => new Promise<void>((r) => setTimeout(r, 0));

export async function renderTiled(
  source: ImageBitmap,
  opts: TileOptions,
): Promise<OffscreenCanvas> {
  const tile = opts.tileSize ?? TILE_SIZE;
  const { canvas, renderer } = offscreenRenderer();
  if (opts.lut) renderer.setLut(opts.lut);
  const strength = opts.lut ? opts.strength : 0;

  const out = new OffscreenCanvas(source.width, source.height);
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('2D 캔버스를 만들 수 없습니다');

  // 타일 조각은 2D 캔버스로 옮겨 자름. createImageBitmap(source, sx, sy, …)로 자르면
  // EXIF 회전을 반영해 디코딩한 비트맵을 Chromium이 회전 전 좌표로 잘라 세로 사진 조각이 뒤섞임
  const piece = new OffscreenCanvas(1, 1);
  const pieceCtx = piece.getContext('2d');
  if (!pieceCtx) throw new Error('2D 캔버스를 만들 수 없습니다');

  const cols = Math.ceil(source.width / tile);
  const rows = Math.ceil(source.height / tile);
  const total = cols * rows;
  let done = 0;
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const sx = tx * tile;
      const sy = ty * tile;
      const sw = Math.min(tile, source.width - sx);
      const sh = Math.min(tile, source.height - sy);
      piece.width = sw;
      piece.height = sh;
      pieceCtx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
      renderer.setImage(piece);
      // 입자는 타일이 아닌 사진 좌표로 만들어 이음매가 생기지 않게 함
      renderer.render({ strength, grain: opts.grain, offset: [sx, sy] });
      // 같은 작업 안에서 바로 옮겨 그려야 WebGL 버퍼가 비워지기 전에 읽힘
      ctx.drawImage(canvas, sx, sy);
      done++;
      opts.onProgress?.(done, total);
      await nextFrame(); // 진행률이 화면에 그려지도록 양보
    }
  }
  return out;
}

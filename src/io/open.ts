// 사진 열기: 헤더 확인 → EXIF 회전을 반영해 디코딩 → 미리보기용 축소본 (PRD F-01~F-03, 6.2)
import { isJpeg, readJpegInfo, type JpegInfo } from './jpeg';

export const PREVIEW_MAX_SIDE = 2048;
export const THUMB_MAX_SIDE = 512;

export class NotJpegError extends Error {}

export interface OpenedPhoto {
  /** 저장할 때 원본 해상도로 다시 디코딩하려고 보관. 편집 중에는 큰 비트맵을 들고 있지 않음 */
  file: File;
  name: string;
  info: JpegInfo;
  /** EXIF 회전을 반영한 미리보기 비트맵 (긴 변 최대 2048px) */
  preview: ImageBitmap;
}

/** EXIF 회전을 반영한 원본 해상도 비트맵. colorSpaceConversion 기본값이면 ICC를 sRGB로 변환함 */
export function decodeFull(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}

/** 긴 변이 maxSide를 넘으면 줄인 새 비트맵, 아니면 null */
export async function downscale(bitmap: ImageBitmap, maxSide: number): Promise<ImageBitmap | null> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) return null;
  return createImageBitmap(bitmap, {
    resizeWidth: Math.max(1, Math.round(bitmap.width * scale)),
    resizeHeight: Math.max(1, Math.round(bitmap.height * scale)),
    resizeQuality: 'high',
  });
}

export async function openJpeg(file: File): Promise<OpenedPhoto> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isJpeg(bytes)) throw new NotJpegError(file.name);
  const info = readJpegInfo(bytes);

  const full = await decodeFull(file);
  const small = await downscale(full, PREVIEW_MAX_SIDE);
  if (small) full.close();
  return { file, name: file.name, info, preview: small ?? full };
}

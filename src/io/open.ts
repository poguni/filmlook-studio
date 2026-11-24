// 사진 열기: 헤더 확인 → EXIF 회전을 반영해 디코딩 → 미리보기용 축소본 (PRD F-01~F-03, 6.2)
import { isJpeg, readJpegInfo, type JpegInfo } from './jpeg';

export const PREVIEW_MAX_SIDE = 2048;

export class NotJpegError extends Error {}

export interface OpenedPhoto {
  name: string;
  info: JpegInfo;
  /** EXIF 회전을 반영한 미리보기 비트맵 (긴 변 최대 2048px) */
  preview: ImageBitmap;
}

export async function openJpeg(file: File): Promise<OpenedPhoto> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isJpeg(bytes)) throw new NotJpegError(file.name);
  const info = readJpegInfo(bytes);

  // colorSpaceConversion 기본값('default')이면 브라우저가 ICC 프로필을 sRGB로 변환함
  const full = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, PREVIEW_MAX_SIDE / Math.max(full.width, full.height));
  if (scale === 1) return { name: file.name, info, preview: full };

  const preview = await createImageBitmap(full, {
    resizeWidth: Math.round(full.width * scale),
    resizeHeight: Math.round(full.height * scale),
    resizeQuality: 'high',
  });
  full.close();
  return { name: file.name, info, preview };
}

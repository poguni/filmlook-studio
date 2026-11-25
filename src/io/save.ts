// JPEG 저장 (PRD S-01~S-03). 공유(S-04)는 M4에서 추가
import { insertApp1, prepareExif } from './exif';

/** 고를 수 있는 저장 품질(%) (PRD S-05). 기본 92 */
export const JPEG_QUALITIES = [80, 92, 100] as const;
export type JpegQuality = (typeof JPEG_QUALITIES)[number];

/** `원본이름_프리셋코드.jpg` (예: DSC01234_V02.jpg) */
export function outputName(fileName: string, code: string): string {
  const base = fileName.replace(/\.[^.]*$/, '') || 'photo';
  return `${base}_${code}.jpg`;
}

/** 인코딩한 뒤 원본의 EXIF를 고쳐 끼움 (PRD 6.3 ‘EXIF 처리’) */
export async function encodeJpeg(
  canvas: OffscreenCanvas,
  source: Uint8Array,
  quality: JpegQuality,
): Promise<Blob> {
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: quality / 100 });
  const app1 = prepareExif(source, canvas.width, canvas.height);
  if (!app1) return blob;
  const jpeg = new Uint8Array(await blob.arrayBuffer());
  return new Blob([insertApp1(jpeg, app1)], { type: 'image/jpeg' });
}

export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  // 내려받기가 시작된 뒤 주소를 풀어 메모리를 돌려줌
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * 저장 크기. 화소 수가 상한을 넘으면 비율을 유지해 상한 안으로 줄임 (PRD S-01, 6.3)
 * @param limitMp 상한(백만 화소). null이면 원본 크기
 */
export function outputSize(
  width: number,
  height: number,
  limitMp: number | null,
): { width: number; height: number; downscaled: boolean } {
  const limit = limitMp === null ? Infinity : limitMp * 1e6;
  if (width * height <= limit) return { width, height, downscaled: false };
  const scale = Math.sqrt(limit / (width * height));
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    downscaled: true,
  };
}

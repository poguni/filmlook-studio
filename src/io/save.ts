// JPEG 저장 (PRD S-01, S-02). EXIF 보존(S-03)과 공유(S-04)는 M3·M4에서 추가
export const JPEG_QUALITY = 0.92;

/** `원본이름_프리셋코드.jpg` (예: DSC01234_V02.jpg) */
export function outputName(fileName: string, code: string): string {
  const base = fileName.replace(/\.[^.]*$/, '') || 'photo';
  return `${base}_${code}.jpg`;
}

export function encodeJpeg(canvas: OffscreenCanvas): Promise<Blob> {
  return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
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

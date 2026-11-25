// 저장소에 넣을 샘플 사진에서 EXIF·GPS 등 메타데이터를 지움 (CLAUDE.md, PRD 12장)
// 남기는 것: 영상 데이터, JFIF(APP0), ICC 프로필(색공간), 회전 정보(회전만 담은 작은 EXIF로 다시 씀)
// 지우는 것: EXIF 전체(GPS 포함), XMP, MPF·게인 맵(Ultra HDR), 주석, 첫 EOI 뒤의 덧붙은 데이터
import { readExif } from './exif.ts';

const ascii = (b: Uint8Array, i: number, s: string) =>
  [...s].every((c, k) => b[i + k] === c.charCodeAt(0));

/** Orientation 태그 하나만 있는 EXIF APP1 */
export function orientationApp1(value: number): Uint8Array {
  const out = new Uint8Array(4 + 6 + 26);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0xffe1);
  v.setUint16(2, out.length - 2);
  out.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4);
  const t = 10;
  v.setUint16(t, 0x4d4d);
  v.setUint16(t + 2, 42);
  v.setUint32(t + 4, 8);
  v.setUint16(t + 8, 1);
  v.setUint16(t + 10, 0x0112);
  v.setUint16(t + 12, 3);
  v.setUint32(t + 14, 1);
  v.setUint16(t + 18, value);
  v.setUint32(t + 22, 0);
  return out;
}

export function stripMetadata(jpeg: Uint8Array): Uint8Array {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error('JPEG가 아닙니다');
  const orientation = readExif(jpeg)?.orientation ?? 1;
  const parts: Uint8Array[] = [jpeg.subarray(0, 2)];
  if (orientation !== 1) parts.push(orientationApp1(orientation));

  let i = 2;
  while (i + 4 <= jpeg.length) {
    if (jpeg[i] !== 0xff) throw new Error(`잘못된 표식 위치 ${i}`);
    const marker = jpeg[i + 1];
    if (marker === 0xda) {
      // 영상 데이터부터 첫 EOI까지. 그 뒤(Ultra HDR 게인 맵, 제조사 덧붙임)는 버림
      let end = i + 2;
      while (end + 1 < jpeg.length && !(jpeg[end] === 0xff && jpeg[end + 1] === 0xd9)) end++;
      parts.push(jpeg.subarray(i, end + 2));
      break;
    }
    const len = (jpeg[i + 2] << 8) | jpeg[i + 3];
    const seg = jpeg.subarray(i, i + 2 + len);
    const isApp = marker >= 0xe0 && marker <= 0xef;
    const keep =
      !isApp && marker !== 0xfe
        ? true
        : (marker === 0xe0 && ascii(seg, 4, 'JFIF')) ||
          (marker === 0xe2 && ascii(seg, 4, 'ICC_PROFILE'));
    if (keep) parts.push(seg);
    i += 2 + len;
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

// JPEG 헤더 읽기: 전체 디코딩 전에 형식·크기·ICC 프로필을 확인 (PRD F-03, F-04, F-05)

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export interface JpegInfo {
  width: number;
  height: number;
  /** ICC 프로필의 설명 이름(예: "Adobe RGB (1998)"). 없으면 null */
  iccName: string | null;
}

const be16 = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const be32 = (b: Uint8Array, i: number) =>
  ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));

// SOF0~15 중 DHT(C4)·JPG(C8)·DAC(CC)를 뺀 표식에 크기 정보가 있음
const isSof = (m: number) => m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;

export function readJpegInfo(bytes: Uint8Array): JpegInfo {
  if (!isJpeg(bytes)) throw new Error('JPEG가 아닙니다');
  let width = 0;
  let height = 0;
  const iccChunks: { seq: number; data: Uint8Array }[] = [];

  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) throw new Error(`잘못된 표식 위치 ${i}`);
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i++; // 채움 바이트
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break; // 영상 데이터 시작: 필요한 헤더는 모두 지남
    const len = be16(bytes, i + 2);
    const body = i + 4;
    if (isSof(marker) && width === 0) {
      height = be16(bytes, body + 1);
      width = be16(bytes, body + 3);
    } else if (marker === 0xe2 && ascii(bytes, body, 12) === 'ICC_PROFILE\0') {
      iccChunks.push({ seq: bytes[body + 12], data: bytes.subarray(body + 14, i + 2 + len) });
    }
    i += 2 + len;
  }
  if (width === 0 || height === 0) throw new Error('JPEG 크기 정보를 찾지 못했습니다');

  let iccName: string | null = null;
  if (iccChunks.length > 0) {
    iccChunks.sort((a, b) => a.seq - b.seq);
    const total = iccChunks.reduce((s, c) => s + c.data.length, 0);
    const profile = new Uint8Array(total);
    let o = 0;
    for (const c of iccChunks) {
      profile.set(c.data, o);
      o += c.data.length;
    }
    iccName = readIccDescription(profile);
  }
  return { width, height, iccName };
}

// ICC v2 'desc'(textDescriptionType)와 v4 'mluc'의 첫 문자열을 읽음
export function readIccDescription(icc: Uint8Array): string | null {
  if (icc.length < 132) return null;
  const count = be32(icc, 128);
  for (let t = 0; t < count; t++) {
    const e = 132 + t * 12;
    if (e + 12 > icc.length) return null;
    if (ascii(icc, e, 4) !== 'desc') continue;
    const off = be32(icc, e + 4);
    const type = ascii(icc, off, 4);
    if (type === 'desc') {
      const n = be32(icc, off + 8);
      return (
        ascii(icc, off + 12, n)
          .replace(/\0+$/, '')
          .trim() || null
      );
    }
    if (type === 'mluc') {
      const len = be32(icc, off + 20);
      const start = off + be32(icc, off + 24);
      let s = '';
      for (let k = 0; k + 1 < len; k += 2) s += String.fromCharCode(be16(icc, start + k));
      return s.trim() || null;
    }
    return null;
  }
  return null;
}

export function isAdobeRgb(iccName: string | null): boolean {
  return iccName !== null && /adobe\s*rgb/i.test(iccName);
}

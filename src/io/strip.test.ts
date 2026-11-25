import { describe, expect, it } from 'vitest';
import { readExif } from './exif';
import { stripMetadata } from './strip';

const ascii = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
function seg(marker: number, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(body.length + 4);
  out.set([0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff]);
  out.set(body, 4);
  return out;
}
const concat = (...p: Uint8Array[]) => {
  const out = new Uint8Array(p.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of p) {
    out.set(x, o);
    o += x.length;
  }
  return out;
};

/** 회전 6 + GPS 포인터가 있는 TIFF */
function tiff(): Uint8Array {
  const b = new Uint8Array(64);
  const v = new DataView(b.buffer);
  v.setUint16(0, 0x4949);
  v.setUint16(2, 42, true);
  v.setUint32(4, 8, true);
  v.setUint16(8, 2, true);
  v.setUint16(10, 0x0112, true);
  v.setUint16(12, 3, true);
  v.setUint32(14, 1, true);
  v.setUint16(18, 6, true);
  v.setUint16(22, 0x8825, true);
  v.setUint16(24, 4, true);
  v.setUint32(26, 1, true);
  v.setUint32(30, 40, true);
  v.setUint32(34, 0, true);
  return b;
}

const contains = (hay: Uint8Array, s: string) => new TextDecoder('latin1').decode(hay).includes(s);

describe('stripMetadata (샘플 사진 준비)', () => {
  const source = concat(
    new Uint8Array([0xff, 0xd8]),
    seg(0xe0, ascii('JFIF\0\x01\x01')),
    seg(0xe1, concat(ascii('Exif\0\0'), tiff())),
    seg(0xe1, ascii('http://ns.adobe.com/xap/1.0/\0<gps/>')),
    seg(0xe2, ascii('ICC_PROFILE\0\x01\x01profile')),
    seg(0xe2, ascii('MPF\0gainmap')),
    seg(0xfe, ascii('comment')),
    seg(0xdb, ascii('quant')),
    new Uint8Array([0xff, 0xda, 0, 2, 0x11, 0xff, 0x00, 0x22, 0xff, 0xd9]),
    ascii('TRAILER-SEFT'),
  );

  it('EXIF·GPS·XMP·MPF·주석·덧붙은 데이터는 지우고 회전·ICC·영상은 남김', () => {
    expect(readExif(source)?.hasGps).toBe(true);
    const out = stripMetadata(source);
    expect(readExif(out)).toMatchObject({ orientation: 6, hasGps: false, hasIfd1: false });
    for (const gone of ['http://ns.adobe.com', 'MPF', 'comment', 'TRAILER']) {
      expect(contains(out, gone)).toBe(false);
    }
    for (const kept of ['JFIF', 'ICC_PROFILE', 'quant']) expect(contains(out, kept)).toBe(true);
    expect([...out.subarray(-2)]).toEqual([0xff, 0xd9]);
  });

  it('회전이 1이면 EXIF를 아예 넣지 않음', () => {
    const plain = concat(
      new Uint8Array([0xff, 0xd8]),
      new Uint8Array([0xff, 0xda, 0, 2, 0x11, 0xff, 0xd9]),
    );
    expect(readExif(stripMetadata(plain))).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { insertApp1, prepareExif, readExif } from './exif';

type Entry = [tag: number, type: number, value: number];

/** IFD0(회전·Exif·GPS 포인터) → Exif IFD(크기) · GPS IFD · IFD1(썸네일)을 가진 TIFF */
function buildTiff(le: boolean, orientation: number): Uint8Array {
  const buf = new ArrayBuffer(256);
  const v = new DataView(buf);
  v.setUint16(0, le ? 0x4949 : 0x4d4d);
  v.setUint16(2, 42, le);
  v.setUint32(4, 8, le);
  const writeIfd = (at: number, entries: Entry[], next: number) => {
    v.setUint16(at, entries.length, le);
    entries.forEach(([tag, type, value], k) => {
      const e = at + 2 + k * 12;
      v.setUint16(e, tag, le);
      v.setUint16(e + 2, type, le);
      v.setUint32(e + 4, 1, le);
      if (type === 3) v.setUint16(e + 8, value, le);
      else v.setUint32(e + 8, value, le);
    });
    v.setUint32(at + 2 + entries.length * 12, next, le);
  };
  // 8: IFD0 (항목 4개, 54바이트) → 70: Exif IFD → 100: GPS IFD → 130: IFD1
  writeIfd(
    8,
    [
      [0x010f, 3, 7], // Make (값은 의미 없음)
      [0x0112, 3, orientation],
      [0x8769, 4, 70],
      [0x8825, 4, 100],
    ],
    130,
  );
  writeIfd(
    70,
    [
      [0xa002, 3, 4000],
      [0xa003, 4, 3000],
    ],
    0,
  );
  writeIfd(100, [[0x0000, 1, 0x02020000]], 0); // GPSVersionID
  writeIfd(130, [[0x0103, 3, 6]], 0); // 썸네일 압축 방식
  return new Uint8Array(buf);
}

function segment(marker: number, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(body.length + 4);
  out.set([0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff]);
  out.set(body, 4);
  return out;
}

const ascii = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

/** SOI · APP0 · XMP APP1 · EXIF APP1 · APP2(MPF) · SOS … */
function buildJpeg(tiff: Uint8Array | null): Uint8Array {
  return concat(
    new Uint8Array([0xff, 0xd8]),
    segment(0xe0, ascii('JFIF\0\x01\x01')),
    segment(0xe1, ascii('http://ns.adobe.com/xap/1.0/\0<x/>')),
    ...(tiff ? [segment(0xe1, concat(ascii('Exif\0\0'), tiff))] : []),
    segment(0xe2, ascii('MPF\0')),
    new Uint8Array([0xff, 0xda, 0, 2, 0x12, 0x34, 0xff, 0xd9]),
  );
}

describe('prepareExif', () => {
  for (const le of [true, false]) {
    it(`회전은 1, 크기는 결과 크기, 썸네일 연결은 끊고 GPS는 남김 (${le ? 'II' : 'MM'})`, () => {
      const source = buildJpeg(buildTiff(le, 6));
      expect(readExif(source)).toEqual({
        orientation: 6,
        pixelX: 4000,
        pixelY: 3000,
        hasGps: true,
        hasIfd1: true,
      });

      const app1 = prepareExif(source, 3000, 4000)!;
      expect(app1[1]).toBe(0xe1);
      const out = insertApp1(buildJpeg(null), app1);
      expect(readExif(out)).toEqual({
        orientation: 1,
        pixelX: 3000,
        pixelY: 4000,
        hasGps: true,
        hasIfd1: false,
      });
      // 원본은 건드리지 않음
      expect(readExif(source)?.orientation).toBe(6);
    });
  }

  it('SOI 바로 뒤에 끼우고, 원본의 APP2·XMP는 옮기지 않음', () => {
    const app1 = prepareExif(buildJpeg(buildTiff(true, 1)), 10, 10)!;
    const target = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xd9]);
    const out = insertApp1(target, app1);
    expect([...out.subarray(0, 4)]).toEqual([0xff, 0xd8, 0xff, 0xe1]);
    expect([...out.subarray(2 + app1.length)]).toEqual([0xff, 0xe0, 0, 2, 0xff, 0xd9]);
    expect(app1.length).toBe(4 + 6 + 256);
  });

  it('EXIF가 없거나 깨졌으면 null', () => {
    expect(prepareExif(buildJpeg(null), 10, 10)).toBeNull();
    const broken = buildTiff(true, 1);
    broken[0] = 0; // 바이트 순서 표시를 망가뜨림
    expect(prepareExif(buildJpeg(broken), 10, 10)).toBeNull();
  });
});

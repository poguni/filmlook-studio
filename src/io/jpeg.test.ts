import { describe, expect, it } from 'vitest';
import { isAdobeRgb, isJpeg, readIccDescription, readJpegInfo } from './jpeg';

function seg(marker: number, body: number[]): number[] {
  const len = body.length + 2;
  return [0xff, marker, len >> 8, len & 0xff, ...body];
}

const str = (s: string) => [...s].map((c) => c.charCodeAt(0));
const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

// 크기 정보만 있는 최소 JPEG (SOF0: 정밀도 8, 높이, 너비, 성분 1개)
function jpeg(w: number, h: number, extra: number[] = [], sof = 0xc0): Uint8Array {
  return new Uint8Array([
    0xff,
    0xd8,
    ...seg(0xe0, str('JFIF\0')),
    ...extra,
    ...seg(sof, [8, h >> 8, h & 0xff, w >> 8, w & 0xff, 1, 1, 0x11, 0]),
    ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]),
    0xff,
    0xd9,
  ]);
}

// 'desc' 태그 하나만 있는 ICC v2 프로필
function iccV2(name: string): number[] {
  const desc = [...str('desc'), 0, 0, 0, 0, ...u32(name.length + 1), ...str(name), 0];
  const header = new Array(128).fill(0);
  const table = [...u32(1), ...str('desc'), ...u32(144), ...u32(desc.length)];
  const body = [...header, ...table, ...desc];
  body.splice(0, 4, ...u32(body.length));
  return body;
}

// 'mluc' 형식(ICC v4)의 'desc' 태그
function iccV4(name: string): number[] {
  const utf16 = [...name].flatMap((c) => [0, c.charCodeAt(0)]);
  const mluc = [
    ...str('mluc'),
    0,
    0,
    0,
    0,
    ...u32(1),
    ...u32(12),
    ...str('enUS'),
    ...u32(utf16.length),
    ...u32(28),
    ...utf16,
  ];
  const header = new Array(128).fill(0);
  const table = [...u32(1), ...str('desc'), ...u32(144), ...u32(mluc.length)];
  return [...header, ...table, ...mluc];
}

function app2Icc(profile: number[], seq = 1, total = 1): number[] {
  return seg(0xe2, [...str('ICC_PROFILE\0'), seq, total, ...profile]);
}

describe('isJpeg', () => {
  it('JPEG 시작 표식을 알아봄', () => {
    expect(isJpeg(jpeg(1, 1))).toBe(true);
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(isJpeg(new Uint8Array([]))).toBe(false);
  });
});

describe('readJpegInfo', () => {
  it('SOF0에서 너비·높이를 읽음', () => {
    expect(readJpegInfo(jpeg(6000, 4000))).toEqual({ width: 6000, height: 4000, iccName: null });
  });

  it('프로그레시브(SOF2)도 읽음', () => {
    expect(readJpegInfo(jpeg(9504, 6336, [], 0xc2)).width).toBe(9504);
  });

  it('DHT(C4)를 크기 정보로 착각하지 않음', () => {
    const dht = seg(0xc4, [0, ...new Array(16).fill(0)]);
    expect(readJpegInfo(jpeg(320, 240, dht))).toMatchObject({ width: 320, height: 240 });
  });

  it('ICC v2 프로필 이름을 읽음', () => {
    const info = readJpegInfo(jpeg(10, 10, app2Icc(iccV2('Adobe RGB (1998)'))));
    expect(info.iccName).toBe('Adobe RGB (1998)');
    expect(isAdobeRgb(info.iccName)).toBe(true);
  });

  it('여러 APP2로 나뉜 ICC 프로필을 순서대로 이어 붙임', () => {
    const p = iccV2('Adobe RGB (1998)');
    const cut = 100;
    const extra = [...app2Icc(p.slice(cut), 2, 2), ...app2Icc(p.slice(0, cut), 1, 2)];
    expect(readJpegInfo(jpeg(10, 10, extra)).iccName).toBe('Adobe RGB (1998)');
  });

  it('JPEG가 아니면 오류', () => {
    expect(() => readJpegInfo(new Uint8Array([1, 2, 3, 4]))).toThrow();
  });
});

describe('readIccDescription', () => {
  it('ICC v4(mluc) 이름을 읽음', () => {
    expect(readIccDescription(new Uint8Array(iccV4('sRGB IEC61966-2.1')))).toBe(
      'sRGB IEC61966-2.1',
    );
    expect(isAdobeRgb('sRGB IEC61966-2.1')).toBe(false);
  });
});

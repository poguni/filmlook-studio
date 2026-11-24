// 테스트용 JPEG 만들기. 사진 파일을 저장소에 두지 않으려고 브라우저에서 즉석으로 그림
import type { Page } from '@playwright/test';

export const W = 64;
export const H = 48;

/** 네 칸(초록·주황·회색 계단·파랑)으로 나뉜 64×48 JPEG */
export async function makeTestJpeg(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(
    async ([w, h]) => {
      const c = new OffscreenCanvas(w, h);
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = 'rgb(60,160,90)';
      ctx.fillRect(0, 0, w / 2, h / 2);
      ctx.fillStyle = 'rgb(200,120,80)';
      ctx.fillRect(w / 2, 0, w / 2, h / 2);
      for (let x = 0; x < w / 2; x++) {
        const v = Math.round((x / (w / 2 - 1)) * 255);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, h / 2, 1, h / 2);
      }
      ctx.fillStyle = 'rgb(40,60,200)';
      ctx.fillRect(w / 2, h / 2, w / 2, h / 2);
      const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 1 });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let s = '';
      for (const b of bytes) s += String.fromCharCode(b);
      return btoa(s);
    },
    [W, H],
  );
  return Buffer.from(b64, 'base64');
}

function segment(marker: number, body: Buffer): Buffer {
  const head = Buffer.alloc(4);
  head[0] = 0xff;
  head[1] = marker;
  head.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([head, body]);
}

/** SOI 바로 뒤에 세그먼트를 끼워 넣음 */
export function insertSegment(jpeg: Buffer, seg: Buffer): Buffer {
  return Buffer.concat([jpeg.subarray(0, 2), seg, jpeg.subarray(2)]);
}

/** Orientation 태그 하나만 있는 EXIF(APP1) */
export function exifOrientation(value: number): Buffer {
  const tiff = Buffer.alloc(26);
  tiff.write('MM', 0, 'ascii');
  tiff.writeUInt16BE(42, 2);
  tiff.writeUInt32BE(8, 4);
  tiff.writeUInt16BE(1, 8); // 항목 1개
  tiff.writeUInt16BE(0x0112, 10); // Orientation
  tiff.writeUInt16BE(3, 12); // SHORT
  tiff.writeUInt32BE(1, 14);
  tiff.writeUInt16BE(value, 18);
  tiff.writeUInt32BE(0, 22); // 다음 IFD 없음
  return segment(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]));
}

const s15 = (v: number) => {
  const b = Buffer.alloc(4);
  b.writeInt32BE(Math.round(v * 65536));
  return b;
};
const sig = (s: string) => Buffer.from(s, 'ascii');
const pad4 = (b: Buffer) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);

function xyz(x: number, y: number, z: number): Buffer {
  return Buffer.concat([sig('XYZ '), Buffer.alloc(4), s15(x), s15(y), s15(z)]);
}

/** Adobe RGB (1998)와 같은 원색·감마를 가진 ICC v2 프로필 (D50 기준 값) */
export function adobeRgbIcc(): Buffer {
  const name = 'Adobe RGB (1998)';
  const desc = Buffer.concat([
    sig('desc'),
    Buffer.alloc(4),
    (() => {
      const b = Buffer.alloc(4);
      b.writeUInt32BE(name.length + 1);
      return b;
    })(),
    Buffer.from(name + '\0', 'ascii'),
    Buffer.alloc(4 + 4 + 2 + 1 + 67),
  ]);
  const gamma = Buffer.concat([
    sig('curv'),
    Buffer.alloc(4),
    Buffer.from([0, 0, 0, 1, 0x02, 0x33]),
  ]);
  const tags: [string, Buffer][] = [
    ['desc', desc],
    ['wtpt', xyz(0.9642, 1, 0.8249)],
    ['rXYZ', xyz(0.60974, 0.31111, 0.01947)],
    ['gXYZ', xyz(0.20528, 0.62567, 0.06087)],
    ['bXYZ', xyz(0.14919, 0.06322, 0.74457)],
    ['rTRC', gamma],
    ['gTRC', gamma],
    ['bTRC', gamma],
  ];
  let offset = 128 + 4 + tags.length * 12;
  const table: Buffer[] = [];
  const data: Buffer[] = [];
  for (const [name, body] of tags) {
    const e = Buffer.alloc(12);
    e.write(name, 0, 'ascii');
    e.writeUInt32BE(offset, 4);
    e.writeUInt32BE(body.length, 8);
    table.push(e);
    const padded = pad4(body);
    data.push(padded);
    offset += padded.length;
  }
  const count = Buffer.alloc(4);
  count.writeUInt32BE(tags.length);
  const header = Buffer.alloc(128);
  header.writeUInt32BE(offset, 0);
  header.writeUInt32BE(0x02100000, 8);
  header.write('mntr', 12, 'ascii');
  header.write('RGB ', 16, 'ascii');
  header.write('XYZ ', 20, 'ascii');
  header.writeUInt16BE(2026, 24);
  header.writeUInt16BE(1, 26);
  header.writeUInt16BE(1, 28);
  header.write('acsp', 36, 'ascii');
  s15(0.9642).copy(header, 68);
  s15(1).copy(header, 72);
  s15(0.8249).copy(header, 76);
  return Buffer.concat([header, count, ...table, ...data]);
}

export function iccSegment(profile: Buffer): Buffer {
  return segment(
    0xe2,
    Buffer.concat([Buffer.from('ICC_PROFILE\0', 'binary'), Buffer.from([1, 1]), profile]),
  );
}

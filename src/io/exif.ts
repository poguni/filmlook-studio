// EXIF 옮기기 (PRD S-03, 6.3 ‘EXIF 처리’)
// 원본의 EXIF APP1만 가져와 회전·크기 태그를 고치고 썸네일(IFD1)을 끊은 뒤 결과 JPEG에 끼움.
// APP2(MPF·게인 맵), XMP, ICC 프로필은 옮기지 않음
const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0, 0]; // "Exif\0\0"

const TAG_ORIENTATION = 0x0112;
const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;
const TAG_PIXEL_X = 0xa002;
const TAG_PIXEL_Y = 0xa003;
const TYPE_SHORT = 3;
const TYPE_LONG = 4;

/** EXIF APP1 세그먼트(FF E1 표식 포함)의 위치. 없으면 null */
function findExifSegment(jpeg: Uint8Array): { start: number; end: number } | null {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 <= jpeg.length && jpeg[i] === 0xff) {
    const marker = jpeg[i + 1];
    if (marker === 0xda || marker === 0xd9) break; // 영상 데이터 시작
    const len = (jpeg[i + 2] << 8) | jpeg[i + 3];
    const end = i + 2 + len;
    if (marker === 0xe1 && EXIF_HEADER.every((b, k) => jpeg[i + 4 + k] === b)) {
      return end <= jpeg.length ? { start: i, end } : null;
    }
    i = end;
  }
  return null;
}

/** TIFF 구조를 읽고 고치는 작은 도우미. 모든 오프셋은 TIFF 머리(II/MM) 기준 */
class Tiff {
  readonly view: DataView;
  readonly le: boolean;

  constructor(bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const order = this.view.getUint16(0);
    if (order !== 0x4949 && order !== 0x4d4d) throw new Error('TIFF 바이트 순서 표시가 없습니다');
    this.le = order === 0x4949;
    if (this.u16(2) !== 42) throw new Error('TIFF 식별 값이 아닙니다');
  }

  u16(o: number): number {
    return this.view.getUint16(o, this.le);
  }
  u32(o: number): number {
    return this.view.getUint32(o, this.le);
  }
  set16(o: number, v: number): void {
    this.view.setUint16(o, v, this.le);
  }
  set32(o: number, v: number): void {
    this.view.setUint32(o, v, this.le);
  }

  get ifd0(): number {
    return this.u32(4);
  }

  /** IFD 항목들의 위치(항목 12바이트의 시작). 끝에 다음 IFD 오프셋이 있는 위치도 돌려줌 */
  entries(ifd: number): { tags: Map<number, number>; nextAt: number } {
    const count = this.u16(ifd);
    const nextAt = ifd + 2 + count * 12;
    if (nextAt + 4 > this.view.byteLength) throw new Error('IFD가 EXIF 영역을 넘습니다');
    const tags = new Map<number, number>();
    for (let k = 0; k < count; k++) {
      const e = ifd + 2 + k * 12;
      tags.set(this.u16(e), e);
    }
    return { tags, nextAt };
  }

  /** 개수 1인 SHORT·LONG 값 */
  value(entry: number): number | null {
    const type = this.u16(entry + 2);
    if (this.u32(entry + 4) !== 1) return null;
    if (type === TYPE_SHORT) return this.u16(entry + 8);
    if (type === TYPE_LONG) return this.u32(entry + 8);
    return null;
  }

  /** 개수 1인 SHORT·LONG 값을 그 자리에서 바꿈. 형식이 맞지 않거나 SHORT에 안 들어가면 그대로 둠 */
  setValue(entry: number, v: number): void {
    const type = this.u16(entry + 2);
    if (this.u32(entry + 4) !== 1) return;
    if (type === TYPE_SHORT && v <= 0xffff) this.set16(entry + 8, v);
    else if (type === TYPE_LONG) this.set32(entry + 8, v);
  }
}

function tiffOf(segment: Uint8Array): Tiff {
  // FF E1 + 길이(2) + "Exif\0\0"(6) 다음부터 TIFF
  return new Tiff(segment.subarray(10));
}

/**
 * 원본 JPEG의 EXIF를 결과용으로 고친 APP1 세그먼트 사본. EXIF가 없거나 읽을 수 없으면 null
 * @param width·height 결과 사진의 크기 (회전을 반영한 뒤)
 */
export function prepareExif(source: Uint8Array, width: number, height: number): Uint8Array | null {
  const at = findExifSegment(source);
  if (!at) return null;
  const segment = source.slice(at.start, at.end);
  try {
    const tiff = tiffOf(segment);
    const ifd0 = tiff.entries(tiff.ifd0);
    // 픽셀은 이미 정방향으로 돌려 저장하므로 회전 정보는 1(정방향)
    const orientation = ifd0.tags.get(TAG_ORIENTATION);
    if (orientation !== undefined) tiff.setValue(orientation, 1);

    const exifPtr = ifd0.tags.get(TAG_EXIF_IFD);
    if (exifPtr !== undefined) {
      const exif = tiff.entries(tiff.u32(exifPtr + 8));
      const px = exif.tags.get(TAG_PIXEL_X);
      const py = exif.tags.get(TAG_PIXEL_Y);
      if (px !== undefined) tiff.setValue(px, width);
      if (py !== undefined) tiff.setValue(py, height);
    }
    // IFD0 다음 IFD(IFD1 = 보정 전 썸네일)로 가는 연결을 끊음
    tiff.set32(ifd0.nextAt, 0);
    return segment;
  } catch {
    return null;
  }
}

/** 결과 JPEG의 SOI 바로 뒤에 APP1을 끼움 */
export function insertApp1(jpeg: Uint8Array, app1: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(jpeg.length + app1.length);
  out.set(jpeg.subarray(0, 2), 0);
  out.set(app1, 2);
  out.set(jpeg.subarray(2), 2 + app1.length);
  return out;
}

export interface ExifSummary {
  orientation: number | null;
  pixelX: number | null;
  pixelY: number | null;
  hasGps: boolean;
  /** IFD0 다음에 IFD1(썸네일)이 이어지는지 */
  hasIfd1: boolean;
}

/** 검사용 요약. EXIF가 없으면 null */
export function readExif(jpeg: Uint8Array): ExifSummary | null {
  const at = findExifSegment(jpeg);
  if (!at) return null;
  const tiff = tiffOf(jpeg.subarray(at.start, at.end));
  const ifd0 = tiff.entries(tiff.ifd0);
  const get = (tags: Map<number, number>, tag: number) => {
    const e = tags.get(tag);
    return e === undefined ? null : tiff.value(e);
  };
  const exifPtr = ifd0.tags.get(TAG_EXIF_IFD);
  const exif = exifPtr === undefined ? null : tiff.entries(tiff.u32(exifPtr + 8));
  return {
    orientation: get(ifd0.tags, TAG_ORIENTATION),
    pixelX: exif ? get(exif.tags, TAG_PIXEL_X) : null,
    pixelY: exif ? get(exif.tags, TAG_PIXEL_Y) : null,
    hasGps: ifd0.tags.has(TAG_GPS_IFD),
    hasIfd1: tiff.u32(ifd0.nextAt) !== 0,
  };
}

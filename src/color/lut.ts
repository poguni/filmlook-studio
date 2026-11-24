// 색 변환을 3D LUT로 굽기. 배열 순서는 r이 가장 빠르게 바뀜(WebGL texImage3D의 x=r, y=g, z=b)
import type { Vec3 } from './oklab';
import type { ColorTransform } from './pipeline';

export const LUT_SIZE = 33;

export interface Lut {
  size: number;
  data: Float32Array; // RGBA, 길이 size³ × 4
}

export function bakeLut(transform: ColorTransform, size = LUT_SIZE): Lut {
  const data = new Float32Array(size * size * size * 4);
  const step = 1 / (size - 1);
  let i = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const out = transform([r * step, g * step, b * step]);
        data[i++] = out[0];
        data[i++] = out[1];
        data[i++] = out[2];
        data[i++] = 1;
      }
    }
  }
  return { size, data };
}

// GPU의 하드웨어 삼선형 보간과 같은 계산 (테스트용)
export function sampleLut(lut: Lut, rgb: Vec3): Vec3 {
  const n = lut.size;
  const pos = rgb.map((c) => Math.min(1, Math.max(0, c)) * (n - 1));
  const i0 = pos.map((p) => Math.min(n - 2, Math.floor(p)));
  const f = pos.map((p, k) => p - i0[k]);
  const out: Vec3 = [0, 0, 0];
  for (let dz = 0; dz <= 1; dz++) {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const w = (dx ? f[0] : 1 - f[0]) * (dy ? f[1] : 1 - f[1]) * (dz ? f[2] : 1 - f[2]);
        const idx = (((i0[2] + dz) * n + (i0[1] + dy)) * n + (i0[0] + dx)) * 4;
        out[0] += w * lut.data[idx];
        out[1] += w * lut.data[idx + 1];
        out[2] += w * lut.data[idx + 2];
      }
    }
  }
  return out;
}

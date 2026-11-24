// 프리셋별 LUT를 한 번만 굽고 재사용 (PRD 6.2)
import { bakeLut, type Lut } from '../color/lut';
import { createColorTransform } from '../color/pipeline';
import { findPreset } from '.';

const cache = new Map<string, Lut>();

/** 원본(ORIG)이나 없는 코드면 null */
export function lutFor(code: string): Lut | null {
  const preset = findPreset(code);
  if (!preset) return null;
  let lut = cache.get(code);
  if (!lut) {
    lut = bakeLut(createColorTransform(preset.params));
    cache.set(code, lut);
  }
  return lut;
}

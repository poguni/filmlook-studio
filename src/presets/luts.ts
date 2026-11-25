// 프리셋별 LUT를 한 번만 굽고 재사용 (PRD 6.2). M07은 흑백 필터마다 따로 구움 (PRD 5.4)
import { bakeLut, type Lut } from '../color/lut';
import type { ColorParams, Preset } from '../color/params';
import { createColorTransform } from '../color/pipeline';
import type { MonoChoice } from '../state/edit';
import { findPreset } from '.';

const cache = new Map<string, Lut>();

/** 흑백 필터를 반영한 색 처리 파라미터. 필터는 mono.mix만 바꿔 끼움 */
function paramsFor(preset: Preset, mono: MonoChoice): ColorParams {
  const mix = mono === 'none' ? undefined : preset.monoFilters[mono];
  return preset.params.mono && mix ? { ...preset.params, mono: mix } : preset.params;
}

/** 원본(ORIG)이나 없는 코드면 null. 흑백 필터는 흑백 프리셋에만 적용됨 */
export function lutFor(code: string, mono: MonoChoice = 'none'): Lut | null {
  const preset = findPreset(code);
  if (!preset) return null;
  const choice = mono !== 'none' && preset.params.mono && preset.monoFilters[mono] ? mono : 'none';
  const key = `${code}:${choice}`;
  let lut = cache.get(key);
  if (!lut) {
    lut = bakeLut(createColorTransform(paramsFor(preset, choice)));
    cache.set(key, lut);
  }
  return lut;
}

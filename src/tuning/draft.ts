// 튜닝 화면이 고치는 프리셋 JSON(PRD 5.3). 모든 항목을 채운 형태로 다루고, 내보낼 때 0인 구간은 뺌
import { HUE_BANDS, MONO_FILTERS, type HueBand, type Mix3, type MonoFilter } from '../color/params';

export type MonoTarget = 'mix' | MonoFilter;

export interface Draft {
  code: string;
  name: string;
  subtitle: string;
  toneCurve: [number, number][];
  contrast: number;
  black: number;
  saturation: number;
  hsl: Record<HueBand, { hue: number; sat: number; lum: number }>;
  whiteBalance: { temp: number; tint: number };
  splitTone: Record<'shadows' | 'highlights', { hue: number; sat: number }>;
  mono: { mix: Mix3; filters: Record<MonoFilter, Mix3> } | null;
  defaultGrain: number;
}

type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** 프리셋 JSON을 모든 항목이 채워진 Draft로. 값 검증은 parsePreset이 맡음 */
export function normalize(json: unknown): Draft {
  const o = (json ?? {}) as Loose;
  const hsl = {} as Draft['hsl'];
  for (const b of HUE_BANDS) hsl[b] = { hue: 0, sat: 0, lum: 0, ...o.hsl?.[b] };
  const tone = (t: Loose | undefined) => ({ hue: 0, sat: 0, ...t });
  let mono: Draft['mono'] = null;
  if (o.mono) {
    const filters = {} as Record<MonoFilter, Mix3>;
    for (const f of MONO_FILTERS) filters[f] = [...(o.mono.filters?.[f] ?? o.mono.mix)] as Mix3;
    mono = { mix: [...o.mono.mix] as Mix3, filters };
  }
  return {
    code: o.code,
    name: o.name,
    subtitle: o.subtitle,
    toneCurve: (
      o.toneCurve ?? [
        [0, 0],
        [1, 1],
      ]
    ).map((p: number[]) => [p[0], p[1]]),
    contrast: o.contrast ?? 0,
    black: o.black ?? 0,
    saturation: o.saturation ?? 0,
    hsl,
    whiteBalance: { temp: 0, tint: 0, ...o.whiteBalance },
    splitTone: { shadows: tone(o.splitTone?.shadows), highlights: tone(o.splitTone?.highlights) },
    mono,
    defaultGrain: o.defaultGrain ?? 0,
  };
}

/** src/presets/*.json에 그대로 붙여 넣을 수 있는 JSON */
export function draftToJson(d: Draft): string {
  const hsl: Partial<Draft['hsl']> = {};
  for (const b of HUE_BANDS) {
    const v = d.hsl[b];
    if (v.hue !== 0 || v.sat !== 0 || v.lum !== 0) hsl[b] = v;
  }
  const linear =
    d.toneCurve.length === 2 &&
    d.toneCurve[0][0] === 0 &&
    d.toneCurve[0][1] === 0 &&
    d.toneCurve[1][0] === 1 &&
    d.toneCurve[1][1] === 1;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return JSON.stringify(
    {
      code: d.code,
      name: d.name,
      subtitle: d.subtitle,
      ...(linear ? {} : { toneCurve: d.toneCurve.map(([x, y]) => [round(x), round(y)]) }),
      contrast: d.contrast,
      ...(d.black !== 0 ? { black: d.black } : {}),
      saturation: d.saturation,
      hsl,
      whiteBalance: d.whiteBalance,
      splitTone: d.splitTone,
      mono: d.mono,
      defaultGrain: d.defaultGrain,
    },
    null,
    2,
  );
}

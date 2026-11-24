// 프리셋 JSON(PRD 5.3)을 검증해 색 처리 파라미터(PRD 5.4)로 바꿈
import type { CurvePoint } from './curve';

export const HUE_BANDS = [
  'red',
  'orange',
  'yellow',
  'green',
  'aqua',
  'blue',
  'purple',
  'magenta',
] as const;
export type HueBand = (typeof HUE_BANDS)[number];

export const MONO_FILTERS = ['yellow', 'red', 'green'] as const;
export type MonoFilter = (typeof MONO_FILTERS)[number];

export type Mix3 = [number, number, number];

export interface HslAdjust {
  hue: number;
  sat: number;
  lum: number;
}

export interface ToneShift {
  hue: number;
  sat: number;
}

export interface ColorParams {
  whiteBalance: { temp: number; tint: number };
  mono: Mix3 | null;
  contrast: number;
  black: number;
  toneCurve: CurvePoint[] | null;
  hsl: Record<HueBand, HslAdjust>;
  saturation: number;
  splitTone: { shadows: ToneShift; highlights: ToneShift };
}

export interface Preset {
  code: string;
  name: string;
  subtitle: string;
  params: ColorParams;
  monoFilters: Partial<Record<MonoFilter, Mix3>>;
  defaultGrain: number;
}

export function neutralParams(): ColorParams {
  const hsl = {} as Record<HueBand, HslAdjust>;
  for (const band of HUE_BANDS) hsl[band] = { hue: 0, sat: 0, lum: 0 };
  return {
    whiteBalance: { temp: 0, tint: 0 },
    mono: null,
    contrast: 0,
    black: 0,
    toneCurve: null,
    hsl,
    saturation: 0,
    splitTone: { shadows: { hue: 0, sat: 0 }, highlights: { hue: 0, sat: 0 } },
  };
}

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function obj(v: unknown, path: string): Obj {
  if (v === undefined) return {};
  if (!isObj(v)) throw new Error(`${path}: 객체여야 합니다`);
  return v;
}

function num(v: unknown, min: number, max: number, path: string, fallback = 0): number {
  if (v === undefined) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
    throw new Error(`${path}: ${min}~${max} 사이의 숫자여야 합니다`);
  }
  return v;
}

function str(v: unknown, path: string): string {
  if (typeof v !== 'string' || v.length === 0) throw new Error(`${path}: 문자열이어야 합니다`);
  return v;
}

function mix3(v: unknown, path: string): Mix3 {
  if (!Array.isArray(v) || v.length !== 3) throw new Error(`${path}: 숫자 3개 배열이어야 합니다`);
  const m = v.map((x, i) => num(x, 0, 1, `${path}[${i}]`)) as Mix3;
  if (Math.abs(m[0] + m[1] + m[2] - 1) > 0.001) throw new Error(`${path}: 합이 1이어야 합니다`);
  return m;
}

function toneCurve(v: unknown, path: string): CurvePoint[] | null {
  if (v === undefined) return null;
  if (!Array.isArray(v) || v.length < 2) throw new Error(`${path}: 점이 2개 이상이어야 합니다`);
  const points = v.map((p, i) => {
    if (!Array.isArray(p) || p.length !== 2)
      throw new Error(`${path}[${i}]: [x, y] 형식이어야 합니다`);
    return [num(p[0], 0, 1, `${path}[${i}][0]`), num(p[1], 0, 1, `${path}[${i}][1]`)] as CurvePoint;
  });
  for (let i = 1; i < points.length; i++) {
    if (points[i][0] <= points[i - 1][0]) throw new Error(`${path}: x가 증가하는 순서여야 합니다`);
  }
  return points;
}

function toneShift(v: unknown, path: string): ToneShift {
  const o = obj(v, path);
  return { hue: num(o.hue, 0, 360, `${path}.hue`), sat: num(o.sat, 0, 100, `${path}.sat`) };
}

export function parsePreset(json: unknown): Preset {
  const o = obj(json, 'preset');
  const params = neutralParams();

  const wb = obj(o.whiteBalance, 'whiteBalance');
  params.whiteBalance = {
    temp: num(wb.temp, -100, 100, 'whiteBalance.temp'),
    tint: num(wb.tint, -100, 100, 'whiteBalance.tint'),
  };
  params.contrast = num(o.contrast, -100, 100, 'contrast');
  params.black = num(o.black, -100, 100, 'black');
  params.toneCurve = toneCurve(o.toneCurve, 'toneCurve');
  params.saturation = num(o.saturation, -100, 100, 'saturation');

  const hsl = obj(o.hsl, 'hsl');
  for (const key of Object.keys(hsl)) {
    if (!(HUE_BANDS as readonly string[]).includes(key))
      throw new Error(`hsl.${key}: 알 수 없는 구간`);
  }
  for (const band of HUE_BANDS) {
    const b = obj(hsl[band], `hsl.${band}`);
    params.hsl[band] = {
      hue: num(b.hue, -30, 30, `hsl.${band}.hue`),
      sat: num(b.sat, -100, 100, `hsl.${band}.sat`),
      lum: num(b.lum, -100, 100, `hsl.${band}.lum`),
    };
  }

  const split = obj(o.splitTone, 'splitTone');
  params.splitTone = {
    shadows: toneShift(split.shadows, 'splitTone.shadows'),
    highlights: toneShift(split.highlights, 'splitTone.highlights'),
  };

  const monoFilters: Partial<Record<MonoFilter, Mix3>> = {};
  if (o.mono !== undefined && o.mono !== null) {
    const mono = obj(o.mono, 'mono');
    params.mono = mix3(mono.mix, 'mono.mix');
    const filters = obj(mono.filters, 'mono.filters');
    for (const f of MONO_FILTERS) {
      if (filters[f] !== undefined) monoFilters[f] = mix3(filters[f], `mono.filters.${f}`);
    }
  }

  return {
    code: str(o.code, 'code'),
    name: str(o.name, 'name'),
    subtitle: str(o.subtitle, 'subtitle'),
    params,
    monoFilters,
    defaultGrain: num(o.defaultGrain, 0, 100, 'defaultGrain'),
  };
}

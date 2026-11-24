// PRD 5.4 색 처리 명세. 입력·출력 모두 sRGB(감마) 0~1
import { createMonotoneCurve } from './curve';
import { linearSrgbToOklab, oklabToLinearSrgb, type Vec3 } from './oklab';
import { HUE_BANDS, type ColorParams, type HueBand } from './params';
import { linearToSrgb, srgbToLinear } from './srgb';

// 파라미터 1단위가 실제로 얼마나 움직이는지 정하는 배율 (PRD 5.4 ‘초기 정의’)
export const SCALE = {
  wbTemp: 0.25, // temp 100 → 빨강 ×1.25, 파랑 ×0.75 (휘도 보정 전)
  wbTint: 0.2, // tint 100 → 초록 ×0.8
  contrastExp: 1, // contrast 100 → 중간 회색 기울기 2배
  black: 0.25, // black 100 → 블랙이 0.25까지 들림
  hslLum: 0.2, // lum 100 → OKLab 명도 +0.2
  hslChromaFull: 0.04, // 이 채도 이상에서 구간별 색상·명도 조절이 100% 적용 (회색 보호)
  splitChroma: 0.1, // sat 100% → OKLab 채도 0.1만큼 색을 더함
} as const;

const LUMA = [0.2126, 0.7152, 0.0722] as const;

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const DEG = Math.PI / 180;

function hueOf(hex: string): number {
  const c = [1, 3, 5].map((i) => srgbToLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const [, a, b] = linearSrgbToOklab(c[0], c[1], c[2]);
  const h = Math.atan2(b, a) / DEG;
  return h < 0 ? h + 360 : h;
}

// 구간 중심 = 대표 sRGB 색의 OKLCh 색상각
const BAND_COLORS: Record<HueBand, string> = {
  red: '#ff0000',
  orange: '#ff8000',
  yellow: '#ffff00',
  green: '#00ff00',
  aqua: '#00ffff',
  blue: '#0000ff',
  purple: '#8000ff',
  magenta: '#ff00ff',
};
export const BAND_CENTERS: readonly number[] = HUE_BANDS.map((b) => hueOf(BAND_COLORS[b]));

// 색상각 h에서 각 구간의 가중치. 이웃한 두 구간만 코사인 곡선으로 섞이고 합은 1
export function bandWeights(h: number): number[] {
  const w = new Array<number>(HUE_BANDS.length).fill(0);
  const n = BAND_CENTERS.length;
  for (let i = 0; i < n; i++) {
    const c0 = BAND_CENTERS[i];
    let c1 = BAND_CENTERS[(i + 1) % n];
    let x = h;
    if (c1 <= c0) {
      c1 += 360;
      if (x < c0) x += 360;
    }
    if (x >= c0 && x < c1) {
      const s = 0.5 - 0.5 * Math.cos((Math.PI * (x - c0)) / (c1 - c0));
      w[i] = 1 - s;
      w[(i + 1) % n] = s;
      return w;
    }
  }
  return w;
}

// OKLab 색이 sRGB 범위를 벗어나면 명도·색상각은 두고 채도만 줄임
function oklabToSrgbInGamut(L: number, a: number, b: number): Vec3 {
  L = clamp01(L);
  const inside = (k: number) => {
    const rgb = oklabToLinearSrgb(L, a * k, b * k);
    return rgb.every((c) => c >= -1e-6 && c <= 1 + 1e-6) ? rgb : null;
  };
  let rgb = inside(1);
  if (!rgb) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inside(mid)) lo = mid;
      else hi = mid;
    }
    rgb = oklabToLinearSrgb(L, a * lo, b * lo);
  }
  return [
    linearToSrgb(clamp01(rgb[0])),
    linearToSrgb(clamp01(rgb[1])),
    linearToSrgb(clamp01(rgb[2])),
  ];
}

export type ColorTransform = (rgb: Vec3) => Vec3;

export function createColorTransform(p: ColorParams): ColorTransform {
  // 1) 화이트밸런스 배율: 흰색의 휘도가 그대로 남도록 정규화
  const t = (p.whiteBalance.temp / 100) * SCALE.wbTemp;
  const m = (p.whiteBalance.tint / 100) * SCALE.wbTint;
  const raw = [1 + t, 1 - m, 1 - t];
  const norm = LUMA[0] * raw[0] + LUMA[1] * raw[1] + LUMA[2] * raw[2];
  const gains = raw.map((g) => g / norm);
  const linearStage = p.mono !== null || t !== 0 || m !== 0;

  // 3) 대비: 0.5 기준 거듭제곱 S자 곡선 (끝점 고정)
  const pw = 2 ** ((p.contrast / 100) * SCALE.contrastExp);
  const contrast = (x: number) => (x < 0.5 ? 0.5 * (2 * x) ** pw : 1 - 0.5 * (2 * (1 - x)) ** pw);

  // 4) 블랙
  const lift = (p.black / 100) * SCALE.black;
  const black =
    lift >= 0
      ? (x: number) => lift + x * (1 - lift)
      : (x: number) => Math.max(0, (x + lift) / (1 + lift));

  // 5) 톤 커브
  const curve = p.toneCurve ? createMonotoneCurve(p.toneCurve) : null;

  // 6~8) OKLCh/OKLab 단계가 하나라도 있는지
  const hsl = HUE_BANDS.map((b) => p.hsl[b]);
  const hasHsl = hsl.some((a) => a.hue !== 0 || a.sat !== 0 || a.lum !== 0);
  const sh = p.splitTone.shadows;
  const hi = p.splitTone.highlights;
  const split = {
    sa: (sh.sat / 100) * SCALE.splitChroma * Math.cos(sh.hue * DEG),
    sb: (sh.sat / 100) * SCALE.splitChroma * Math.sin(sh.hue * DEG),
    ha: (hi.sat / 100) * SCALE.splitChroma * Math.cos(hi.hue * DEG),
    hb: (hi.sat / 100) * SCALE.splitChroma * Math.sin(hi.hue * DEG),
  };
  const hasSplit = sh.sat !== 0 || hi.sat !== 0;
  const labStage = hasHsl || hasSplit || p.saturation !== 0;
  const satMul = Math.max(0, 1 + p.saturation / 100);

  return (input) => {
    let [r, g, b] = input;

    // 1~2) 선형광 단계 (필요할 때만 변환해 항등 오차를 없앰)
    if (linearStage) {
      let lr = srgbToLinear(r) * gains[0];
      let lg = srgbToLinear(g) * gains[1];
      let lb = srgbToLinear(b) * gains[2];
      if (p.mono) {
        const y = p.mono[0] * lr + p.mono[1] * lg + p.mono[2] * lb;
        lr = lg = lb = y;
      }
      r = linearToSrgb(clamp01(lr));
      g = linearToSrgb(clamp01(lg));
      b = linearToSrgb(clamp01(lb));
    }

    // 3~5) 감마 단계
    if (pw !== 1) [r, g, b] = [contrast(r), contrast(g), contrast(b)];
    if (lift !== 0) [r, g, b] = [black(r), black(g), black(b)];
    if (curve) [r, g, b] = [clamp01(curve(r)), clamp01(curve(g)), clamp01(curve(b))];

    if (!labStage) return [r, g, b];

    // 6~8) OKLCh·OKLab 단계
    let [L, A, B] = linearSrgbToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
    let C = Math.hypot(A, B);
    let h = Math.atan2(B, A) / DEG;
    if (h < 0) h += 360;

    if (hasHsl) {
      const w = bandWeights(h);
      const grayGuard = smoothstep(0, SCALE.hslChromaFull, C);
      let dh = 0;
      let ds = 0;
      let dl = 0;
      for (let i = 0; i < w.length; i++) {
        dh += w[i] * hsl[i].hue;
        ds += w[i] * hsl[i].sat;
        dl += w[i] * hsl[i].lum;
      }
      h += dh * grayGuard;
      C *= Math.max(0, 1 + ds / 100);
      L += (dl / 100) * SCALE.hslLum * grayGuard;
    }
    C *= satMul;
    A = C * Math.cos(h * DEG);
    B = C * Math.sin(h * DEG);

    if (hasSplit) {
      const ws = 1 - smoothstep(0, 0.65, L);
      const wh = smoothstep(0.45, 1, L);
      A += ws * split.sa + wh * split.ha;
      B += ws * split.sb + wh * split.hb;
    }

    // 9) 출력
    return oklabToSrgbInGamut(L, A, B);
  };
}

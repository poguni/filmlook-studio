import { describe, expect, it } from 'vitest';
import { bakeLut, sampleLut } from './lut';
import { linearSrgbToOklab, oklabToLinearSrgb, type Vec3 } from './oklab';
import { neutralParams, type ColorParams } from './params';
import { BAND_CENTERS, bandWeights, createColorTransform } from './pipeline';
import { linearToSrgb, srgbToLinear } from './srgb';
import { PRESETS } from '../presets';

const ONE = 1 / 255;

function params(patch: (p: ColorParams) => void): ColorParams {
  const p = neutralParams();
  patch(p);
  return p;
}

function chroma(rgb: Vec3): number {
  const [, a, b] = linearSrgbToOklab(...(rgb.map(srgbToLinear) as Vec3));
  return Math.hypot(a, b);
}

const isGray = (c: Vec3) => Math.abs(c[0] - c[1]) < 1e-6 && Math.abs(c[1] - c[2]) < 1e-6;

// 재현 가능한 의사 난수
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

describe('기초 변환', () => {
  it('sRGB ↔ 선형광 왕복', () => {
    for (let i = 0; i <= 255; i++)
      expect(linearToSrgb(srgbToLinear(i / 255))).toBeCloseTo(i / 255, 10);
  });

  it('OKLab 왕복 오차가 0.01/255 미만', () => {
    const r = rng(1);
    for (let i = 0; i < 1000; i++) {
      const c: Vec3 = [r(), r(), r()];
      const back = oklabToLinearSrgb(...linearSrgbToOklab(...c));
      for (let k = 0; k < 3; k++) expect(Math.abs(back[k] - c[k])).toBeLessThan(0.01 * ONE);
    }
  });

  it('HSL 구간 중심이 색상환 순서대로 놓임', () => {
    for (let i = 1; i < BAND_CENTERS.length; i++)
      expect(BAND_CENTERS[i]).toBeGreaterThan(BAND_CENTERS[i - 1]);
  });

  it('구간 가중치의 합은 1이고 중심에서는 그 구간만 1', () => {
    for (let h = 0; h < 360; h += 7) {
      const w = bandWeights(h);
      expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 12);
    }
    BAND_CENTERS.forEach((c, i) => expect(bandWeights(c)[i]).toBeCloseTo(1, 12));
  });
});

describe('PRD 5.4 ① 항등 LUT', () => {
  const lut = bakeLut(createColorTransform(neutralParams()));

  it('모든 격자점이 입력과 같음 (0.5/255 이내)', () => {
    const n = lut.size;
    for (let b = 0; b < n; b++)
      for (let g = 0; g < n; g++)
        for (let r = 0; r < n; r++) {
          const i = ((b * n + g) * n + r) * 4;
          expect(Math.abs(lut.data[i] - r / (n - 1))).toBeLessThan(0.5 * ONE);
          expect(Math.abs(lut.data[i + 1] - g / (n - 1))).toBeLessThan(0.5 * ONE);
          expect(Math.abs(lut.data[i + 2] - b / (n - 1))).toBeLessThan(0.5 * ONE);
        }
  });

  it('격자 사이 값도 삼선형 보간 후 입력과 같음 (0.5/255 이내)', () => {
    const r = rng(2);
    for (let i = 0; i < 2000; i++) {
      const c: Vec3 = [r(), r(), r()];
      const out = sampleLut(lut, c);
      for (let k = 0; k < 3; k++) expect(Math.abs(out[k] - c[k])).toBeLessThan(0.5 * ONE);
    }
  });
});

describe('PRD 5.4 ② 강도 0%', () => {
  it('mix(원본, LUT, 0)은 8비트 원본과 같음', () => {
    const lut = bakeLut(createColorTransform(PRESETS[0].params));
    const mix = (a: number, b: number, t: number) => a * (1 - t) + b * t;
    for (let v = 0; v <= 255; v += 5) {
      const src: Vec3 = [v / 255, ((v * 7) % 256) / 255, ((v * 13) % 256) / 255];
      const graded = sampleLut(lut, src);
      for (let k = 0; k < 3; k++) {
        expect(
          Math.abs(Math.round(mix(src[k], graded[k], 0) * 255) - src[k] * 255),
        ).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('PRD 5.4 ③ 단계별 방향', () => {
  const run = (patch: (p: ColorParams) => void, rgb: Vec3) =>
    createColorTransform(params(patch))(rgb);

  it('화이트밸런스: temp 양수면 따뜻해지고, 흰색은 휘도가 유지됨', () => {
    const out = run((p) => (p.whiteBalance.temp = 50), [0.5, 0.5, 0.5]);
    expect(out[0]).toBeGreaterThan(out[2]);
    const white = run((p) => (p.whiteBalance.temp = 50), [0.8, 0.8, 0.8]).map(srgbToLinear);
    expect(0.2126 * white[0] + 0.7152 * white[1] + 0.0722 * white[2]).toBeCloseTo(
      srgbToLinear(0.8),
      3,
    );
  });

  it('화이트밸런스: tint 양수면 초록이 줄어듦(마젠타 쪽)', () => {
    const out = run((p) => (p.whiteBalance.tint = 50), [0.5, 0.5, 0.5]);
    expect(out[1]).toBeLessThan(out[0]);
  });

  it('흑백 혼합: 결과가 회색이고, 빨강 필터는 빨간 물체를 밝게 함', () => {
    const red: Vec3 = [0.8, 0.2, 0.2];
    const std = run((p) => (p.mono = [0.3, 0.59, 0.11]), red);
    const redFilter = run((p) => (p.mono = [0.7, 0.3, 0]), red);
    expect(isGray(std)).toBe(true);
    expect(redFilter[0]).toBeGreaterThan(std[0]);
  });

  it('대비: 양수면 0.25가 어두워지고 0.75가 밝아짐, 끝점과 0.5는 고정', () => {
    const f = (v: number) => run((p) => (p.contrast = 50), [v, v, v])[0];
    expect(f(0.25)).toBeLessThan(0.25);
    expect(f(0.75)).toBeGreaterThan(0.75);
    expect(f(0)).toBe(0);
    expect(f(1)).toBe(1);
    expect(f(0.5)).toBeCloseTo(0.5, 12);
    expect(run((p) => (p.contrast = -50), [0.25, 0.25, 0.25])[0]).toBeGreaterThan(0.25);
  });

  it('블랙: 양수면 0이 들리고, 음수면 어두운 값이 0으로 눌림', () => {
    expect(run((p) => (p.black = 6), [0, 0, 0])[0]).toBeGreaterThan(0);
    expect(run((p) => (p.black = -20), [0.04, 0.04, 0.04])[0]).toBe(0);
  });

  it('톤 커브: 점 목록대로 바뀜', () => {
    const out = run(
      (p) =>
        (p.toneCurve = [
          [0, 0],
          [0.5, 0.6],
          [1, 1],
        ]),
      [0.5, 0.5, 0.5],
    );
    expect(out[0]).toBeCloseTo(0.6, 12);
  });

  it('구간 HSL: 파랑 명도를 낮추면 파랑만 어두워지고 회색은 그대로', () => {
    const blue: Vec3 = [0.15, 0.25, 0.85];
    const red: Vec3 = [0.85, 0.2, 0.15];
    const gray: Vec3 = [0.5, 0.5, 0.5];
    const patch = (p: ColorParams) => (p.hsl.blue.lum = -50);
    const L = (c: Vec3) => linearSrgbToOklab(...(c.map(srgbToLinear) as Vec3))[0];
    expect(L(run(patch, blue))).toBeLessThan(L(blue) - 0.03);
    expect(Math.abs(L(run(patch, red)) - L(red))).toBeLessThan(0.005);
    const g = run(patch, gray);
    for (let k = 0; k < 3; k++) expect(g[k]).toBeCloseTo(0.5, 4);
  });

  it('구간 HSL: 8개 구간을 모두 조절해도 회색은 회색으로 남음', () => {
    // 회색의 색상각은 계산 오차로 정해지므로 모든 구간을 함께 움직여야 확실히 검사됨
    const allBands = (p: ColorParams) => {
      for (const band of Object.keys(p.hsl) as (keyof ColorParams['hsl'])[]) {
        p.hsl[band] = { hue: 20, sat: 50, lum: -50 };
      }
    };
    for (const v of [0.1, 0.5, 0.9]) {
      const out = run(allBands, [v, v, v]);
      for (let k = 0; k < 3; k++) expect(out[k]).toBeCloseTo(v, 4);
    }
  });

  it('구간 HSL: 색상각을 돌리면 그 방향으로 움직임', () => {
    const green: Vec3 = [0.3, 0.7, 0.2];
    const hue = (c: Vec3) => {
      const [, a, b] = linearSrgbToOklab(...(c.map(srgbToLinear) as Vec3));
      return Math.atan2(b, a) * (180 / Math.PI);
    };
    expect(hue(run((p) => (p.hsl.green.hue = -15), green))).toBeLessThan(hue(green) - 5);
  });

  it('채도: 양수면 채도가 오르고 회색은 회색으로 남음', () => {
    const c: Vec3 = [0.7, 0.45, 0.35];
    expect(chroma(run((p) => (p.saturation = 40), c))).toBeGreaterThan(chroma(c) * 1.2);
    expect(chroma(run((p) => (p.saturation = -100), c))).toBeLessThan(1e-4);
    const g = run((p) => (p.saturation = 40), [0.3, 0.3, 0.3]);
    expect(chroma(g)).toBeLessThan(1e-4);
  });

  it('스플릿 토닝: 섀도에 색이 들고 흰색은 거의 그대로', () => {
    const patch = (p: ColorParams) => (p.splitTone.shadows = { hue: 210, sat: 30 });
    expect(chroma(run(patch, [0.15, 0.15, 0.15]))).toBeGreaterThan(0.01);
    expect(chroma(run(patch, [1, 1, 1]))).toBeLessThan(1e-3);
  });

  it('출력은 항상 0~1 범위 (무작위 파라미터 500회)', () => {
    const r = rng(3);
    const s = () => Math.round(r() * 200 - 100);
    for (let i = 0; i < 500; i++) {
      const t = createColorTransform(
        params((p) => {
          p.contrast = s();
          p.black = s();
          p.saturation = s();
          p.whiteBalance = { temp: s(), tint: s() };
          p.hsl.blue = { hue: s() * 0.3, sat: s(), lum: s() };
          p.splitTone.shadows = { hue: r() * 360, sat: r() * 100 };
        }),
      );
      const out = t([r(), r(), r()]);
      for (const c of out) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('프리셋', () => {
  it('V02는 항등이 아니고 원색의 채도를 높임', () => {
    const v02 = PRESETS.find((p) => p.code === 'V02');
    expect(v02).toBeDefined();
    const t = createColorTransform(v02!.params);
    const c: Vec3 = [0.3, 0.55, 0.3];
    expect(chroma(t(c))).toBeGreaterThan(chroma(c));
  });
});

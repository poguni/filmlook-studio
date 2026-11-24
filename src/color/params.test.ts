import { describe, expect, it } from 'vitest';
import { parsePreset } from './params';

const base = { code: 'X01', name: '테스트', subtitle: '테스트용' };

describe('parsePreset', () => {
  it('적지 않은 항목은 0과 null로 채움', () => {
    const p = parsePreset(base);
    expect(p.params.contrast).toBe(0);
    expect(p.params.toneCurve).toBeNull();
    expect(p.params.hsl.aqua).toEqual({ hue: 0, sat: 0, lum: 0 });
    expect(p.params.mono).toBeNull();
    expect(p.defaultGrain).toBe(0);
  });

  it('흑백 혼합과 필터를 읽음', () => {
    const p = parsePreset({
      ...base,
      mono: { mix: [0.3, 0.59, 0.11], filters: { red: [0.7, 0.3, 0] } },
    });
    expect(p.params.mono).toEqual([0.3, 0.59, 0.11]);
    expect(p.monoFilters.red).toEqual([0.7, 0.3, 0]);
  });

  it.each([
    [{ contrast: 150 }, 'contrast'],
    [{ hsl: { teal: { hue: 1 } } }, 'hsl.teal'],
    [{ hsl: { red: { hue: 40 } } }, 'hsl.red.hue'],
    [{ toneCurve: [[0, 0]] }, 'toneCurve'],
    [
      {
        toneCurve: [
          [0.5, 0.5],
          [0.2, 0.2],
        ],
      },
      'toneCurve',
    ],
    [{ mono: { mix: [0.5, 0.5, 0.5] } }, 'mono.mix'],
    [{ code: '' }, 'code'],
  ])('잘못된 값 %j는 거부', (patch, path) => {
    expect(() => parsePreset({ ...base, ...patch })).toThrow(path);
  });
});

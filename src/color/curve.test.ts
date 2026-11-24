import { describe, expect, it } from 'vitest';
import { createMonotoneCurve } from './curve';

describe('createMonotoneCurve', () => {
  it('두 점 직선은 항등', () => {
    const f = createMonotoneCurve([
      [0, 0],
      [1, 1],
    ]);
    for (let x = 0; x <= 1; x += 0.05) expect(f(x)).toBeCloseTo(x, 12);
  });

  it('모든 점을 지나고 단조 증가', () => {
    const pts: [number, number][] = [
      [0, 0],
      [0.25, 0.2],
      [0.5, 0.5],
      [0.75, 0.82],
      [1, 1],
    ];
    const f = createMonotoneCurve(pts);
    for (const [x, y] of pts) expect(f(x)).toBeCloseTo(y, 12);
    let prev = -1;
    for (let i = 0; i <= 1000; i++) {
      const y = f(i / 1000);
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
  });

  it('평평한 구간에서 넘치지 않음', () => {
    const f = createMonotoneCurve([
      [0, 0],
      [0.4, 0.5],
      [0.6, 0.5],
      [1, 1],
    ]);
    for (let x = 0.4; x <= 0.6; x += 0.01) expect(f(x)).toBeCloseTo(0.5, 12);
  });
});

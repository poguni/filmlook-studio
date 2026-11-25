import { describe, expect, it } from 'vitest';
import { grainSettings } from './grain';

describe('grainSettings (PRD E-05)', () => {
  it('강도 0%면 입자 없음', () => {
    expect(grainSettings(50, 'small', 0, 6000, 6000).amount).toBe(0);
    expect(grainSettings(50, 'small', 1, 6000, 6000).amount).toBe(0.5);
  });

  it('입자는 사진의 긴 변에 비례해, 미리보기와 저장에서 사진 대비 같은 크기', () => {
    const saved = grainSettings(25, 'small', 100, 6000, 6000).cell;
    const preview = grainSettings(25, 'small', 100, 6000, 2048).cell;
    expect(saved / 6000).toBeCloseTo(preview / 2048, 10);
    expect(preview).toBeCloseTo(1, 10);
    expect(grainSettings(25, 'large', 100, 6000, 2048).cell).toBeGreaterThan(preview);
  });

  it('작은 사진에서도 입자 한 칸은 1픽셀보다 작아지지 않음', () => {
    expect(grainSettings(25, 'small', 100, 1200, 1200).cell).toBe(1);
  });
});

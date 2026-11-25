import { describe, expect, it } from 'vitest';
import { outputName, outputSize } from './save';

describe('outputName (PRD S-02)', () => {
  it.each([
    ['DSC01234.JPG', 'V02', 'DSC01234_V02.jpg'],
    ['20261125_101500.jpg', 'C04', '20261125_101500_C04.jpg'],
    ['여행.사진.jpeg', 'ORIG', '여행.사진_ORIG.jpg'],
    ['noext', 'V02', 'noext_V02.jpg'],
    ['.jpg', 'V02', 'photo_V02.jpg'],
  ])('%s + %s → %s', (name, code, expected) => {
    expect(outputName(name, code)).toBe(expected);
  });
});

describe('outputSize (PRD S-01, 6.3)', () => {
  it('상한이 없거나 안쪽이면 원본 크기', () => {
    expect(outputSize(9504, 6336, null)).toEqual({ width: 9504, height: 6336, downscaled: false });
    expect(outputSize(6000, 4000, 24)).toEqual({ width: 6000, height: 4000, downscaled: false });
  });

  it('상한을 넘으면 비율을 지키며 상한 안으로 줄임', () => {
    const out = outputSize(8160, 6120, 24); // 갤럭시 50MP
    expect(out.downscaled).toBe(true);
    expect(out.width * out.height).toBeLessThanOrEqual(24e6);
    expect(out.width * out.height).toBeGreaterThan(23.9e6);
    expect(out.width / out.height).toBeCloseTo(8160 / 6120, 3);
  });
});

import { describe, expect, it } from 'vitest';
import { outputName } from './save';

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

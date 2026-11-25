import { describe, expect, it } from 'vitest';
import { parseCube } from './cube';
import { bakeLut, sampleLut } from './lut';

/** r이 가장 빠르게 바뀌는 순서로 쓴 .cube */
function cube(size: number, f: (r: number, g: number, b: number) => number[], head = ''): string {
  const lines = [`${head}TITLE "test"`, `LUT_3D_SIZE ${size}`, '# 주석', ''];
  const s = 1 / (size - 1);
  for (let b = 0; b < size; b++)
    for (let g = 0; g < size; g++)
      for (let r = 0; r < size; r++) lines.push(f(r * s, g * s, b * s).join(' '));
  return lines.join('\r\n');
}

describe('parseCube (PRD P-05)', () => {
  it('항등 LUT는 bakeLut 항등과 같음', () => {
    const lut = parseCube(cube(17, (r, g, b) => [r, g, b]));
    const ref = bakeLut((c) => c, 17);
    expect(lut.size).toBe(17);
    expect(Array.from(lut.data)).toEqual(Array.from(ref.data).map((v) => Math.fround(v)));
  });

  it('채널 순서를 지킴: 빨강·파랑 맞바꾸기', () => {
    const lut = parseCube(cube(5, (r, g, b) => [b, g, r]));
    const out = sampleLut(lut, [1, 0.5, 0]);
    expect(out[0]).toBeCloseTo(0, 5);
    expect(out[1]).toBeCloseTo(0.5, 5);
    expect(out[2]).toBeCloseTo(1, 5);
  });

  it('0~1을 벗어난 값은 자름', () => {
    const lut = parseCube(cube(2, () => [1.5, -0.2, 0.5]));
    expect(Array.from(lut.data.subarray(0, 4))).toEqual([1, 0, 0.5, 1]);
  });

  it('기본 입력 범위 표기는 받아들임', () => {
    expect(
      parseCube(cube(2, (r, g, b) => [r, g, b], 'DOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n')).size,
    ).toBe(2);
  });

  it.each([
    ['크기 없음', 'TITLE "x"\n0 0 0'],
    ['1D LUT', 'LUT_1D_SIZE 4\n0 0 0'],
    ['크기 초과', 'LUT_3D_SIZE 66'],
    ['줄 수 부족', 'LUT_3D_SIZE 2\n0 0 0\n1 1 1'],
    ['다른 입력 범위', 'DOMAIN_MAX 2 2 2\nLUT_3D_SIZE 2'],
    ['숫자 아님', 'LUT_3D_SIZE 2\n0 0 x'],
  ])('%s면 오류', (_, text) => {
    expect(() => parseCube(text)).toThrow();
  });
});

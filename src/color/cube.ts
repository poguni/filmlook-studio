// .cube 3D LUT 읽기 (PRD P-05, 6.4). 데이터 순서는 r이 가장 빠르게 바뀌어 bakeLut과 같음
import type { Lut } from './lut';

export const CUBE_MIN_SIZE = 2;
export const CUBE_MAX_SIZE = 65;

export class CubeError extends Error {}

export function parseCube(text: string): Lut {
  let size = 0;
  const values: number[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [key, ...rest] = line.split(/\s+/);
    if (key === 'LUT_3D_SIZE') {
      size = Number(rest[0]);
    } else if (key === 'LUT_1D_SIZE') {
      throw new CubeError('1D LUT는 지원하지 않습니다');
    } else if (key === 'DOMAIN_MIN' || key === 'DOMAIN_MAX') {
      // 입력 범위가 0~1이 아닌 LUT는 셰이더 조회 좌표가 달라지므로 받지 않음
      const want = key === 'DOMAIN_MIN' ? 0 : 1;
      if (rest.map(Number).some((v) => v !== want))
        throw new CubeError('입력 범위가 0~1이 아닌 LUT는 지원하지 않습니다');
    } else if (/^[-+.\d]/.test(key)) {
      const nums = [key, ...rest].map(Number);
      if (nums.length !== 3 || nums.some((n) => !Number.isFinite(n)))
        throw new CubeError(`잘못된 데이터 줄: ${line}`);
      values.push(...nums);
    }
    // TITLE 등 다른 키워드는 무시
  }
  if (!Number.isInteger(size) || size < CUBE_MIN_SIZE || size > CUBE_MAX_SIZE)
    throw new CubeError('LUT_3D_SIZE가 없거나 지원 범위(2~65)를 벗어났습니다');
  const count = size ** 3;
  if (values.length !== count * 3)
    throw new CubeError(`데이터가 ${count}줄이어야 하는데 ${values.length / 3}줄입니다`);

  const data = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 3; k++) data[i * 4 + k] = Math.min(1, Math.max(0, values[i * 3 + k]));
    data[i * 4 + 3] = 1;
  }
  return { size, data };
}

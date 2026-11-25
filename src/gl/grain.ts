// 입자 크기 보정 (PRD E-05): 입자 한 칸을 사진의 긴 변에 비례하게 잡아
// 미리보기(긴 변 2048px)와 원본 해상도 저장 결과에서 입자가 같은 크기로 보이게 함
import type { GrainSize } from '../state/edit';
import type { GrainSettings } from './renderer';

/** 이 긴 변에서 ‘작게’ 입자가 1픽셀 */
export const GRAIN_REF_SIDE = 2048;
const BASE_CELL: Record<GrainSize, number> = { small: 1, large: 2.2 };

/**
 * @param imageLongSide 원본 사진의 긴 변(px)
 * @param targetLongSide 지금 그리는 대상(미리보기·저장)의 긴 변(px)
 */
export function grainSettings(
  grain: number,
  size: GrainSize,
  strength: number,
  imageLongSide: number,
  targetLongSide: number,
): GrainSettings {
  // 강도 0%면 입자도 넣지 않아 결과가 원본과 같음 (PRD E-02)
  const amount = strength === 0 ? 0 : grain / 100;
  const cellInImage = BASE_CELL[size] * Math.max(1, imageLongSide / GRAIN_REF_SIDE);
  return { amount, cell: cellInImage * (targetLongSide / imageLongSide) };
}

// 편집 상태 이름과 기본값은 design/DESIGN.md 3.3을 따름
import type { MonoFilter } from '../color/params';

export type PresetCode = 'ORIG' | 'P01' | 'V02' | 'A03' | 'C04' | 'N05' | 'E06' | 'M07' | 'U01';
export type MonoChoice = 'none' | MonoFilter;
export type GrainSize = 'small' | 'large';

export interface EditState {
  preset: PresetCode;
  strength: number; // 0~100
  compare: number; // 0~100, 0이면 사진 전체가 결과
  /** 입자 양 0~100. 프리셋을 고를 때마다 그 프리셋의 defaultGrain으로 바뀜 (PRD E-05) */
  grain: number;
  grainSize: GrainSize;
  /** 흑백 필터. preset이 M07일 때만 적용 (PRD E-08) */
  mono: MonoChoice;
}

export const DEFAULT_EDIT: EditState = {
  preset: 'ORIG',
  strength: 100,
  compare: 0,
  grain: 0,
  grainSize: 'small',
  mono: 'none',
};

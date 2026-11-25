// 편집 상태 이름과 기본값은 design/DESIGN.md 3.3을 따름
import type { MonoFilter } from '../color/params';
import type { JpegQuality } from '../io/save';

export type PresetCode = 'ORIG' | 'P01' | 'V02' | 'A03' | 'C04' | 'N05' | 'E06' | 'M07' | 'U01';
/** 불러온 .cube가 붙는 9번째 칸 (PRD P-05) */
export const USER_LUT = 'U01';
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
  /** 비네팅 양 0~100. 프리셋을 바꿔도 유지 (PRD E-06) */
  vignette: number;
  /** 저장 품질(%) (PRD S-05) */
  quality: JpegQuality;
}

export const DEFAULT_EDIT: EditState = {
  preset: 'ORIG',
  strength: 100,
  compare: 0,
  grain: 0,
  grainSize: 'small',
  mono: 'none',
  vignette: 0,
  quality: 92,
};

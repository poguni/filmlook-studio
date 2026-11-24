// 편집 상태 이름과 기본값은 design/DESIGN.md 3.3을 따름. M1은 preset·strength만 사용
export type PresetCode = 'ORIG' | 'P01' | 'V02' | 'A03' | 'C04' | 'N05' | 'E06' | 'M07' | 'U01';

export interface EditState {
  preset: PresetCode;
  strength: number; // 0~100
}

export const DEFAULT_EDIT: EditState = { preset: 'ORIG', strength: 100 };

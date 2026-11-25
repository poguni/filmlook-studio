// 마지막으로 쓴 편집 값을 브라우저에 기억 (PRD O-01). 사진과 비교 위치는 기억하지 않음
import { JPEG_QUALITIES } from '../io/save';
import { DEFAULT_EDIT, USER_LUT, type EditState, type PresetCode } from './edit';

export const EDIT_STORAGE_KEY = 'filmlook.edit';

const CODES: readonly string[] = ['ORIG', 'P01', 'V02', 'A03', 'C04', 'N05', 'E06', 'M07'];
const MONOS: readonly string[] = ['none', 'yellow', 'red', 'green'];

const percent = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 100 ? v : fallback;

/** 저장된 글을 편집 값으로 바꿈. 알 수 없는 값은 기본값으로 */
export function parseSavedEdit(raw: string | null): EditState {
  let v: Record<string, unknown>;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_EDIT;
    v = parsed as Record<string, unknown>;
  } catch {
    return DEFAULT_EDIT;
  }
  // 사용자 LUT는 파일을 다시 불러와야 하므로 원본 칸으로 돌아감 (입자도 원본 기본값 0)
  if (v.preset === USER_LUT) v = { ...v, preset: 'ORIG', grain: 0 };
  if (typeof v.preset !== 'string' || !CODES.includes(v.preset)) return DEFAULT_EDIT;
  return {
    preset: v.preset as PresetCode,
    strength: percent(v.strength, DEFAULT_EDIT.strength),
    compare: 0,
    grain: percent(v.grain, DEFAULT_EDIT.grain),
    grainSize: v.grainSize === 'large' ? 'large' : 'small',
    mono:
      typeof v.mono === 'string' && MONOS.includes(v.mono) ? (v.mono as EditState['mono']) : 'none',
    vignette: percent(v.vignette, DEFAULT_EDIT.vignette),
    quality: JPEG_QUALITIES.find((q) => q === v.quality) ?? DEFAULT_EDIT.quality,
  };
}

export function savedEdit(): EditState {
  try {
    return parseSavedEdit(localStorage.getItem(EDIT_STORAGE_KEY));
  } catch {
    return DEFAULT_EDIT;
  }
}

export function saveEdit({
  preset,
  strength,
  grain,
  grainSize,
  mono,
  vignette,
  quality,
}: EditState): void {
  try {
    localStorage.setItem(
      EDIT_STORAGE_KEY,
      JSON.stringify({ preset, strength, grain, grainSize, mono, vignette, quality }),
    );
  } catch {
    // 저장이 막혀도 이번 화면에서는 그대로 씀
  }
}

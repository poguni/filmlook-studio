import { describe, expect, it } from 'vitest';
import { DEFAULT_EDIT } from './edit';
import { parseSavedEdit } from './remember';

describe('parseSavedEdit (PRD O-01)', () => {
  it('저장한 프리셋·강도·입자·흑백 필터를 되살리고 비교 위치는 0', () => {
    const raw = JSON.stringify({
      preset: 'M07',
      strength: 40,
      grain: 60,
      grainSize: 'large',
      mono: 'red',
      compare: 70,
    });
    expect(parseSavedEdit(raw)).toEqual({
      preset: 'M07',
      strength: 40,
      compare: 0,
      grain: 60,
      grainSize: 'large',
      mono: 'red',
    });
  });

  it('없거나 깨진 값은 기본값', () => {
    expect(parseSavedEdit(null)).toBe(DEFAULT_EDIT);
    expect(parseSavedEdit('{not json')).toBe(DEFAULT_EDIT);
    expect(parseSavedEdit('"V02"')).toBe(DEFAULT_EDIT);
    expect(parseSavedEdit(JSON.stringify({ preset: 'X99' }))).toBe(DEFAULT_EDIT);
  });

  it('범위를 벗어난 숫자와 모르는 선택지는 그 항목만 기본값', () => {
    const raw = JSON.stringify({
      preset: 'V02',
      strength: 140,
      grain: -3,
      grainSize: 'huge',
      mono: 'blue',
    });
    expect(parseSavedEdit(raw)).toEqual({ ...DEFAULT_EDIT, preset: 'V02' });
  });

  it('사용자 LUT는 파일이 없으므로 원본으로 (입자 0)', () => {
    const raw = JSON.stringify({ preset: 'U01', strength: 80, grain: 30 });
    expect(parseSavedEdit(raw)).toEqual({ ...DEFAULT_EDIT, strength: 80 });
  });
});

// 프리셋 목록. M2는 V02·C04 2종, 나머지는 M3에서 추가 (PRD 10장)
import { parsePreset, type Preset } from '../color/params';
import C04 from './C04.json';
import V02 from './V02.json';

export const PRESETS: readonly Preset[] = [parsePreset(V02), parsePreset(C04)];

// 원본 칸의 표시 정보 (색 변환 없음)
export const ORIGINAL = { code: 'ORIG', name: '원본', subtitle: '보정 전 사진' } as const;

export function findPreset(code: string): Preset | undefined {
  return PRESETS.find((p) => p.code === code);
}

/** 프레임 번호: 원본은 00, 프리셋은 코드의 숫자(V02 → 02) */
export function frameNo(code: string): string {
  return code === ORIGINAL.code ? '00' : code.slice(1);
}

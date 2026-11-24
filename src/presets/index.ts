// 프리셋 목록. M1은 V02 1종, 나머지는 M2~M3에서 추가 (PRD 10장)
import { parsePreset, type Preset } from '../color/params';
import V02 from './V02.json';

export const PRESETS: readonly Preset[] = [parsePreset(V02)];

// 원본 칸의 표시 정보 (색 변환 없음)
export const ORIGINAL = { code: 'ORIG', name: '원본', subtitle: '보정 전 사진' } as const;

export function findPreset(code: string): Preset | undefined {
  return PRESETS.find((p) => p.code === code);
}

// 프리셋 7종 (PRD 5.2). 밀착 인화와 단축키 순서도 이 목록을 따름
import { parsePreset, type Preset } from '../color/params';
import A03 from './A03.json';
import C04 from './C04.json';
import E06 from './E06.json';
import M07 from './M07.json';
import N05 from './N05.json';
import P01 from './P01.json';
import V02 from './V02.json';

export const PRESETS: readonly Preset[] = [P01, V02, A03, C04, N05, E06, M07].map(parsePreset);

// 원본 칸의 표시 정보 (색 변환 없음)
export const ORIGINAL = { code: 'ORIG', name: '원본', subtitle: '보정 전 사진' } as const;

export function findPreset(code: string): Preset | undefined {
  return PRESETS.find((p) => p.code === code);
}

/** 프레임 번호: 원본은 00, 프리셋은 코드의 숫자(V02 → 02) */
export function frameNo(code: string): string {
  return code === ORIGINAL.code ? '00' : code.slice(1);
}

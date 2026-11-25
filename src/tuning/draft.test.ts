import { describe, expect, it } from 'vitest';
import { parsePreset } from '../color/params';
import { PRESETS } from '../presets';
import A03 from '../presets/A03.json';
import C04 from '../presets/C04.json';
import E06 from '../presets/E06.json';
import M07 from '../presets/M07.json';
import N05 from '../presets/N05.json';
import P01 from '../presets/P01.json';
import V02 from '../presets/V02.json';
import { draftToJson, normalize } from './draft';

describe('튜닝 화면 JSON (PRD 7장)', () => {
  it.each(Object.entries({ P01, V02, A03, C04, N05, E06, M07 }))(
    '%s: 불러와 그대로 내보내면 같은 프리셋',
    (_, json) => {
      expect(parsePreset(JSON.parse(draftToJson(normalize(json))))).toEqual(parsePreset(json));
    },
  );

  it('프리셋 7종이 순서대로 모두 있음 (PRD 5.2)', () => {
    expect(PRESETS.map((p) => p.code)).toEqual(['P01', 'V02', 'A03', 'C04', 'N05', 'E06', 'M07']);
    expect(PRESETS.find((p) => p.code === 'M07')?.defaultGrain).toBe(25);
  });
});

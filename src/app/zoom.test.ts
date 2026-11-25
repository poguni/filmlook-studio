import { describe, expect, it } from 'vitest';
import { clampCenter, zoomCenterAt, zoomRegion } from './zoom';

const full = { width: 6000, height: 4000 };
const view = { width: 1200, height: 800 };

describe('zoomRegion (PRD E-07)', () => {
  it('가운데를 화면 크기만큼 1:1로 자름', () => {
    expect(zoomRegion(full, view, { x: 0.5, y: 0.5 })).toEqual({
      sx: 2400,
      sy: 1600,
      sw: 1200,
      sh: 800,
    });
  });

  it('가장자리를 넘으면 사진 안쪽으로 밀어 넣음', () => {
    expect(zoomRegion(full, view, { x: 0, y: 1 })).toEqual({ sx: 0, sy: 3200, sw: 1200, sh: 800 });
    expect(zoomRegion(full, view, { x: 2, y: -1 })).toEqual({ sx: 4800, sy: 0, sw: 1200, sh: 800 });
  });

  it('원본이 화면보다 작으면 비율을 지켜 사진 전체', () => {
    expect(zoomRegion({ width: 900, height: 600 }, view, { x: 0.3, y: 0.7 })).toEqual({
      sx: 0,
      sy: 0,
      sw: 900,
      sh: 600,
    });
  });
});

describe('clampCenter · zoomCenterAt', () => {
  it('가장자리 밖의 가운데는 영역이 닿는 곳까지만', () => {
    expect(clampCenter(full, view, { x: -5, y: 0.5 })).toEqual({ x: 0.1, y: 0.5 });
  });

  it('누른 곳이 확대 후에도 같은 화면 위치에 남음', () => {
    const at = { x: 0.25, y: 0.75 };
    const c = zoomCenterAt(full, view, at);
    const r = zoomRegion(full, view, c);
    // 확대 후 화면의 at 위치에 놓이는 원본 픽셀 = 맞춤 화면에서 누른 원본 픽셀
    expect(r.sx + at.x * r.sw).toBeCloseTo(at.x * full.width, 0);
    expect(r.sy + at.y * r.sh).toBeCloseTo(at.y * full.height, 0);
  });
});

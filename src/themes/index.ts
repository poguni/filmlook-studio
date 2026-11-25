// 테마 목록 (PRD O-02). 순서는 메뉴와 단축키 T의 순서 (A 암실 → B 카메라 기어 → C 파스텔)
import { camera } from './camera';
import { darkroom } from './darkroom';
import type { ThemeKit, ThemeName } from './kit';
import { pastel } from './pastel';

export const THEMES: Record<ThemeName, ThemeKit> = { darkroom, camera, pastel };
export const THEME_ORDER: ThemeName[] = ['darkroom', 'camera', 'pastel'];
export const DEFAULT_THEME: ThemeName = 'camera';

/** index.html의 첫 화면 스크립트와 같은 키 (테마 깜빡임 방지) */
export const THEME_STORAGE_KEY = 'filmlook.theme';

const isTheme = (v: unknown): v is ThemeName => THEME_ORDER.includes(v as ThemeName);

/** 마지막으로 고른 테마 (PRD O-05). 저장소를 쓸 수 없으면 기본 테마 */
export function savedTheme(): ThemeName {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(theme: ThemeName): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 사생활 보호 모드 등에서 저장이 막혀도 이번 화면에서는 그대로 씀
  }
}

export function nextTheme(theme: ThemeName): ThemeName {
  return THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
}

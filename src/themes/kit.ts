// 테마 = 문구 + 장식 slot. 기능 컴포넌트는 테마 이름으로 분기하지 않고 이 키트만 씀 (design/DESIGN.md 11장)
import { createContext, useContext, type ComponentType } from 'react';
import type { MonoChoice } from '../state/edit';
import type { Copy } from './copy';

export interface PresetView {
  code: string;
  no: string;
  name: string;
  subtitle: string;
}

export interface ArtProps {
  preset: PresetView;
  strength: number;
  grain: number;
  /** 실제로 적용되는 흑백 필터 (흑백 프리셋이 아니면 none) */
  mono: MonoChoice;
  /** 저장 정보 문구 (상한에 걸리면 save.downscaled) */
  saveInfo: string;
}

export interface ThemeKit {
  copy: Copy;
  /** 헤더 왼쪽 로고 */
  Brand: ComponentType;
  /** 헤더 가운데 장식 (B: 프레임 카운터) */
  HeaderCenter?: ComponentType<{ preset: PresetView }>;
  /** 데스크톱 왼쪽 열 (B: 카메라·장전된 필름·값 요약) */
  Aside?: ComponentType<ArtProps>;
  /** 미리보기 사진 위 장식 (B: 브라이트 프레임 선, 기믹 격자선). 기믹은 html의 data-gimmick으로 보임 */
  PreviewOverlay?: ComponentType;
  /** 비교 경계선 손잡이 */
  CompareHandle: ComponentType;
  /** 미리보기 아래 프리셋 정보 줄 (B: LCD) */
  Caption: ComponentType<ArtProps>;
  /** 강도 슬라이더 위 그림 (B: 조리개) */
  StrengthArt?: ComponentType<{ strength: number }>;
  /** 밀착 인화 앞 장식 (B: 필름 통) */
  SheetLead?: ComponentType;
  /** 선택된 칸 표시 (B: LOADED) */
  FrameMark?: ComponentType;
  /** 기믹 토글 버튼 안의 그림 (B: 레버 스위치) */
  GimmickArt?: ComponentType<{ on: boolean }>;
  /** 흑백 필터 버튼 안의 견본 (B: 렌즈 필터 유리) */
  MonoSwatch?: ComponentType<{ filter: MonoChoice }>;
}

export const ThemeContext = createContext<ThemeKit | null>(null);

export function useTheme(): ThemeKit {
  const kit = useContext(ThemeContext);
  if (!kit) throw new Error('ThemeContext가 없습니다');
  return kit;
}

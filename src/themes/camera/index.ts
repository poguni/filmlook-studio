import type { ThemeKit } from '../kit';
import {
  ApertureArt,
  Brand,
  CameraAside,
  FilmCanister,
  FrameCounter,
  GlassSwatch,
  KnobHandle,
  LcdCaption,
  LeverSwitch,
  LoadedMark,
  ViewfinderOverlay,
} from './art';
import { copy } from './copy';
import './fonts';
import './tokens.css';
import './theme.css';

export const camera: ThemeKit = {
  copy,
  Brand,
  HeaderCenter: FrameCounter,
  Aside: CameraAside,
  PreviewOverlay: ViewfinderOverlay,
  CompareHandle: KnobHandle,
  Caption: LcdCaption,
  StrengthArt: ApertureArt,
  SheetLead: FilmCanister,
  FrameMark: LoadedMark,
  MonoSwatch: GlassSwatch,
  GimmickArt: LeverSwitch,
};

import type { ThemeKit } from '../kit';
import {
  Brand,
  Clothesline,
  ExposureTimer,
  GelSwatch,
  InUseSign,
  PaperCard,
  PencilCircle,
  SheetLead,
  TrayCaption,
  TrayHandle,
} from './art';
import { copy } from './copy';
import '../sheet-layout.css';
import './tokens.css';
import './theme.css';

export const darkroom: ThemeKit = {
  name: 'darkroom',
  copy,
  loadFonts: () => import('./fonts'),
  Brand,
  GimmickArt: InUseSign,
  PreviewLead: Clothesline,
  CompareHandle: TrayHandle,
  Caption: TrayCaption,
  StrengthArt: ExposureTimer,
  SheetLead,
  FrameMark: PencilCircle,
  MonoSwatch: GelSwatch,
  SaveCardArt: PaperCard,
};

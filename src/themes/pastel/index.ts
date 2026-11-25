import type { ThemeKit } from '../kit';
import {
  BearHandle,
  Brand,
  CandySwatch,
  HeartStamp,
  KnobSwitch,
  PolaroidCaption,
  PolaroidTapes,
  PrinterSlot,
  SheetLead,
  SoftScale,
  Sparkles,
} from './art';
import { copy } from './copy';
import '../sheet-layout.css';
import './tokens.css';
import './theme.css';

export const pastel: ThemeKit = {
  name: 'pastel',
  copy,
  loadFonts: () => import('./fonts'),
  Brand,
  GimmickArt: KnobSwitch,
  FrameDecor: PolaroidTapes,
  PreviewOverlay: Sparkles,
  CompareHandle: BearHandle,
  Caption: PolaroidCaption,
  StrengthArt: SoftScale,
  SheetLead,
  FrameMark: HeartStamp,
  MonoSwatch: CandySwatch,
  SaveCardArt: PrinterSlot,
};

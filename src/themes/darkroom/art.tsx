// A 암실 테마 장식. 시안 색감사진관-시안A-darkroom.html의 SVG를 토큰 색으로 옮김
import type { MonoChoice } from '../../state/edit';
import type { ArtProps } from '../kit';
import { artCopy, copy } from './copy';

const v = (name: string) => `var(--${name})`;

export function Brand() {
  return (
    <div className="dr-brand">
      {/* 안전등: 빛이 3.6초 주기로 은은하게 숨 쉼 (pulse) */}
      <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
        <circle
          className="dr-lamp-glow"
          cx="23"
          cy="27"
          r="21"
          fill={v('color-accent')}
          opacity=".25"
        />
        <rect x="19" y="2" width="8" height="8" rx="2" fill={v('art-lamp-cap')} />
        <path d="M9 22 Q23 6 37 22 Z" fill={v('art-lamp-shade')} stroke={v('art-lamp-rim')} />
        <ellipse cx="23" cy="24" rx="14" ry="6" fill={v('color-accent')} />
      </svg>
      <div>
        <div className="dr-logo">{artCopy.appName}</div>
        <div className="dr-logo-sub">{artCopy.appSub}</div>
      </div>
    </div>
  );
}

/** 기믹 버튼 안: ‘IN USE’ 표시등 */
export function InUseSign() {
  return (
    <span className="dr-inuse" aria-hidden="true">
      <span className="dr-inuse-dot" />
      <span className="dr-inuse-text">{artCopy.inUse}</span>
    </span>
  );
}

export function SheetLead() {
  return (
    <div className="dr-sheet-lead">
      <div className="dr-sheet-title">
        <h2>{artCopy.sheetTitle}</h2>
        <span aria-hidden="true">{artCopy.sheetEyebrow}</span>
      </div>
      <p>{artCopy.sheetHint}</p>
      <span className="dr-film-edge" aria-hidden="true">
        {artCopy.filmEdge}
      </span>
    </div>
  );
}

/** 선택 표시: 손으로 그린 듯한 그리스 펜슬 동그라미 */
export function PencilCircle() {
  return (
    <svg className="dr-pencil" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">
      <path d="M10 34 C8 12 40 4 64 6 C88 8 97 24 94 40 C91 60 64 67 42 65 C18 63 4 50 9 30 C12 20 22 13 32 10" />
    </svg>
  );
}

/** 빨랫줄에 집게로 걸린 작은 인화지 4장 (천천히 흔들림) */
export function Clothesline() {
  return (
    <div className="dr-line" aria-hidden="true">
      <svg viewBox="0 0 1000 30" preserveAspectRatio="none">
        <path d="M0 4 Q500 26 1000 4" />
      </svg>
      <div className="dr-prints">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`dr-print dr-print-${i}`}>
            <span className="dr-peg" />
            <span className="dr-paper" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrayHandle() {
  return (
    <span className="dr-handle">
      <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden="true">
        <path d="M7 1 L2 6 L7 11 M15 1 L20 6 L15 11" />
      </svg>
    </span>
  );
}

export function TrayCaption({ preset, step }: ArtProps) {
  return (
    <div className="dr-caption">
      <div className="dr-caption-row">
        <div className="dr-caption-name">
          №{preset.no} {preset.name} <span>{preset.subtitle}</span>
        </div>
        <div className="dr-caption-hint">{copy['compare.hint']}</div>
      </div>
      <ol className="dr-steps" aria-label={artCopy.stepsLabel}>
        {artCopy.steps.map(([tray, text], i) => (
          <li key={tray} aria-current={step === i + 1 ? 'step' : undefined}>
            <div className="dr-step-tray">{tray}</div>
            <div>{text}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 노광 타이머: 검은 창에 큰 숫자가 붉게 빛남 */
export function ExposureTimer({ strength }: { strength: number }) {
  return (
    <div className="dr-timer-wrap" aria-hidden="true">
      <div className="dr-timer">
        <span className="dr-timer-value">{strength}</span>
        <span className="dr-timer-unit">%</span>
      </div>
      <div className="dr-timer-scale">
        {artCopy.timerScale.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  );
}

/** 흑백 필터 젤 조각. 없음은 점선 테두리 */
export function GelSwatch({ filter }: { filter: MonoChoice }) {
  return <span className={`dr-gel dr-gel-${filter}`} aria-hidden="true" />;
}

export function PaperCard() {
  return <div className="dr-paper-title">{artCopy.paper}</div>;
}

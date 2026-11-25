// C 파스텔 사진관 테마 장식. 시안 색감사진관-시안C-pastel.html의 SVG를 토큰 색으로 옮김
import type { MonoChoice } from '../../state/edit';
import type { ArtProps } from '../kit';
import { artCopy, copy } from './copy';

const v = (name: string) => `var(--${name})`;
const line = v('color-line');

export function Brand() {
  return (
    <div className="pa-brand">
      {/* 얼굴이 있는 장난감 카메라 */}
      <svg className="pa-camera" width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
        <rect
          x="10"
          y="4"
          width="20"
          height="10"
          rx="4"
          fill={v('art-cap')}
          stroke={line}
          strokeWidth="3"
        />
        <rect
          x="3"
          y="11"
          width="68"
          height="48"
          rx="14"
          fill={v('pastel-pink')}
          stroke={line}
          strokeWidth="3"
        />
        <circle cx="37" cy="35" r="16" fill={v('color-surface')} stroke={line} strokeWidth="3" />
        <circle cx="37" cy="35" r="8" fill={v('art-lens')} stroke={line} strokeWidth="2.5" />
        <circle cx="34" cy="32" r="2.5" fill={v('color-surface')} />
        <circle cx="14" cy="24" r="2.5" fill={line} />
        <circle cx="60" cy="24" r="2.5" fill={line} />
        <circle cx="12" cy="31" r="3.5" fill={v('art-cheek')} />
        <circle cx="62" cy="31" r="3.5" fill={v('art-cheek')} />
      </svg>
      <div>
        <div className="pa-logo">{artCopy.appName}</div>
        <div className="pa-logo-sub">{artCopy.appSub}</div>
      </div>
      <div className="pa-bubble" aria-hidden="true">
        {artCopy.bubble}
      </div>
    </div>
  );
}

/** 기믹 버튼 안: 동그란 손잡이 스위치 */
export function KnobSwitch({ on }: { on: boolean }) {
  return (
    <span className={`pa-switch${on ? ' is-on' : ''}`} aria-hidden="true">
      <span className="pa-switch-knob" />
    </span>
  );
}

export function SheetLead() {
  return (
    <div className="pa-sheet-lead">
      <span className="pa-tape pa-tape-sheet" aria-hidden="true" />
      <h2>{artCopy.sheetTitle}</h2>
      <p>{artCopy.sheetHint}</p>
    </div>
  );
}

/** 선택 표시: 오른쪽 위 하트 도장 */
export function HeartStamp() {
  return (
    <svg className="pa-heart" width="30" height="28" viewBox="0 0 30 28" aria-hidden="true">
      <path
        d="M15 26 C4 18 1 12 2 8 C3 3 9 1 15 7 C21 1 27 3 28 8 C29 12 26 18 15 26 Z"
        fill={v('color-accent')}
        stroke={line}
        strokeWidth="2.2"
      />
    </svg>
  );
}

/** 폴라로이드 양쪽 위 모서리의 마스킹 테이프와 그 위를 떠다니는 웃는 구름 (floaty) */
export function PolaroidTapes() {
  return (
    <>
      <span className="pa-tape pa-tape-left" aria-hidden="true" />
      <span className="pa-tape pa-tape-right" aria-hidden="true" />
      <svg className="pa-cloud" width="150" height="70" viewBox="0 0 150 70" aria-hidden="true">
        <path
          d="M30 60 Q8 60 10 42 Q12 26 32 28 Q36 8 62 10 Q84 4 94 24 Q120 18 128 38 Q146 44 136 60 Z"
          fill={v('color-surface')}
          stroke={line}
          strokeWidth="2.5"
        />
        <circle cx="60" cy="40" r="2.5" fill={line} />
        <circle cx="84" cy="40" r="2.5" fill={line} />
        <path
          d="M66 47 Q72 52 78 47"
          fill="none"
          stroke={line}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="52" cy="47" r="4" fill={v('pastel-pink')} />
        <circle cx="92" cy="47" r="4" fill={v('pastel-pink')} />
      </svg>
    </>
  );
}

const SPARKLE = 'M20 2 C22 14 26 18 38 20 C26 22 22 26 20 38 C18 26 14 22 2 20 C14 18 18 14 20 2 Z';

/** 기믹: 사진 위 별 모양 반짝이 3개 (저장 결과에는 들어가지 않음) */
export function Sparkles() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <svg
          key={i}
          className={`pa-sparkle pa-sparkle-${i}`}
          viewBox="0 0 40 40"
          aria-hidden="true"
        >
          <path d={SPARKLE} fill={v(`art-sparkle-${i}`)} stroke={line} strokeWidth="2" />
        </svg>
      ))}
    </>
  );
}

/** 비교 손잡이: 곰돌이 얼굴 */
export function BearHandle() {
  return (
    <svg className="pa-bear" width="62" height="56" viewBox="0 0 62 56" aria-hidden="true">
      <circle cx="13" cy="13" r="10" fill={v('art-bear-ear')} stroke={line} strokeWidth="2.5" />
      <circle cx="49" cy="13" r="10" fill={v('art-bear-ear')} stroke={line} strokeWidth="2.5" />
      <circle cx="31" cy="31" r="23" fill={v('art-bear')} stroke={line} strokeWidth="2.5" />
      <circle cx="23" cy="28" r="2.6" fill={line} />
      <circle cx="39" cy="28" r="2.6" fill={line} />
      <ellipse
        cx="31"
        cy="37"
        rx="6"
        ry="4.5"
        fill={v('art-bear-muzzle')}
        stroke={line}
        strokeWidth="2"
      />
      <circle cx="31" cy="35.5" r="1.8" fill={line} />
      <circle cx="16" cy="36" r="3.5" fill={v('art-blush')} />
      <circle cx="46" cy="36" r="3.5" fill={v('art-blush')} />
    </svg>
  );
}

/** 폴라로이드 아래 여백에 손글씨풍 프리셋 이름 */
export function PolaroidCaption({ preset }: ArtProps) {
  return (
    <div className="pa-caption">
      <div>
        <div className="pa-caption-name">{preset.name}</div>
        <div className="pa-caption-sub">
          {preset.code} · {preset.subtitle}
        </div>
      </div>
      <div className="pa-caption-hint">{copy['compare.hint']}</div>
    </div>
  );
}

/** 강도 눈금 문구: 살짝·적당히·듬뿍 (슬라이더 아래로 감) */
export function SoftScale() {
  return (
    <div className="pa-scale" aria-hidden="true">
      {artCopy.scale.map((s) => (
        <span key={s}>{s}</span>
      ))}
    </div>
  );
}

/** 흑백 필터: 사탕 모양 둥근 견본 */
export function CandySwatch({ filter }: { filter: MonoChoice }) {
  return <span className={`pa-candy pa-candy-${filter}`} aria-hidden="true" />;
}

/** 저장 카드: 사진 3장이 고개를 내민 인화기 출구 */
export function PrinterSlot() {
  return (
    <div className="pa-printer" aria-hidden="true">
      <div className="pa-printer-slot" />
      <div className="pa-printer-photos">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

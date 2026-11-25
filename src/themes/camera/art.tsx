// B 카메라 기어 테마 장식. 시안 색감사진관-시안B-camera.html의 SVG를 토큰 색으로 옮김
import type { MonoChoice } from '../../state/edit';
import type { ArtProps, PresetView } from '../kit';
import { artCopy, copy } from './copy';

const v = (name: string) => `var(--${name})`;

export function Brand() {
  return (
    <div className="cam-brand">
      <svg className="cam-knob" width="58" height="58" viewBox="0 0 58 58" aria-hidden="true">
        <circle cx="29" cy="29" r="27" fill={v('art-knob')} />
        <circle
          cx="29"
          cy="29"
          r="21"
          fill={v('art-knob-ring')}
          stroke={v('art-shade-4')}
          strokeDasharray="2 2"
        />
        <circle cx="29" cy="29" r="9" fill={v('art-plate')} />
        <path d="M29 22 L29 36 M22 29 L36 29" stroke={v('art-shade-4')} strokeWidth="2" />
      </svg>
      <div>
        <div className="cam-logo">{artCopy.appName}</div>
        <div className="cam-logo-sub">
          {artCopy.appNameKo} <span className="cam-model">{artCopy.model}</span>
        </div>
      </div>
    </div>
  );
}

export function FrameCounter({ preset }: { preset: PresetView }) {
  return (
    <div className="cam-counter" aria-hidden="true">
      <span className="cam-counter-dial">{preset.no}</span>
      <span className="cam-counter-label">{artCopy.frameCounter}</span>
    </div>
  );
}

function CameraIllustration() {
  return (
    <svg className="cam-illust" viewBox="0 0 280 180" role="img" aria-label={artCopy.cameraLabel}>
      <rect
        x="10"
        y="40"
        width="260"
        height="120"
        rx="14"
        fill={v('art-body')}
        stroke={v('art-shade-1')}
        strokeWidth="2"
      />
      <rect x="10" y="40" width="260" height="34" rx="10" fill={v('art-plate')} />
      <rect x="10" y="64" width="260" height="10" fill={v('art-plate')} />
      <rect x="34" y="22" width="40" height="20" rx="4" fill={v('art-plate-dark')} />
      <rect x="196" y="26" width="44" height="16" rx="3" fill={v('art-plate-dark')} />
      <circle cx="218" cy="22" r="7" fill={v('color-accent')} />
      <rect
        x="28"
        y="48"
        width="38"
        height="18"
        rx="3"
        fill={v('art-window')}
        stroke={v('art-shade-2')}
        strokeWidth="2"
      />
      <rect
        x="200"
        y="48"
        width="44"
        height="18"
        rx="3"
        fill={v('art-window')}
        stroke={v('art-shade-2')}
        strokeWidth="2"
      />
      <circle
        cx="140"
        cy="118"
        r="54"
        fill={v('art-lens')}
        stroke={v('art-lens-ring')}
        strokeWidth="4"
      />
      <circle
        cx="140"
        cy="118"
        r="44"
        fill={v('art-shade-2')}
        stroke={v('art-shade-3')}
        strokeWidth="2"
        strokeDasharray="3 3"
      />
      <circle cx="140" cy="118" r="30" fill={v('art-lens-deep')} />
      <circle cx="140" cy="118" r="18" fill={v('art-lens-glass')} />
      <ellipse cx="130" cy="108" rx="9" ry="6" fill={v('art-shine')} opacity=".35" />
      <text x="140" y="60" textAnchor="middle" className="cam-illust-text">
        FS-01
      </text>
    </svg>
  );
}

function CanisterIcon({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 64 84" aria-hidden="true">
      <rect x="24" y="0" width="16" height="10" rx="2" fill={v('art-cap')} />
      <rect x="6" y="8" width="52" height="70" rx="8" fill={v('art-canister')} />
      <rect x="6" y="30" width="52" height="26" fill={v('plate-ink')} />
      <rect x="24" y="76" width="16" height="8" rx="2" fill={v('art-cap')} />
      <rect x="58" y="22" width="6" height="40" fill={v('film-base')} />
    </svg>
  );
}

export function CameraAside({ preset, strength, grain, mono, saveInfo }: ArtProps) {
  return (
    <aside className="cam-aside" aria-label={artCopy.asideLabel}>
      <CameraIllustration />
      <div className="cam-card cam-loaded">
        <CanisterIcon width={64} height={84} />
        <div className="cam-loaded-text">
          <div className="cam-eyebrow">{artCopy.loadedFilm}</div>
          <div className="cam-loaded-code">{preset.code}</div>
          <div className="cam-loaded-name">{preset.name}</div>
          <div className="cam-loaded-sub">{preset.subtitle}</div>
        </div>
      </div>
      <dl className="cam-card cam-summary">
        <dt>{artCopy.summaryStrength}</dt>
        <dd className="cam-mono">{strength}%</dd>
        <dt>{artCopy.summaryGrain}</dt>
        <dd className="cam-mono">{grain}</dd>
        <dt>{artCopy.summaryFilter}</dt>
        <dd>{copy[`mono.${mono}`]}</dd>
        <dt>{artCopy.summarySave}</dt>
        <dd>{saveInfo}</dd>
      </dl>
    </aside>
  );
}

export function ViewfinderOverlay() {
  return (
    <>
      <svg
        className="cam-brightlines"
        viewBox="0 0 300 200"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M14 34 L14 14 L34 14 M266 14 L286 14 L286 34 M286 166 L286 186 L266 186 M34 186 L14 186 L14 166" />
        {/* 기믹: 3분할 격자선 (design/DESIGN.md 7.2) */}
        <path
          className="cam-grid"
          d="M100 0 L100 200 M200 0 L200 200 M0 66.6 L300 66.6 M0 133.3 L300 133.3"
        />
      </svg>
      <div className="cam-patch" aria-hidden="true" />
    </>
  );
}

export function KnobHandle() {
  return (
    <span className="cam-handle">
      <svg width="20" height="12" viewBox="0 0 22 12" aria-hidden="true">
        <path d="M7 1 L2 6 L7 11 M15 1 L20 6 L15 11" />
      </svg>
    </span>
  );
}

export function LcdCaption({ preset, strength, grain, mono }: ArtProps) {
  return (
    <div className="cam-lcd">
      <span>
        {preset.code} {preset.name}
      </span>
      <span>
        STR {strength} · GRN {grain} · FLT {copy[`mono.${mono}`]}
      </span>
      <span className="cam-lcd-hint">{copy['compare.hint']}</span>
    </div>
  );
}

export function ApertureArt({ strength }: { strength: number }) {
  // 강도가 높을수록 조리개가 열림 (design/DESIGN.md 7.2)
  const scale = 0.2 + 0.75 * (strength / 100);
  return (
    <div className="cam-aperture" aria-hidden="true">
      <div className="cam-aperture-ring">
        <div className="cam-aperture-well">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill={v('art-shade-blade')} />
            <g className="cam-aperture-blades" style={{ transform: `scale(${scale})` }}>
              <polygon points="50,2 91,26 91,74 50,98 9,74 9,26" fill={v('art-lens-glass')} />
              <circle cx="40" cy="38" r="10" fill={v('art-shine')} opacity=".25" />
            </g>
          </svg>
        </div>
      </div>
      <div className="cam-fstops">
        {artCopy.fStops.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>
    </div>
  );
}

export function FilmCanister() {
  return (
    <svg className="cam-canister" width="86" height="150" viewBox="0 0 86 150" aria-hidden="true">
      <rect x="30" y="0" width="22" height="14" rx="3" fill={v('art-cap')} />
      <rect x="6" y="12" width="70" height="126" rx="10" fill={v('art-canister')} />
      <rect x="6" y="50" width="70" height="48" fill={v('plate-ink')} />
      <text x="41" y="80" textAnchor="middle" className="cam-canister-text">
        {artCopy.canister}
      </text>
      <rect x="30" y="136" width="22" height="14" rx="3" fill={v('art-cap')} />
      <rect x="76" y="36" width="10" height="78" fill={v('film-base')} />
    </svg>
  );
}

export function LoadedMark() {
  return (
    <span className="cam-loaded-tag" aria-hidden="true">
      {artCopy.loaded}
    </span>
  );
}

/** 렌즈 필터 유리. 없음은 투명 유리 (design/DESIGN.md 7.2) */
export function GlassSwatch({ filter }: { filter: MonoChoice }) {
  return (
    <span className={`cam-glass cam-glass-${filter}`} aria-hidden="true">
      {filter === 'none' ? copy['mono.none'] : artCopy.glass[filter]}
    </span>
  );
}

/** 기믹 레버 스위치. 켜면 손잡이가 오른쪽으로 (애니메이션 `lever`) */
export function LeverSwitch({ on }: { on: boolean }) {
  return (
    <span className={`cam-lever${on ? ' is-on' : ''}`} aria-hidden="true">
      <span className="cam-lever-knob" />
    </span>
  );
}

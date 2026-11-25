import { MONO_FILTERS } from '../color/params';
import type { GrainSize, MonoChoice } from '../state/edit';
import { useTheme } from '../themes/kit';

interface Props {
  strength: number;
  onStrength: (value: number) => void;
  grain: number;
  onGrain: (value: number) => void;
  grainSize: GrainSize;
  onGrainSize: (value: GrainSize) => void;
  mono: MonoChoice;
  /** 흑백 프리셋(M07)을 골랐을 때만 흑백 필터를 고를 수 있음 (PRD E-08) */
  monoEnabled: boolean;
  onMono: (value: MonoChoice) => void;
}

const MONO_CHOICES: MonoChoice[] = ['none', ...MONO_FILTERS];
const GRAIN_SIZES: GrainSize[] = ['small', 'large'];

// 저장 카드(A·C 테마)는 M5에서 추가
export function ControlPanel(p: Props) {
  const { copy, StrengthArt, MonoSwatch } = useTheme();
  return (
    <section className="controls">
      <div className="control-card">
        <div className="control-head">
          <label htmlFor="strength">{copy.strength}</label>
          <output htmlFor="strength" className="control-value">
            {p.strength}%
          </output>
        </div>
        {StrengthArt && <StrengthArt strength={p.strength} />}
        <input
          id="strength"
          type="range"
          // 화면 읽기 프로그램에는 테마 장식 없이 한국어 기본 이름만 (design/DESIGN.md 5장)
          aria-label={copy['strength.name']}
          min={0}
          max={100}
          value={p.strength}
          onChange={(e) => p.onStrength(Number(e.target.value))}
        />
      </div>

      <div className="control-card">
        <div className="control-head">
          <label htmlFor="grain">{copy.grain}</label>
          <output htmlFor="grain" className="control-value">
            {p.grain}
          </output>
        </div>
        <input
          id="grain"
          type="range"
          aria-label={copy['grain.name']}
          min={0}
          max={100}
          value={p.grain}
          onChange={(e) => p.onGrain(Number(e.target.value))}
        />
        <div className="segmented" role="group" aria-label={copy['grain.size']}>
          {GRAIN_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={p.grainSize === size}
              onClick={() => p.onGrainSize(size)}
            >
              {copy[`grain.${size}`]}
            </button>
          ))}
        </div>
      </div>

      <fieldset
        className="control-card mono"
        disabled={!p.monoEnabled}
        aria-disabled={!p.monoEnabled}
      >
        <legend className="control-head">
          <span>{copy['mono.title']}</span>
          {!p.monoEnabled && <span className="control-note">{copy['mono.disabled']}</span>}
        </legend>
        <div className="mono-choices">
          {MONO_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              className="mono-choice"
              aria-pressed={p.mono === choice}
              onClick={() => p.onMono(choice)}
            >
              {MonoSwatch && <MonoSwatch filter={choice} />}
              <span className="mono-name">{copy[`mono.${choice}`]}</span>
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

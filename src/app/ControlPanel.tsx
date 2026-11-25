import { MONO_FILTERS } from '../color/params';
import { JPEG_QUALITIES, type JpegQuality } from '../io/save';
import type { GrainSize, MonoChoice } from '../state/edit';
import { fill } from '../themes/copy';
import { useTheme } from '../themes/kit';
import { StarIcon } from './StarIcon';

interface Props {
  /** 고른 칸에 별표가 달려 있는지 (PRD C-05). 사진이 없으면 누를 수 없음 */
  starred: boolean;
  canStar: boolean;
  onStar: () => void;
  strength: number;
  onStrength: (value: number) => void;
  grain: number;
  onGrain: (value: number) => void;
  grainSize: GrainSize;
  onGrainSize: (value: GrainSize) => void;
  /** 비네팅 양 0~100 (PRD E-06) */
  vignette: number;
  onVignette: (value: number) => void;
  /** 저장 품질 (PRD S-05) */
  quality: JpegQuality;
  onQuality: (value: JpegQuality) => void;
  mono: MonoChoice;
  /** 흑백 프리셋(M07)을 골랐을 때만 흑백 필터를 고를 수 있음 (PRD E-08) */
  monoEnabled: boolean;
  onMono: (value: MonoChoice) => void;
  /** 저장 카드 (테마에 SaveCardArt가 있을 때만). 헤더 저장 버튼과 같은 동작 */
  saveInfo: string;
  saveLabel: string;
  canSave: boolean;
  onSave: () => void;
}

const MONO_CHOICES: MonoChoice[] = ['none', ...MONO_FILTERS];
const GRAIN_SIZES: GrainSize[] = ['small', 'large'];

export function ControlPanel(p: Props) {
  const { copy, StrengthArt, MonoSwatch, SaveCardArt } = useTheme();
  return (
    <section className="controls">
      <button
        type="button"
        className="star-toggle"
        aria-pressed={p.starred}
        disabled={!p.canStar}
        onClick={p.onStar}
      >
        <StarIcon filled={p.starred} />
        <span>{copy['star.toggle']}</span>
      </button>

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

      <div className="control-card">
        <div className="control-head">
          <label htmlFor="vignette">{copy.vignette}</label>
          <output htmlFor="vignette" className="control-value">
            {p.vignette}
          </output>
        </div>
        <input
          id="vignette"
          type="range"
          aria-label={copy['vignette.name']}
          min={0}
          max={100}
          value={p.vignette}
          onChange={(e) => p.onVignette(Number(e.target.value))}
        />
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

      <div className="control-card">
        <div className="control-head">
          <span id="quality-title" className="control-title">
            {copy['quality.title']}
          </span>
        </div>
        <div className="segmented" role="group" aria-labelledby="quality-title">
          {JPEG_QUALITIES.map((q) => (
            <button
              key={q}
              type="button"
              aria-pressed={p.quality === q}
              onClick={() => p.onQuality(q)}
            >
              {fill(copy['quality.option'], { q })}
            </button>
          ))}
        </div>
      </div>

      {SaveCardArt && (
        <div className="control-card save-card">
          <SaveCardArt />
          <p className="save-card-info">{p.saveInfo}</p>
          <button
            type="button"
            className="save-card-button"
            disabled={!p.canSave}
            onClick={p.onSave}
          >
            {p.saveLabel}
          </button>
        </div>
      )}
    </section>
  );
}

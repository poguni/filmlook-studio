import { useTheme } from '../themes/kit';

interface Props {
  strength: number;
  onStrength: (value: number) => void;
}

// 입자·흑백 필터(M3)와 저장 카드(A·C 테마, M5)는 이후 단계에서 추가
export function ControlPanel({ strength, onStrength }: Props) {
  const { copy, StrengthArt } = useTheme();
  return (
    <section className="controls">
      <div className="control-card">
        <div className="control-head">
          <label htmlFor="strength">{copy.strength}</label>
          <output htmlFor="strength" className="control-value">
            {strength}%
          </output>
        </div>
        {StrengthArt && <StrengthArt strength={strength} />}
        <input
          id="strength"
          type="range"
          // 화면 읽기 프로그램에는 테마 장식 없이 한국어 기본 이름만 (design/DESIGN.md 5장)
          aria-label={copy['strength.name']}
          min={0}
          max={100}
          value={strength}
          onChange={(e) => onStrength(Number(e.target.value))}
        />
      </div>
    </section>
  );
}

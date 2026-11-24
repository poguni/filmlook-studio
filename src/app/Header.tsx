import { fill } from '../themes/copy';
import { useTheme, type ArtProps } from '../themes/kit';

interface Props extends ArtProps {
  canOpen: boolean;
  canSave: boolean;
  /** 저장 중이면 진행률(0~100), 아니면 null */
  saving: number | null;
  onOpen: () => void;
  onSave: () => void;
}

export function Header({ preset, strength, canOpen, canSave, saving, onOpen, onSave }: Props) {
  const { copy, Brand, HeaderCenter } = useTheme();
  const saveText = saving === null ? copy.save : fill(copy['save.progress'], { n: saving });
  return (
    <header className="app-header">
      <Brand />
      {HeaderCenter && <HeaderCenter preset={preset} strength={strength} />}
      {/* 스마트폰에서는 화면 아래에 고정되는 동작 줄 (design/DESIGN.md 3.2) */}
      <div className="app-actions">
        <button type="button" className="btn-open" onClick={onOpen} disabled={!canOpen}>
          {copy.open}
        </button>
        <button
          type="button"
          className="btn-save"
          onClick={onSave}
          disabled={!canSave}
          aria-busy={saving !== null}
        >
          <span className="btn-save-label" aria-live="polite">
            {saveText}
          </span>
          <span className="btn-save-shutter" aria-hidden="true" />
        </button>
        <span className="app-save-info">{copy['save.info']}</span>
      </div>
    </header>
  );
}

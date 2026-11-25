import { fill } from '../themes/copy';
import { useTheme, type PresetView } from '../themes/kit';

interface Props {
  preset: PresetView;
  saveInfo: string;
  canOpen: boolean;
  canSave: boolean;
  /** 저장 중이면 진행률(0~100), 아니면 null */
  saving: number | null;
  /** 저장이 끝나 공유를 기다리는 중 (PRD S-04) */
  shareReady: boolean;
  gimmick: boolean;
  onGimmick: () => void;
  onInfo: () => void;
  onOpen: () => void;
  onSave: () => void;
}

export function Header(p: Props) {
  const { copy, Brand, HeaderCenter, GimmickArt } = useTheme();
  const saveText =
    p.saving !== null
      ? fill(copy['save.progress'], { n: p.saving })
      : p.shareReady
        ? copy.share
        : copy.save;
  return (
    <header className="app-header">
      <Brand />
      <div className="app-tools">
        {HeaderCenter && <HeaderCenter preset={p.preset} />}
        {/* 기믹은 화면 분위기만 바꾸고 저장 결과에는 영향 없음 (PRD O-04) */}
        <button
          type="button"
          className="btn-gimmick"
          aria-pressed={p.gimmick}
          aria-label={copy['gimmick.label']}
          onClick={p.onGimmick}
        >
          {GimmickArt && <GimmickArt on={p.gimmick} />}
          <span className="btn-gimmick-text" aria-hidden="true">
            {p.gimmick ? copy['gimmick.on'] : copy['gimmick.off']}
          </span>
        </button>
        <button
          type="button"
          className="btn-info"
          aria-label={copy['info.open']}
          onClick={p.onInfo}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 11 L12 17 M12 7.5 L12 7.6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {/* 스마트폰에서는 화면 아래에 고정되는 동작 줄 (design/DESIGN.md 3.2) */}
      <div className="app-actions">
        <button type="button" className="btn-open" onClick={p.onOpen} disabled={!p.canOpen}>
          {copy.open}
        </button>
        <button
          type="button"
          className="btn-save"
          onClick={p.onSave}
          disabled={!p.canSave}
          aria-busy={p.saving !== null}
        >
          <span className="btn-save-label" aria-live="polite">
            {saveText}
          </span>
          <span className="btn-save-shutter" aria-hidden="true" />
        </button>
        <span className="app-save-info">{p.saveInfo}</span>
      </div>
    </header>
  );
}

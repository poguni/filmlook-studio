import type { KeyboardEvent, RefObject } from 'react';
import { fill } from '../themes/copy';
import { useTheme, type ArtProps } from '../themes/kit';

interface Props extends ArtProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  hasPhoto: boolean;
  /** 사진 비율 (너비/높이). 사진이 없으면 3:2 */
  aspect: number;
  compare: number;
  onCompare: (value: number) => void;
}

export const COMPARE_STEP = 5;

export function Preview({
  canvasRef,
  hasPhoto,
  aspect,
  compare,
  onCompare,
  preset,
  strength,
}: Props) {
  const { copy, PreviewOverlay, CompareHandle, Caption } = useTheme();

  // 방향키는 5%씩 (design/DESIGN.md 6.2). 끌기는 1% 단위로 부드럽게
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    onCompare(Math.min(100, Math.max(0, compare + dir * COMPARE_STEP)));
  };

  return (
    <section className="preview">
      <div className="preview-frame">
        <div className="preview-photo">
          {/* 사진 비율을 지키며 3:2 상자 안에 들어가는 실제 사진 영역 */}
          {/* 캔버스는 렌더러가 붙어 있어 항상 남겨 두고, 사진이 없으면 영역째 숨김 */}
          <div
            className="preview-fit"
            hidden={!hasPhoto}
            style={{
              aspectRatio: String(aspect),
              // 상자(cq 단위) 안에 들어가는 가장 큰 크기: 가로가 넘치면 가로에, 아니면 세로에 맞춤
              width: `min(100cqw, calc(100cqh * ${aspect}))`,
            }}
          >
            <canvas ref={canvasRef} className="preview-canvas" />
            {hasPhoto && (
              <>
                {PreviewOverlay && <PreviewOverlay />}
                <div className="compare-line" style={{ left: `${compare}%` }} aria-hidden="true" />
                {/* 경계선이 끝에 있어도 손잡이는 사진 안쪽에 머물게 함 (design/DESIGN.md 6.2) */}
                <span
                  className="compare-handle"
                  style={{
                    left: `clamp(var(--handle-half), ${compare}%, calc(100% - var(--handle-half)))`,
                  }}
                  aria-hidden="true"
                >
                  <CompareHandle />
                </span>
                <span className="compare-tag compare-tag-left">{copy['compare.left']}</span>
                <span className="compare-tag compare-tag-right">
                  {fill(copy['compare.right'], { code: preset.code, strength, name: preset.name })}
                </span>
                <input
                  type="range"
                  className="compare-input"
                  min={0}
                  max={100}
                  step={1}
                  value={compare}
                  aria-label={copy['compare.label']}
                  aria-valuetext={`${compare}%`}
                  onChange={(e) => onCompare(Number(e.target.value))}
                  onKeyDown={onKeyDown}
                />
              </>
            )}
          </div>
          {!hasPhoto && <p className="preview-hint">{copy['drop.hint']}</p>}
        </div>
      </div>
      <Caption preset={preset} strength={strength} />
    </section>
  );
}

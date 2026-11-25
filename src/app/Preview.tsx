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
  /** 원본 보기 버튼을 누르고 있는지 (PRD E-04) */
  onHold: (holding: boolean) => void;
  /** 사진을 새로 열 때마다 바뀌는 값. 등장 효과를 다시 틀려고 씀 */
  photoKey: number;
  samples: string[];
  onSample: (name: string) => void;
}

export const COMPARE_STEP = 5;

export function Preview({
  canvasRef,
  hasPhoto,
  aspect,
  compare,
  onCompare,
  onHold,
  photoKey,
  samples,
  onSample,
  ...art
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
            // 캔버스에 렌더러가 붙어 있어 다시 만들지 않고, 값만 번갈아 바꿔 등장 효과를 다시 틂
            data-reveal={photoKey % 2}
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
                  {fill(copy['compare.right'], {
                    code: art.preset.code,
                    strength: art.strength,
                    name: art.preset.name,
                  })}
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
                {/* 누르고 있는 동안만 원본. 키보드는 Space·Enter를 누르고 있는 동안 */}
                <button
                  type="button"
                  className="hold-original"
                  onPointerDown={() => onHold(true)}
                  onPointerUp={() => onHold(false)}
                  onPointerLeave={() => onHold(false)}
                  onPointerCancel={() => onHold(false)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onHold(true);
                    }
                  }}
                  onKeyUp={() => onHold(false)}
                  onBlur={() => onHold(false)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {copy['original.hold']}
                </button>
              </>
            )}
          </div>
          {!hasPhoto && (
            <div className="preview-empty">
              <p className="preview-hint">{copy['drop.hint']}</p>
              {samples.length > 0 && (
                <div className="samples" role="group" aria-label={copy['samples.title']}>
                  <span>{copy['samples.title']}</span>
                  {samples.map((name, i) => (
                    <button key={name} type="button" onClick={() => onSample(name)}>
                      {fill(copy['samples.item'], { n: i + 1 })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Caption {...art} />
    </section>
  );
}

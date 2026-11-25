import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { fill } from '../themes/copy';
import { useTheme, type ArtProps } from '../themes/kit';
import type { Point } from './zoom';

interface Props extends ArtProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** 사진 상자. 확대 보기에서 화면 크기를 재는 데 씀 */
  fitRef: RefObject<HTMLDivElement | null>;
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
  /** 100% 확대 보기 (PRD E-07). at은 상자 안에서 누른 위치(0~1) */
  zoomed: boolean;
  zoomLoading: boolean;
  onZoomIn: (at: Point) => void;
  onZoomOut: () => void;
  /** 확대 중 끌기. 화면(CSS) 픽셀 단위로 움직인 만큼 */
  onPan: (dx: number, dy: number) => void;
}

/** 두 손가락 사이가 이만큼 벌어지면 확대, 좁혀지면 맞춤 보기 */
const PINCH_IN = 1.25;
const PINCH_OUT = 0.8;

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
  fitRef,
  zoomed,
  zoomLoading,
  onZoomIn,
  onZoomOut,
  onPan,
  ...art
}: Props) {
  const { copy, PreviewOverlay, PreviewLead, FrameDecor, CompareHandle, Caption } = useTheme();

  // 방향키는 5%씩 (design/DESIGN.md 6.2). 끌기는 1% 단위로 부드럽게
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    onCompare(Math.min(100, Math.max(0, compare + dir * COMPARE_STEP)));
  };

  // 상자 안 위치(0~1)
  const pointAt = (x: number, y: number): Point => {
    const rect = fitRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return { x: 0.5, y: 0.5 };
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
    return { x: clamp01((x - rect.left) / rect.width), y: clamp01((y - rect.top) / rect.height) };
  };

  // Ctrl+휠(노트북 터치패드의 두 손가락 벌리기도 같음)로 확대·맞춤. 그냥 휠은 화면 스크롤에 둠
  // React의 onWheel은 passive라 기본 동작(브라우저 확대)을 막을 수 없어 직접 붙임
  const wheel = useRef({ zoomed, onZoomIn, onZoomOut, pointAt });
  useEffect(() => {
    wheel.current = { zoomed, onZoomIn, onZoomOut, pointAt };
  });
  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey || e.deltaY === 0) return;
      e.preventDefault();
      const w = wheel.current;
      if (e.deltaY < 0 && !w.zoomed) w.onZoomIn(w.pointAt(e.clientX, e.clientY));
      else if (e.deltaY > 0 && w.zoomed) w.onZoomOut();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [fitRef]);

  // 누르고 있는 손가락·마우스. 하나면 확대 중 끌기, 둘이면 벌리기·좁히기
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ start: number; done: boolean } | null>(null);
  // 확대·맞춤이 바뀌면 손가락을 받던 요소가 바뀌어 남은 기록을 버림
  useEffect(() => {
    pointers.current.clear();
    pinch.current = null;
  }, [zoomed]);
  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.pointerType !== 'touch' && !zoomed) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (zoomed) (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pinch.current = pointers.current.size === 2 ? { start: spread(), done: false } : null;
  };
  const onPointerMove = (e: PointerEvent) => {
    const last = pointers.current.get(e.pointerId);
    if (!last) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1 && zoomed) {
      onPan(e.clientX - last.x, e.clientY - last.y);
      return;
    }
    const p = pinch.current;
    if (pointers.current.size !== 2 || !p || p.done || !p.start) return;
    const ratio = spread() / p.start;
    if (!zoomed && ratio > PINCH_IN) {
      const [a, b] = [...pointers.current.values()];
      onZoomIn(pointAt((a.x + b.x) / 2, (a.y + b.y) / 2));
      p.done = true;
    } else if (zoomed && ratio < PINCH_OUT) {
      onZoomOut();
      p.done = true;
    }
  };
  const onPointerEnd = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  return (
    // 사진 비율을 CSS에 알려 미리보기 상자를 사진 모양대로 만듦 (사진이 없으면 3:2)
    <section className="preview" style={{ '--photo-aspect': aspect } as CSSProperties}>
      {PreviewLead && <PreviewLead />}
      <div className="preview-frame">
        {FrameDecor && <FrameDecor />}
        <div className="preview-photo">
          {/* 사진 비율을 지키며 3:2 상자 안에 들어가는 실제 사진 영역 */}
          {/* 캔버스는 렌더러가 붙어 있어 항상 남겨 두고, 사진이 없으면 영역째 숨김 */}
          <div
            ref={fitRef}
            // 캔버스에 렌더러가 붙어 있어 다시 만들지 않고, 값만 번갈아 바꿔 등장 효과를 다시 틂
            data-reveal={photoKey % 2}
            data-zoomed={zoomed}
            className="preview-fit"
            hidden={!hasPhoto}
            style={{
              aspectRatio: String(aspect),
              // 상자(cq 단위) 안에 들어가는 가장 큰 크기: 가로가 넘치면 가로에, 아니면 세로에 맞춤
              width: `min(100cqw, calc(100cqh * ${aspect}))`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            // 마우스로 두 번 누르면 그 자리를 확대, 확대 중이면 맞춤 보기
            onDoubleClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              if (zoomed) onZoomOut();
              else onZoomIn(pointAt(e.clientX, e.clientY));
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
                {/* 확대 중에는 끌면 사진이 움직이므로 비교 슬라이더 대신 끌기 판을 둠 */}
                {zoomed ? (
                  <div className="zoom-pan" aria-hidden="true" />
                ) : (
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
                )}
                <div className="photo-tools">
                  <button
                    type="button"
                    className="photo-tool zoom-toggle"
                    aria-pressed={zoomed}
                    aria-busy={zoomLoading}
                    onClick={() => (zoomed ? onZoomOut() : onZoomIn({ x: 0.5, y: 0.5 }))}
                  >
                    {zoomLoading ? copy['zoom.loading'] : copy['zoom.toggle']}
                  </button>
                  {/* 누르고 있는 동안만 원본. 키보드는 Space·Enter를 누르고 있는 동안 */}
                  <button
                    type="button"
                    className="photo-tool hold-original"
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
                </div>
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

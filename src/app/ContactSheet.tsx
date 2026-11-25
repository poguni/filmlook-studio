import { useEffect, useRef, type ReactNode } from 'react';
import { USER_LUT } from '../state/edit';
import { fill } from '../themes/copy';
import { useTheme, type PresetView } from '../themes/kit';

interface Props {
  frames: PresetView[];
  selected: string;
  thumbs: Map<string, ImageBitmap>;
  onSelect: (code: string) => void;
  /** .cube 파일을 골랐을 때 (PRD P-05) */
  onAddLut: (file: File) => void;
  onRemoveLut: () => void;
}

function Thumb({ bitmap }: { bitmap: ImageBitmap | undefined }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !bitmap) return;
    c.width = bitmap.width;
    c.height = bitmap.height;
    c.getContext('2d')?.drawImage(bitmap, 0, 0);
  }, [bitmap]);
  return <canvas ref={ref} className="frame-thumb" aria-hidden="true" />;
}

export function ContactSheet({ frames, selected, thumbs, onSelect, onAddLut, onRemoveLut }: Props) {
  const { copy, SheetLead, FrameMark } = useTheme();
  const lutInput = useRef<HTMLInputElement>(null);
  // 사용자 LUT 칸은 ‘빼기’ 버튼을 함께 둠. 버튼 안에 버튼을 넣을 수 없어 감싸는 칸에 나란히 둠
  const slot = (code: string, frame: ReactNode) =>
    code === USER_LUT ? (
      <div key={code} className="frame-slot">
        {frame}
        <button
          type="button"
          className="frame-remove"
          aria-label={copy['userLut.remove']}
          onClick={onRemoveLut}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>
    ) : (
      frame
    );
  return (
    <section className="sheet" aria-label={copy['sheet.label']}>
      {SheetLead && <SheetLead />}
      <div className="sheet-frames">
        {frames.map((f) =>
          slot(
            f.code,
            <button
              key={f.code}
              type="button"
              className="frame"
              aria-pressed={f.code === selected}
              aria-label={fill(copy['frame.label'], {
                name: f.code === 'ORIG' ? f.name : `${f.code} ${f.name}`,
              })}
              onClick={() => onSelect(f.code)}
            >
              {FrameMark && <FrameMark />}
              <Thumb bitmap={thumbs.get(f.code)} />
              <span className="frame-no">
                {fill(copy['frame.no'], { no: f.no })} ▸ {f.code}
              </span>
              <span className="frame-name">{f.name}</span>
            </button>,
          ),
        )}
        <button type="button" className="sheet-add" onClick={() => lutInput.current?.click()}>
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M11 4 L11 18 M4 11 L18 11" stroke="currentColor" strokeWidth="2.2" />
          </svg>
          <span>{copy['userLut.add']}</span>
        </button>
        <input
          ref={lutInput}
          type="file"
          accept=".cube"
          hidden
          data-testid="lut-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAddLut(file);
            e.target.value = '';
          }}
        />
      </div>
    </section>
  );
}

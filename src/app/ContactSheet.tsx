import { useEffect, useRef } from 'react';
import { fill } from '../themes/copy';
import { useTheme, type PresetView } from '../themes/kit';

interface Props {
  frames: PresetView[];
  selected: string;
  thumbs: Map<string, ImageBitmap>;
  onSelect: (code: string) => void;
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

export function ContactSheet({ frames, selected, thumbs, onSelect }: Props) {
  const { copy, SheetLead, FrameMark } = useTheme();
  return (
    <section className="sheet" aria-label={copy['sheet.label']}>
      {SheetLead && <SheetLead />}
      <div className="sheet-frames">
        {frames.map((f) => (
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
              {f.no} ▸ {f.code}
            </span>
            <span className="frame-name">{f.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

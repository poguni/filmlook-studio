// M1 엔진 확인 화면: 사진 열기 → 프리셋 적용 → 강도 조절. 화면 배치는 M2에서 B 테마 시안대로 다시 만듦
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { bakeLut, type Lut } from '../color/lut';
import { createColorTransform } from '../color/pipeline';
import { Renderer } from '../gl/renderer';
import { isAdobeRgb } from '../io/jpeg';
import { NotJpegError, openJpeg, type OpenedPhoto } from '../io/open';
import { ORIGINAL, PRESETS, findPreset } from '../presets';
import { DEFAULT_EDIT, type EditState, type PresetCode } from '../state/edit';
import { copy } from '../themes/camera/copy';
import { bitmapPixels, installDevHook } from './devHook';
import './app.css';

// 프리셋별로 한 번만 굽고 재사용 (PRD 6.2)
const lutCache = new Map<string, Lut>();
function lutFor(code: string): Lut | null {
  const preset = findPreset(code);
  if (!preset) return null;
  let lut = lutCache.get(code);
  if (!lut) {
    lut = bakeLut(createColorTransform(preset.params));
    lutCache.set(code, lut);
  }
  return lut;
}

const FRAMES = [ORIGINAL, ...PRESETS];

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [webgl2, setWebgl2] = useState(true);
  const [photo, setPhoto] = useState<OpenedPhoto | null>(null);
  const [edit, setEdit] = useState<EditState>(DEFAULT_EDIT);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || rendererRef.current) return;
    const r = Renderer.create(canvasRef.current);
    if (r) rendererRef.current = r;
    else setWebgl2(false);
  }, []);

  useEffect(() => {
    if (photo) rendererRef.current?.setImage(photo.preview);
  }, [photo]);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !photo) return;
    const lut = lutFor(edit.preset);
    if (lut) r.setLut(lut);
    // 원본 칸은 LUT 없이 강도 0으로 그려 원본과 정확히 같게 함
    r.render(lut ? edit.strength / 100 : 0);
  }, [photo, edit]);

  useEffect(() => {
    installDevHook({
      photoName: photo?.name ?? null,
      readRender: () => (photo ? (rendererRef.current?.readPixels() ?? null) : null),
      readSource: () => (photo ? bitmapPixels(photo.preview) : null),
    });
  }, [photo]);

  const open = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const next = await openJpeg(file);
      setPhoto((prev) => {
        prev?.preview.close();
        return next;
      });
    } catch (e) {
      setError(e instanceof NotJpegError ? copy['error.notJpeg'] : copy['error.decode']);
    }
  }, []);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    void open(e.dataTransfer.files[0]);
  };

  const megapixels = photo ? (photo.info.width * photo.info.height) / 1e6 : 0;

  return (
    <div className="app" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <header className="app-header">
        <span className="app-logo">FilmLook Studio</span>
        <button
          type="button"
          className="btn"
          onClick={() => inputRef.current?.click()}
          disabled={!webgl2}
        >
          {copy.open}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg"
          hidden
          data-testid="file-input"
          onChange={(e) => {
            void open(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </header>

      {!webgl2 && (
        <p role="alert" className="app-error">
          {copy['error.noWebgl2']}
        </p>
      )}
      {error && (
        <p role="alert" className="app-error">
          {error}
        </p>
      )}

      <main className="app-main">
        <div className="preview">
          <canvas ref={canvasRef} className="preview-canvas" hidden={!photo} />
          {!photo && <p className="preview-hint">{copy['drop.hint']}</p>}
        </div>

        <section className="controls">
          <div className="frames">
            {FRAMES.map((f) => (
              <button
                key={f.code}
                type="button"
                className="frame"
                aria-pressed={edit.preset === f.code}
                aria-label={copy['frame.label'].replace(
                  '{name}',
                  f.code === 'ORIG' ? f.name : `${f.code} ${f.name}`,
                )}
                onClick={() => setEdit((s) => ({ ...s, preset: f.code as PresetCode }))}
              >
                <span className="frame-code">{f.code}</span>
                <span className="frame-name">{f.name}</span>
              </button>
            ))}
          </div>

          <label className="slider">
            <span>
              {copy.strength} <output>{edit.strength}</output>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={edit.strength}
              onChange={(e) => setEdit((s) => ({ ...s, strength: Number(e.target.value) }))}
            />
          </label>

          {photo && (
            <p className="photo-info" data-testid="photo-info">
              {photo.name} · {photo.info.width} × {photo.info.height} · {megapixels.toFixed(1)}MP
            </p>
          )}
          {photo && isAdobeRgb(photo.info.iccName) && (
            <p className="photo-info">{copy['icc.adobeRgb']}</p>
          )}
        </section>
      </main>
    </div>
  );
}

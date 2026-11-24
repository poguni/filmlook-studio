// 한 화면 편집기: 밀착 인화 + 미리보기 + 조절판 (PRD 3장). 테마는 ThemeKit으로만 바뀜
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { renderThumbnails } from '../gl/offscreen';
import { Renderer } from '../gl/renderer';
import { renderTiled } from '../gl/tiles';
import { isAdobeRgb } from '../io/jpeg';
import {
  NotJpegError,
  THUMB_MAX_SIDE,
  decodeFull,
  downscale,
  openJpeg,
  type OpenedPhoto,
} from '../io/open';
import { download, encodeJpeg, outputName } from '../io/save';
import { ORIGINAL, PRESETS, frameNo } from '../presets';
import { lutFor } from '../presets/luts';
import { DEFAULT_EDIT, type EditState, type PresetCode } from '../state/edit';
import { camera } from '../themes/camera';
import { ThemeContext, type PresetView } from '../themes/kit';
import { ContactSheet } from './ContactSheet';
import { ControlPanel } from './ControlPanel';
import { canvasPixels, installDevHook } from './devHook';
import { Header } from './Header';
import { COMPARE_STEP, Preview } from './Preview';
import './app.css';

// M4까지는 B 테마 1종 (PRD O-02). 테마 전환은 M5에서 추가
const kit = camera;
const { copy } = kit;

const FRAMES: PresetView[] = [ORIGINAL, ...PRESETS].map((p) => ({
  code: p.code,
  no: frameNo(p.code),
  name: p.name,
  subtitle: p.subtitle,
}));

const clamp100 = (n: number) => Math.min(100, Math.max(0, n));

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [webgl2, setWebgl2] = useState(true);
  const [photo, setPhoto] = useState<OpenedPhoto | null>(null);
  const [edit, setEdit] = useState<EditState>(DEFAULT_EDIT);
  const [thumbs, setThumbs] = useState<Map<string, ImageBitmap>>(new Map());
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = FRAMES.find((f) => f.code === edit.preset) ?? FRAMES[0];

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
    r.render(lut ? edit.strength / 100 : 0, edit.compare / 100);
  }, [photo, edit]);

  // 썸네일은 사진을 바꿨을 때만 다시 만듦 (design/DESIGN.md 6.1)
  useEffect(() => {
    if (!photo) return;
    let cancelled = false;
    let made: Map<string, ImageBitmap> | null = null;
    void (async () => {
      const small = (await downscale(photo.preview, THUMB_MAX_SIDE)) ?? photo.preview;
      const map = renderThumbnails(
        small,
        FRAMES.map((f) => ({ code: f.code, lut: lutFor(f.code) })),
      );
      if (small !== photo.preview) small.close();
      if (cancelled) {
        map.forEach((b) => b.close());
        return;
      }
      made = map;
      setThumbs(map);
    })();
    return () => {
      cancelled = true;
      made?.forEach((b) => b.close());
    };
  }, [photo]);

  useEffect(() => {
    installDevHook({
      photoName: photo?.name ?? null,
      readRender: () => (photo ? (rendererRef.current?.readPixels() ?? null) : null),
      readSource: () => (photo ? canvasPixels(photo.preview) : null),
      renderTiled: async (tileSize) => {
        if (!photo) return null;
        const lut = lutFor(edit.preset);
        const out = await renderTiled(photo.preview, {
          lut,
          strength: edit.strength / 100,
          tileSize,
        });
        return canvasPixels(out);
      },
    });
  }, [photo, edit]);

  const open = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const next = await openJpeg(file);
      setPhoto((prev) => {
        prev?.preview.close();
        return next;
      });
      // 사진을 새로 열면 비교 위치는 0으로 (PRD E-01)
      setEdit((s) => ({ ...s, compare: 0 }));
    } catch (e) {
      setError(e instanceof NotJpegError ? copy['error.notJpeg'] : copy['error.decode']);
    }
  }, []);

  const save = useCallback(async () => {
    if (!photo || saving !== null) return;
    setError(null);
    setSaving(0);
    try {
      const full = await decodeFull(photo.file);
      const out = await renderTiled(full, {
        lut: lutFor(edit.preset),
        strength: edit.strength / 100,
        // 인코딩 시간까지 고려해 렌더링은 90%까지만 채움
        onProgress: (done, total) => setSaving(Math.round((done / total) * 90)),
      });
      full.close();
      setSaving(95);
      const blob = await encodeJpeg(out);
      download(blob, outputName(photo.name, edit.preset));
    } catch {
      setError(copy['error.save']);
    } finally {
      setSaving(null);
    }
  }, [photo, edit, saving]);

  const selectPreset = (code: string) => setEdit((s) => ({ ...s, preset: code as PresetCode }));

  // 단축키 (PRD 8.1). 입력 요소에 포커스가 있으면 그 요소가 키를 먼저 씀
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
        return;
      }
      if (saving !== null || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement).closest('input, textarea, select, [role="menu"]')) return;
      if (/^[1-9]$/.test(e.key)) {
        const frame = FRAMES[Number(e.key) - 1];
        if (frame) selectPreset(frame.code);
        return;
      }
      if (photo && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        setEdit((s) => ({ ...s, compare: clamp100(s.compare + dir * COMPARE_STEP) }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, saving, photo]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (saving === null) void open(e.dataTransfer.files[0]);
  };

  const { Aside } = kit;
  const aspect = photo ? photo.preview.width / photo.preview.height : 1.5;

  return (
    <ThemeContext.Provider value={kit}>
      <div className="app" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <Header
          preset={current}
          strength={edit.strength}
          canOpen={webgl2 && saving === null}
          canSave={photo !== null && saving === null}
          saving={saving}
          onOpen={() => inputRef.current?.click()}
          onSave={() => void save()}
        />
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

        <div className="app-notices">
          {!webgl2 && <p role="alert">{copy['error.noWebgl2']}</p>}
          {error && <p role="alert">{error}</p>}
          {photo && isAdobeRgb(photo.info.iccName) && <p role="status">{copy['icc.adobeRgb']}</p>}
        </div>

        {/* 저장하는 동안 다른 조작을 막음 (PRD S-06) */}
        <div className="app-body" inert={saving !== null}>
          {Aside && (
            <div className="app-aside">
              <Aside preset={current} strength={edit.strength} />
            </div>
          )}
          <Preview
            canvasRef={canvasRef}
            hasPhoto={photo !== null}
            aspect={aspect}
            compare={edit.compare}
            onCompare={(compare) => setEdit((s) => ({ ...s, compare }))}
            preset={current}
            strength={edit.strength}
          />
          <ControlPanel
            strength={edit.strength}
            onStrength={(strength) => setEdit((s) => ({ ...s, strength }))}
          />
          <ContactSheet
            frames={FRAMES}
            selected={edit.preset}
            thumbs={thumbs}
            onSelect={selectPreset}
          />
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

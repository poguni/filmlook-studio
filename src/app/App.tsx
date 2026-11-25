// 한 화면 편집기: 밀착 인화 + 미리보기 + 조절판 (PRD 3장). 테마는 ThemeKit으로만 바뀜
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { grainSettings } from '../gl/grain';
import { renderThumbnails } from '../gl/offscreen';
import { Renderer } from '../gl/renderer';
import { renderTiled } from '../gl/tiles';
import { isAdobeRgb } from '../io/jpeg';
import { saveLimitMp } from '../io/limits';
import {
  NotJpegError,
  THUMB_MAX_SIDE,
  decodeFull,
  downscale,
  openJpeg,
  type OpenedPhoto,
} from '../io/open';
import { download, encodeJpeg, outputName, outputSize } from '../io/save';
import { ORIGINAL, PRESETS, findPreset, frameNo } from '../presets';
import { lutFor } from '../presets/luts';
import { DEFAULT_EDIT, type EditState, type MonoChoice, type PresetCode } from '../state/edit';
import { fill } from '../themes/copy';
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
const longSide = (w: number, h: number) => Math.max(w, h);

/** 흑백 필터는 흑백 프리셋에서만 적용됨 (PRD E-08) */
function effectiveMono(edit: EditState): MonoChoice {
  return findPreset(edit.preset)?.params.mono ? edit.mono : 'none';
}

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
  // 개발 서버 전용: 저장 시간·크기 (실기기 상한 측정용, PRD 6.3)
  const [devSaveStat, setDevSaveStat] = useState<string | null>(null);
  const [limitMp] = useState(saveLimitMp);

  const current = FRAMES.find((f) => f.code === edit.preset) ?? FRAMES[0];
  const mono = effectiveMono(edit);
  // 회전해도 화소 수는 같으므로 헤더의 크기로 저장 크기를 미리 판단
  const target = photo ? outputSize(photo.info.width, photo.info.height, limitMp) : null;
  const saveInfo = target?.downscaled
    ? fill(copy['save.downscaled'], { mp: limitMp ?? 0 })
    : copy['save.info'];

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
    const lut = lutFor(edit.preset, effectiveMono(edit));
    if (lut) r.setLut(lut);
    const { info, preview } = photo;
    r.render({
      // 원본 칸은 LUT 없이 강도 0으로 그려 원본과 정확히 같게 함
      strength: lut ? edit.strength / 100 : 0,
      compare: edit.compare / 100,
      grain: grainSettings(
        edit.grain,
        edit.grainSize,
        edit.strength,
        longSide(info.width, info.height),
        longSide(preview.width, preview.height),
      ),
    });
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
        const { info, preview } = photo;
        const out = await renderTiled(preview, {
          lut: lutFor(edit.preset, effectiveMono(edit)),
          strength: edit.strength / 100,
          grain: grainSettings(
            edit.grain,
            edit.grainSize,
            edit.strength,
            longSide(info.width, info.height),
            longSide(preview.width, preview.height),
          ),
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
    const started = performance.now();
    try {
      const { info } = photo;
      const source = new Uint8Array(await photo.file.arrayBuffer());
      let full = await decodeFull(photo.file);
      // 스마트폰 상한에 걸리면 비율을 유지해 줄임 (PRD S-01, 6.3)
      const size = outputSize(full.width, full.height, limitMp);
      if (size.downscaled) {
        const small = await createImageBitmap(full, {
          resizeWidth: size.width,
          resizeHeight: size.height,
          resizeQuality: 'high',
        });
        full.close();
        full = small;
      }
      const out = await renderTiled(full, {
        lut: lutFor(edit.preset, effectiveMono(edit)),
        strength: edit.strength / 100,
        grain: grainSettings(
          edit.grain,
          edit.grainSize,
          edit.strength,
          longSide(info.width, info.height),
          longSide(full.width, full.height),
        ),
        // 인코딩 시간까지 고려해 렌더링은 90%까지만 채움
        onProgress: (done, total) => setSaving(Math.round((done / total) * 90)),
      });
      full.close();
      setSaving(95);
      const blob = await encodeJpeg(out, source);
      download(blob, outputName(photo.name, edit.preset));
      if (import.meta.env.DEV) {
        const sec = ((performance.now() - started) / 1000).toFixed(1);
        setDevSaveStat(`[개발] 저장 ${sec}초 · ${out.width}×${out.height}`);
      }
    } catch {
      setError(copy['error.save']);
    } finally {
      setSaving(null);
    }
  }, [photo, edit, saving, limitMp]);

  // 프리셋을 고르면 입자 양은 그 프리셋의 기본값으로 바뀜 (PRD E-05)
  const selectPreset = (code: string) =>
    setEdit((s) => ({
      ...s,
      preset: code as PresetCode,
      grain: findPreset(code)?.defaultGrain ?? 0,
    }));

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
  const art = { preset: current, strength: edit.strength, grain: edit.grain, mono, saveInfo };

  return (
    <ThemeContext.Provider value={kit}>
      <div className="app" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <Header
          preset={current}
          saveInfo={saveInfo}
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
          {devSaveStat && <p role="status">{devSaveStat}</p>}
        </div>

        {/* 저장하는 동안 다른 조작을 막음 (PRD S-06) */}
        <div className="app-body" inert={saving !== null}>
          {Aside && (
            <div className="app-aside">
              <Aside {...art} />
            </div>
          )}
          <Preview
            canvasRef={canvasRef}
            hasPhoto={photo !== null}
            aspect={aspect}
            compare={edit.compare}
            onCompare={(compare) => setEdit((s) => ({ ...s, compare }))}
            {...art}
          />
          <ControlPanel
            strength={edit.strength}
            onStrength={(strength) => setEdit((s) => ({ ...s, strength }))}
            grain={edit.grain}
            onGrain={(grain) => setEdit((s) => ({ ...s, grain }))}
            grainSize={edit.grainSize}
            onGrainSize={(grainSize) => setEdit((s) => ({ ...s, grainSize }))}
            mono={edit.mono}
            monoEnabled={findPreset(edit.preset)?.params.mono != null}
            onMono={(m) => setEdit((s) => ({ ...s, mono: m }))}
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

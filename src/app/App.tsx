// 한 화면 편집기: 밀착 인화 + 미리보기 + 조절판 (PRD 3장). 테마는 ThemeKit으로만 바뀜
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { CubeError, parseCube } from '../color/cube';
import type { Lut } from '../color/lut';
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
import { fetchSample, listSamples } from '../io/samples';
import { download, encodeJpeg, outputName, outputSize } from '../io/save';
import { canShareFiles, shareFile } from '../io/share';
import { ORIGINAL, PRESETS, findPreset, frameNo } from '../presets';
import { lutFor } from '../presets/luts';
import {
  DEFAULT_EDIT,
  USER_LUT,
  type EditState,
  type MonoChoice,
  type PresetCode,
} from '../state/edit';
import { fill } from '../themes/copy';
import { THEMES, nextTheme, saveTheme, savedTheme } from '../themes';
import type { Copy } from '../themes/copy';
import { ThemeContext, type PresetView, type ThemeName } from '../themes/kit';
import { ContactSheet } from './ContactSheet';
import { ControlPanel } from './ControlPanel';
import { canvasPixels, installDevHook } from './devHook';
import { Header } from './Header';
import { InfoDialog } from './InfoDialog';
import { COMPARE_STEP, Preview } from './Preview';
import './app.css';

const BASE_FRAMES: PresetView[] = [ORIGINAL, ...PRESETS].map((p) => ({
  code: p.code,
  no: frameNo(p.code),
  name: p.name,
  subtitle: p.subtitle,
}));

interface UserLut {
  name: string;
  lut: Lut;
}

const clamp100 = (n: number) => Math.min(100, Math.max(0, n));
const longSide = (w: number, h: number) => Math.max(w, h);

/** 흑백 필터는 흑백 프리셋에서만 적용됨 (PRD E-08) */
function effectiveMono(edit: EditState): MonoChoice {
  return findPreset(edit.preset)?.params.mono ? edit.mono : 'none';
}

/** 사용자 LUT는 5.4 단계를 거치지 않고 .cube 값을 그대로 씀 (PRD 5.4) */
function lutOf(code: string, mono: MonoChoice, user: UserLut | null): Lut | null {
  return code === USER_LUT ? (user?.lut ?? null) : lutFor(code, mono);
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [webgl2, setWebgl2] = useState(true);
  const [photo, setPhoto] = useState<OpenedPhoto | null>(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [edit, setEdit] = useState<EditState>(DEFAULT_EDIT);
  const [userLut, setUserLut] = useState<UserLut | null>(null);
  const [thumbs, setThumbs] = useState<Map<string, ImageBitmap>>(new Map());
  const [saving, setSaving] = useState<number | null>(null);
  // 저장이 끝나 공유를 기다리는 파일과, 그때의 사진·편집 값 (PRD S-04 두 단계 공유)
  const [pending, setPending] = useState<{
    file: File;
    photo: OpenedPhoto;
    edit: EditState;
    userLut: UserLut | null;
  } | null>(null);
  const [holding, setHolding] = useState(false);
  const [gimmick, setGimmick] = useState(false);
  // 테마는 겉모습만 바꾸고 편집 상태는 그대로 둠 (PRD O-02, O-05)
  const [theme, setTheme] = useState<ThemeName>(savedTheme);
  const kit = THEMES[theme];
  const { copy } = kit;
  const [infoOpen, setInfoOpen] = useState(false);
  const [samples, setSamples] = useState<string[]>([]);
  // 오류는 문구 키로 들고 있어 테마를 바꾸면 그 테마의 말투로 다시 보임
  const [error, setError] = useState<keyof Copy | null>(null);
  const [limitMp] = useState(saveLimitMp);

  const frames = useMemo<PresetView[]>(
    () =>
      userLut
        ? [
            ...BASE_FRAMES,
            { code: USER_LUT, no: '09', name: userLut.name, subtitle: copy['userLut.subtitle'] },
          ]
        : BASE_FRAMES,
    [userLut, copy],
  );
  // 편집 값이나 사진이 바뀌면 공유 대기는 무효가 되고 저장 버튼으로 돌아감 (design/DESIGN.md 6.5)
  const shareReady =
    pending && pending.photo === photo && pending.edit === edit && pending.userLut === userLut
      ? pending.file
      : null;
  const current = frames.find((f) => f.code === edit.preset) ?? frames[0];
  const mono = effectiveMono(edit);
  // 회전해도 화소 수는 같으므로 헤더의 크기로 저장 크기를 미리 판단
  const target = photo ? outputSize(photo.info.width, photo.info.height, limitMp) : null;
  const saveInfo = shareReady
    ? copy['share.hint']
    : target?.downscaled
      ? fill(copy['save.downscaled'], { mp: limitMp ?? 0 })
      : copy['save.info'];

  useEffect(() => {
    if (!canvasRef.current || rendererRef.current) return;
    const r = Renderer.create(canvasRef.current);
    if (r) rendererRef.current = r;
    else setWebgl2(false);
  }, []);

  useEffect(() => {
    void listSamples().then(setSamples);
  }, []);

  // 기믹은 토큰을 덮어써서 표현 (design/DESIGN.md 4.1)
  useEffect(() => {
    document.documentElement.dataset.gimmick = gimmick ? 'on' : 'off';
  }, [gimmick]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
    void THEMES[theme].loadFonts?.();
  }, [theme]);

  // 테마를 바꾸면 기믹만 꺼짐 (design/DESIGN.md 6.3)
  const changeTheme = useCallback((next: ThemeName) => {
    setTheme(next);
    setGimmick(false);
  }, []);

  useEffect(() => {
    if (photo) rendererRef.current?.setImage(photo.preview);
  }, [photo]);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !photo) return;
    const lut = lutOf(edit.preset, effectiveMono(edit), userLut);
    if (lut) r.setLut(lut);
    const { info, preview } = photo;
    r.render({
      // 원본 칸은 LUT 없이 강도 0으로 그려 원본과 정확히 같게 함
      strength: lut ? edit.strength / 100 : 0,
      // 원본 보기 중에는 경계선을 오른쪽 끝으로 보내 사진 전체를 원본으로 (PRD E-04)
      compare: holding ? 1 : edit.compare / 100,
      grain: grainSettings(
        edit.grain,
        edit.grainSize,
        edit.strength,
        longSide(info.width, info.height),
        longSide(preview.width, preview.height),
      ),
    });
  }, [photo, edit, userLut, holding]);

  // 썸네일은 사진이나 사용자 LUT를 바꿨을 때만 다시 만듦 (design/DESIGN.md 6.1)
  useEffect(() => {
    if (!photo) return;
    let cancelled = false;
    let made: Map<string, ImageBitmap> | null = null;
    void (async () => {
      const small = (await downscale(photo.preview, THUMB_MAX_SIDE)) ?? photo.preview;
      const map = renderThumbnails(
        small,
        frames.map((f) => ({ code: f.code, lut: lutOf(f.code, 'none', userLut) })),
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
  }, [photo, frames, userLut]);

  useEffect(() => {
    installDevHook({
      photoName: photo?.name ?? null,
      readRender: () => (photo ? (rendererRef.current?.readPixels() ?? null) : null),
      readSource: () => (photo ? canvasPixels(photo.preview) : null),
      renderTiled: async (tileSize) => {
        if (!photo) return null;
        const { info, preview } = photo;
        const out = await renderTiled(preview, {
          lut: lutOf(edit.preset, effectiveMono(edit), userLut),
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
  }, [photo, edit, userLut]);

  const open = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const next = await openJpeg(file);
      setPhoto((prev) => {
        prev?.preview.close();
        return next;
      });
      setPhotoKey((k) => k + 1);
      // 사진을 새로 열면 비교 위치는 0으로 (PRD E-01)
      setEdit((s) => ({ ...s, compare: 0 }));
    } catch (e) {
      setError(e instanceof NotJpegError ? 'error.notJpeg' : 'error.decode');
    }
  }, []);

  // 프리셋을 고르면 입자 양은 그 프리셋의 기본값으로 바뀜 (PRD E-05)
  const selectPreset = useCallback(
    (code: string) =>
      setEdit((s) => ({
        ...s,
        preset: code as PresetCode,
        grain: findPreset(code)?.defaultGrain ?? 0,
      })),
    [],
  );

  const addLut = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const lut = parseCube(await file.text());
        setUserLut({ name: file.name.replace(/\.[^.]*$/, '') || file.name, lut });
        selectPreset(USER_LUT);
      } catch (e) {
        if (!(e instanceof CubeError)) console.error(e);
        setError('error.cube');
      }
    },
    [selectPreset],
  );

  const removeLut = () => {
    setUserLut(null);
    setEdit((s) => (s.preset === USER_LUT ? { ...s, preset: 'ORIG', grain: 0 } : s));
  };

  const save = useCallback(async () => {
    if (!photo || saving !== null) return;
    setError(null);
    setSaving(0);
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
        lut: lutOf(edit.preset, effectiveMono(edit), userLut),
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
      const name = outputName(photo.name, edit.preset);
      // 공유 시트는 방금 누른 동작에서만 열리므로, 스마트폰은 한 번 더 누르게 함 (PRD S-04)
      if (canShareFiles())
        setPending({ file: new File([blob], name, { type: 'image/jpeg' }), photo, edit, userLut });
      else download(blob, name);
    } catch {
      setError('error.save');
    } finally {
      setSaving(null);
    }
  }, [photo, edit, saving, limitMp, userLut]);

  const share = useCallback(async () => {
    if (!shareReady) return;
    try {
      await shareFile(shareReady);
    } catch {
      // 공유를 못 하면 내려받기로 대신함
      download(shareReady, shareReady.name);
    } finally {
      setPending(null);
    }
  }, [shareReady]);

  const saveOrShare = useCallback(
    () => void (shareReady ? share() : save()),
    [shareReady, share, save],
  );

  // 단축키 (PRD 8.1). 입력 요소에 포커스가 있으면 그 요소가 키를 먼저 씀
  useEffect(() => {
    const ownsKeys = (e: KeyboardEvent) =>
      (e.target as HTMLElement).closest('input, textarea, select, dialog, [role="menu"]');
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveOrShare();
        return;
      }
      if (saving !== null || e.ctrlKey || e.metaKey || e.altKey || ownsKeys(e)) return;
      if (/^[1-9]$/.test(e.key)) {
        const frame = frames[Number(e.key) - 1];
        if (frame) selectPreset(frame.code);
        return;
      }
      if (e.key === '\\' && photo) {
        setHolding(true);
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        changeTheme(nextTheme(theme));
        return;
      }
      if (photo && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        setEdit((s) => ({ ...s, compare: clamp100(s.compare + dir * COMPARE_STEP) }));
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === '\\') setHolding(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [saveOrShare, saving, photo, frames, selectPreset, changeTheme, theme]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (saving === null) void open(e.dataTransfer.files[0]);
  };

  const { Aside } = kit;
  const aspect = photo ? photo.preview.width / photo.preview.height : 1.5;
  const step: 1 | 2 | 3 = saving !== null ? 3 : photo ? 2 : 1;
  const art = { preset: current, strength: edit.strength, grain: edit.grain, mono, saveInfo, step };
  const saveLabel =
    saving !== null
      ? fill(copy['save.progress'], { n: saving })
      : shareReady
        ? copy.share
        : copy['save.card'];

  return (
    <ThemeContext.Provider value={kit}>
      <div className="app" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <Header
          preset={current}
          saveInfo={saveInfo}
          canOpen={webgl2 && saving === null}
          canSave={photo !== null && saving === null}
          saving={saving}
          shareReady={shareReady !== null}
          gimmick={gimmick}
          onGimmick={() => setGimmick((g) => !g)}
          onInfo={() => setInfoOpen(true)}
          theme={theme}
          onTheme={changeTheme}
          onOpen={() => inputRef.current?.click()}
          onSave={saveOrShare}
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
          {error && <p role="alert">{copy[error]}</p>}
          {photo && isAdobeRgb(photo.info.iccName) && <p role="status">{copy['icc.adobeRgb']}</p>}
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
            onHold={setHolding}
            photoKey={photoKey}
            samples={samples}
            onSample={(name) => void fetchSample(name).then(open, () => setError('error.decode'))}
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
            saveInfo={saveInfo}
            saveLabel={saveLabel}
            canSave={photo !== null && saving === null}
            onSave={saveOrShare}
          />
          <ContactSheet
            frames={frames}
            selected={edit.preset}
            thumbs={thumbs}
            onSelect={selectPreset}
            onAddLut={(file) => void addLut(file)}
            onRemoveLut={removeLut}
          />
        </div>
        <InfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} />
      </div>
    </ThemeContext.Provider>
  );
}

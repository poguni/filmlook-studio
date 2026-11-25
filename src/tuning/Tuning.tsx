// 개발용 프리셋 튜닝 화면 (PRD 7장). 개발 서버의 /tuning에서만 열리고 배포 빌드에는 들어가지 않음.
// 개발 도구라 테마 문구 사전을 쓰지 않고 이 파일에 문구를 둠
import { useEffect, useRef, useState } from 'react';
import { bakeLut } from '../color/lut';
import { HUE_BANDS, MONO_FILTERS, parsePreset, type HueBand } from '../color/params';
import { createColorTransform } from '../color/pipeline';
import { grainSettings } from '../gl/grain';
import { Renderer } from '../gl/renderer';
import { openJpeg, type OpenedPhoto } from '../io/open';
import A03 from '../presets/A03.json';
import C04 from '../presets/C04.json';
import E06 from '../presets/E06.json';
import M07 from '../presets/M07.json';
import N05 from '../presets/N05.json';
import P01 from '../presets/P01.json';
import V02 from '../presets/V02.json';
import { draftToJson, normalize, type Draft, type MonoTarget } from './draft';
import '../app/app.css';
import './tuning.css';

const BASES: Record<string, unknown> = { P01, V02, A03, C04, N05, E06, M07 };

const BAND_NAMES: Record<HueBand, string> = {
  red: '빨강',
  orange: '주황',
  yellow: '노랑',
  green: '초록',
  aqua: '청록',
  blue: '파랑',
  purple: '보라',
  magenta: '자홍',
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step = 1, onChange }: SliderProps) {
  return (
    <label className="tn-slider">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={`${label} 값`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Tuning() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [photo, setPhoto] = useState<OpenedPhoto | null>(null);
  const [draft, setDraft] = useState<Draft>(() => normalize(V02));
  const [monoTarget, setMonoTarget] = useState<MonoTarget>('mix');
  const [compare, setCompare] = useState(0);
  const [showGrain, setShowGrain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const json = draftToJson(draft);

  useEffect(() => {
    if (canvasRef.current && !rendererRef.current)
      rendererRef.current = Renderer.create(canvasRef.current);
  }, []);

  useEffect(() => {
    if (photo) rendererRef.current?.setImage(photo.preview);
  }, [photo]);

  // 값이 바뀔 때마다 LUT를 다시 구움 (약 60ms). 한 프레임에 한 번만
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !photo) return;
    const id = requestAnimationFrame(() => {
      try {
        const preset = parsePreset(JSON.parse(json));
        const mix = monoTarget === 'mix' ? undefined : preset.monoFilters[monoTarget];
        const params = preset.params.mono && mix ? { ...preset.params, mono: mix } : preset.params;
        r.setLut(bakeLut(createColorTransform(params)));
        const long = Math.max(photo.info.width, photo.info.height);
        const prevLong = Math.max(photo.preview.width, photo.preview.height);
        r.render({
          strength: 1,
          compare: compare / 100,
          grain: showGrain
            ? grainSettings(preset.defaultGrain, 'small', 100, long, prevLong)
            : undefined,
        });
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
    return () => cancelAnimationFrame(id);
  }, [photo, json, monoTarget, compare, showGrain]);

  const update = (fn: (d: Draft) => void) =>
    setDraft((d) => {
      const next = structuredClone(d);
      fn(next);
      return next;
    });

  const mixOf = (d: Draft) =>
    d.mono ? (monoTarget === 'mix' ? d.mono.mix : d.mono.filters[monoTarget]) : null;
  const mix = mixOf(draft);

  // R·G를 바꾸면 B는 합이 1이 되도록 맞춤 (PRD 5.4 흑백 혼합)
  const setMix = (channel: 0 | 1, v: number) =>
    update((d) => {
      const m = mixOf(d);
      if (!m) return;
      m[channel] = v;
      m[1 - channel] = Math.min(m[1 - channel], Math.round((1 - v) * 100) / 100);
      m[2] = Math.max(0, Math.round((1 - m[0] - m[1]) * 100) / 100);
    });

  return (
    <div className="tn">
      <header className="tn-head">
        <h1>프리셋 튜닝 (개발용)</h1>
        <label>
          기준 프리셋{' '}
          <select
            value={draft.code}
            onChange={(e) => {
              setDraft(normalize(BASES[e.target.value]));
              setMonoTarget('mix');
            }}
          >
            {Object.keys(BASES).map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </label>
        <input
          type="file"
          accept="image/jpeg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void openJpeg(file).then(setPhoto, (err: Error) => setError(err.message));
          }}
        />
      </header>

      <main className="tn-body">
        <section className="tn-preview">
          <canvas ref={canvasRef} hidden={!photo} />
          {!photo && <p>검증용 사진(JPEG)을 열어 주세요.</p>}
          <Slider
            label="비교 위치(왼쪽 원본) %"
            value={compare}
            min={0}
            max={100}
            onChange={setCompare}
          />
          <label className="tn-check">
            <input
              type="checkbox"
              checked={showGrain}
              onChange={(e) => setShowGrain(e.target.checked)}
            />
            기본 입자 미리보기
          </label>
          {error && <p role="alert">{error}</p>}
        </section>

        <section className="tn-controls">
          <fieldset>
            <legend>화이트밸런스 · 대비 · 블랙 · 채도</legend>
            <Slider
              label="색온도"
              value={draft.whiteBalance.temp}
              min={-100}
              max={100}
              onChange={(v) =>
                update((d) => {
                  d.whiteBalance.temp = v;
                })
              }
            />
            <Slider
              label="색조"
              value={draft.whiteBalance.tint}
              min={-100}
              max={100}
              onChange={(v) =>
                update((d) => {
                  d.whiteBalance.tint = v;
                })
              }
            />
            <Slider
              label="대비"
              value={draft.contrast}
              min={-100}
              max={100}
              onChange={(v) =>
                update((d) => {
                  d.contrast = v;
                })
              }
            />
            <Slider
              label="블랙"
              value={draft.black}
              min={-100}
              max={100}
              onChange={(v) =>
                update((d) => {
                  d.black = v;
                })
              }
            />
            <Slider
              label="채도"
              value={draft.saturation}
              min={-100}
              max={100}
              onChange={(v) =>
                update((d) => {
                  d.saturation = v;
                })
              }
            />
            <Slider
              label="기본 입자"
              value={draft.defaultGrain}
              min={0}
              max={100}
              onChange={(v) =>
                update((d) => {
                  d.defaultGrain = v;
                })
              }
            />
          </fieldset>

          <fieldset>
            <legend>톤 커브 (x는 증가 순서)</legend>
            {draft.toneCurve.map(([x, y], i) => (
              <div key={i} className="tn-point">
                <Slider
                  label={`점 ${i + 1} x`}
                  value={x}
                  min={0}
                  max={1}
                  step={0.005}
                  onChange={(v) =>
                    update((d) => {
                      d.toneCurve[i][0] = v;
                    })
                  }
                />
                <Slider
                  label={`점 ${i + 1} y`}
                  value={y}
                  min={0}
                  max={1}
                  step={0.005}
                  onChange={(v) =>
                    update((d) => {
                      d.toneCurve[i][1] = v;
                    })
                  }
                />
                <button
                  type="button"
                  disabled={draft.toneCurve.length <= 2}
                  onClick={() =>
                    update((d) => {
                      d.toneCurve.splice(i, 1);
                    })
                  }
                >
                  점 빼기
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                update((d) => {
                  // 가장 넓은 구간의 가운데에 점을 더함
                  let at = 1;
                  for (let k = 1; k < d.toneCurve.length; k++)
                    if (
                      d.toneCurve[k][0] - d.toneCurve[k - 1][0] >
                      d.toneCurve[at][0] - d.toneCurve[at - 1][0]
                    )
                      at = k;
                  const [a, b] = [d.toneCurve[at - 1], d.toneCurve[at]];
                  d.toneCurve.splice(at, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
                })
              }
            >
              점 더하기
            </button>
            <button
              type="button"
              onClick={() =>
                update((d) => {
                  d.toneCurve = [
                    [0, 0],
                    [1, 1],
                  ];
                })
              }
            >
              직선으로
            </button>
          </fieldset>

          <fieldset>
            <legend>구간별 HSL (색상 −30~30°)</legend>
            {HUE_BANDS.map((band) => (
              <div key={band} className="tn-band">
                <strong>{BAND_NAMES[band]}</strong>
                <Slider
                  label="색상"
                  value={draft.hsl[band].hue}
                  min={-30}
                  max={30}
                  onChange={(v) =>
                    update((d) => {
                      d.hsl[band].hue = v;
                    })
                  }
                />
                <Slider
                  label="채도"
                  value={draft.hsl[band].sat}
                  min={-100}
                  max={100}
                  onChange={(v) =>
                    update((d) => {
                      d.hsl[band].sat = v;
                    })
                  }
                />
                <Slider
                  label="명도"
                  value={draft.hsl[band].lum}
                  min={-100}
                  max={100}
                  onChange={(v) =>
                    update((d) => {
                      d.hsl[band].lum = v;
                    })
                  }
                />
              </div>
            ))}
          </fieldset>

          <fieldset>
            <legend>스플릿 토닝 (색상각은 OKLCh °)</legend>
            {(['shadows', 'highlights'] as const).map((part) => (
              <div key={part} className="tn-band">
                <strong>{part === 'shadows' ? '섀도' : '하이라이트'}</strong>
                <Slider
                  label="색상"
                  value={draft.splitTone[part].hue}
                  min={0}
                  max={360}
                  onChange={(v) =>
                    update((d) => {
                      d.splitTone[part].hue = v;
                    })
                  }
                />
                <Slider
                  label="채도 %"
                  value={draft.splitTone[part].sat}
                  min={0}
                  max={100}
                  onChange={(v) =>
                    update((d) => {
                      d.splitTone[part].sat = v;
                    })
                  }
                />
              </div>
            ))}
          </fieldset>

          <fieldset>
            <legend>흑백 혼합</legend>
            <label className="tn-check">
              <input
                type="checkbox"
                checked={draft.mono !== null}
                onChange={(e) =>
                  update((d) => {
                    d.mono = e.target.checked
                      ? {
                          mix: [0.3, 0.59, 0.11],
                          filters: {
                            yellow: [0.45, 0.5, 0.05],
                            red: [0.7, 0.3, 0],
                            green: [0.2, 0.7, 0.1],
                          },
                        }
                      : null;
                  })
                }
              />
              흑백 프리셋
            </label>
            {mix && (
              <>
                <label>
                  고칠 혼합{' '}
                  <select
                    value={monoTarget}
                    onChange={(e) => setMonoTarget(e.target.value as MonoTarget)}
                  >
                    <option value="mix">기본(필터 없음)</option>
                    {MONO_FILTERS.map((f) => (
                      <option key={f} value={f}>
                        필터 {f}
                      </option>
                    ))}
                  </select>
                </label>
                <Slider
                  label="R"
                  value={mix[0]}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => setMix(0, v)}
                />
                <Slider
                  label="G"
                  value={mix[1]}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => setMix(1, v)}
                />
                <p>B {mix[2]} (합이 1이 되도록 자동)</p>
              </>
            )}
          </fieldset>
        </section>
      </main>

      <section className="tn-json">
        <div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(json).then(() => setCopied(true));
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            JSON 복사
          </button>
          <span role="status">
            {copied ? `복사했습니다. src/presets/${draft.code}.json에 붙여 넣으세요.` : ''}
          </span>
        </div>
        <textarea readOnly value={json} rows={16} aria-label="프리셋 JSON" />
      </section>
    </div>
  );
}

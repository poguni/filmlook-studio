// WebGL2 미리보기 렌더러. 사진 텍스처 + 33³ LUT 3D 텍스처 (PRD 6.2)
import type { Lut } from '../color/lut';
import vertSrc from './shaders/fullscreen.vert.glsl?raw';
import fragSrc from './shaders/lut.frag.glsl?raw';

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type);
  if (!s) throw new Error('셰이더를 만들 수 없습니다');
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) ?? '셰이더 컴파일 실패');
  return s;
}

export interface Pixels {
  width: number;
  height: number;
  /** RGBA, 위쪽 줄부터 */
  data: Uint8Array;
}

/** 입자 설정. amount 0~1(0이면 없음), cell은 이 렌더 타깃의 픽셀 단위 */
export interface GrainSettings {
  amount: number;
  cell: number;
}

export interface RenderOptions {
  strength: number; // 0~1
  compare?: number; // 0~1
  grain?: GrainSettings;
  /** 타일 렌더링에서 이 타일의 왼쪽 위가 전체 사진에서 놓이는 위치(픽셀) */
  offset?: [number, number];
  /** 비네팅 양 0~1 (PRD E-06) */
  vignette?: number;
  /** 사진 전체 크기(이 렌더 타깃의 픽셀). 타일·확대에서 비네팅 중심을 맞추려고 씀. 없으면 렌더 타깃 크기 */
  imageSize?: [number, number];
}

export class Renderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly imageTex: WebGLTexture;
  private readonly lutTex: WebGLTexture;
  private readonly uStrength: WebGLUniformLocation | null;
  private readonly uLutSize: WebGLUniformLocation | null;
  private readonly uCompare: WebGLUniformLocation | null;
  private readonly uGrain: WebGLUniformLocation | null;
  private readonly uGrainCell: WebGLUniformLocation | null;
  private readonly uOffset: WebGLUniformLocation | null;
  private readonly uHeight: WebGLUniformLocation | null;
  private readonly uVignette: WebGLUniformLocation | null;
  private readonly uImageSize: WebGLUniformLocation | null;
  private last: RenderOptions = { strength: 0 };
  private hasImage = false;

  /** WebGL2를 쓸 수 없으면 null. 썸네일·저장용으로 OffscreenCanvas도 받음 */
  static create(canvas: HTMLCanvasElement | OffscreenCanvas): Renderer | null {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      // 두 캔버스 종류를 함께 받으면 TS가 반환 타입을 넓게 잡는 경우가 있어 webgl2로 고정
    }) as WebGL2RenderingContext | null;
    return gl ? new Renderer(gl) : null;
  }

  private constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertSrc));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program) ?? '링크 실패');
    this.program = program;
    gl.useProgram(program);
    gl.bindVertexArray(gl.createVertexArray());
    gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);
    gl.uniform1i(gl.getUniformLocation(program, 'u_lut'), 1);
    this.uStrength = gl.getUniformLocation(program, 'u_strength');
    this.uLutSize = gl.getUniformLocation(program, 'u_lutSize');
    this.uCompare = gl.getUniformLocation(program, 'u_compare');
    this.uGrain = gl.getUniformLocation(program, 'u_grain');
    this.uGrainCell = gl.getUniformLocation(program, 'u_grainCell');
    this.uOffset = gl.getUniformLocation(program, 'u_offset');
    this.uHeight = gl.getUniformLocation(program, 'u_height');
    this.uVignette = gl.getUniformLocation(program, 'u_vignette');
    this.uImageSize = gl.getUniformLocation(program, 'u_imageSize');

    this.imageTex = this.createTexture(gl.TEXTURE_2D, 0);
    this.lutTex = this.createTexture(gl.TEXTURE_3D, 1);
    // LUT를 받기 전에도 텍스처가 완전하도록 2³ 항등 LUT로 시작
    const id = new Float32Array(2 * 2 * 2 * 4);
    for (let i = 0; i < 8; i++) id.set([i & 1, (i >> 1) & 1, (i >> 2) & 1, 1], i * 4);
    this.setLut({ size: 2, data: id });
  }

  private createTexture(target: number, unit: number): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(target, tex);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (target === gl.TEXTURE_3D) gl.texParameteri(target, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    return tex;
  }

  /** 사진(미리보기 비트맵)이나 저장용 타일 조각(2D 캔버스) */
  setImage(bitmap: ImageBitmap | OffscreenCanvas): void {
    const gl = this.gl;
    gl.canvas.width = bitmap.width;
    gl.canvas.height = bitmap.height;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    this.hasImage = true;
  }

  setLut(lut: Lut): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, this.lutTex);
    // RGBA16F는 WebGL2에서 선형 보간이 보장되는 실수 형식 (32F는 확장이 필요)
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.RGBA16F,
      lut.size,
      lut.size,
      lut.size,
      0,
      gl.RGBA,
      gl.FLOAT,
      lut.data,
    );
    gl.uniform1f(this.uLutSize, lut.size);
  }

  render(opts: RenderOptions): void {
    if (!this.hasImage) return;
    const gl = this.gl;
    this.last = opts;
    const grain = opts.grain ?? { amount: 0, cell: 1 };
    const [ox, oy] = opts.offset ?? [0, 0];
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(this.program);
    gl.uniform1f(this.uStrength, opts.strength);
    gl.uniform1f(this.uCompare, opts.compare ?? 0);
    gl.uniform1f(this.uGrain, grain.amount);
    gl.uniform1f(this.uGrainCell, Math.max(1, grain.cell));
    gl.uniform2f(this.uOffset, ox, oy);
    gl.uniform1f(this.uHeight, gl.drawingBufferHeight);
    gl.uniform1f(this.uVignette, opts.vignette ?? 0);
    const [iw, ih] = opts.imageSize ?? [gl.drawingBufferWidth, gl.drawingBufferHeight];
    gl.uniform2f(this.uImageSize, iw, ih);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** 마지막 설정으로 다시 그린 뒤 픽셀을 읽음 (화면 표시 후 버퍼가 비워지므로) */
  readPixels(): Pixels {
    const gl = this.gl;
    this.render(this.last);
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const raw = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, raw);
    // readPixels는 아래쪽 줄부터 돌려주므로 위아래를 뒤집음
    const data = new Uint8Array(raw.length);
    const row = w * 4;
    for (let y = 0; y < h; y++) data.set(raw.subarray((h - 1 - y) * row, (h - y) * row), y * row);
    return { width: w, height: h, data };
  }
}

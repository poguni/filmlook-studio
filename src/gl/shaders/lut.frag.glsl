#version 300 es
// 모든 프리셋이 공유하는 셰이더: LUT 조회 + 강도 섞기 + 입자. 프리셋별 분기는 넣지 않음 (PRD 5.4)
precision highp float;
precision highp int;
precision highp sampler3D;

uniform sampler2D u_image;
uniform sampler3D u_lut;
uniform float u_lutSize;
uniform float u_strength;
// 비교 경계선 위치(0~1). 왼쪽은 원본, 오른쪽은 결과. 저장할 때는 항상 0
uniform float u_compare;
// 입자 양(0~1, 0이면 입자 없음)과 입자 한 칸의 크기(이 렌더 타깃의 픽셀 단위)
uniform float u_grain;
uniform float u_grainCell;
// 이 렌더 타깃(타일)의 왼쪽 위가 전체 사진에서 놓이는 위치(픽셀). 입자를 사진 좌표로 만들어 타일 이음매를 없앰 (PRD 6.3)
uniform vec2 u_offset;
uniform float u_height;
// 비네팅 양(0~1, 0이면 없음)과 사진 전체 크기(이 렌더 타깃의 픽셀 단위). 타일·확대 화면에서도 사진 전체 기준으로 어둡게 함 (PRD E-06)
uniform float u_vignette;
uniform vec2 u_imageSize;

in vec2 v_uv;
out vec4 outColor;

// 입자 최대 진폭 (sRGB 값). 양 100일 때 약 ±30/255
const float GRAIN_AMP = 0.12;
// 비네팅 양 100일 때 네 귀퉁이의 밝기를 이만큼 줄임
const float VIGNETTE_MAX = 0.6;

// 좌표 해시: GPU마다 같은 결과가 나오도록 정수 연산만 씀 (PCG 2D)
float hash(ivec2 p) {
  uvec2 v = uvec2(p) * 1664525u + 1013904223u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  return float(v.x >> 8u) / 16777216.0;
}

// 값 노이즈 -1~1. 칸이 1픽셀이면 픽셀마다 독립인 값이 됨
float grainNoise(vec2 px) {
  vec2 q = (px - 0.5) / u_grainCell;
  ivec2 i = ivec2(floor(q));
  vec2 f = fract(q);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(hash(i), hash(i + ivec2(1, 0)), f.x);
  float b = mix(hash(i + ivec2(0, 1)), hash(i + ivec2(1, 1)), f.x);
  return mix(a, b, f.y) * 2.0 - 1.0;
}

void main() {
  vec3 src = texture(u_image, v_uv).rgb;
  // 격자점 중심을 정확히 짚도록 반 텍셀 보정
  vec3 coord = src * ((u_lutSize - 1.0) / u_lutSize) + 0.5 / u_lutSize;
  vec3 graded = texture(u_lut, coord).rgb;
  vec3 result = mix(src, graded, u_strength);
  // 사진 좌표(위쪽이 0). gl_FragCoord는 아래쪽이 0이라 뒤집음
  vec2 px = u_offset + vec2(gl_FragCoord.x, u_height - gl_FragCoord.y);

  if (u_vignette > 0.0) {
    // 사진 모양을 따르는 타원: 가운데 0, 네 귀퉁이 1. 렌즈처럼 선형광에서 어둡게 해 색이 탁해지지 않게 함
    float r = length((px / u_imageSize - 0.5) * 2.0) / sqrt(2.0);
    float fall = u_vignette * VIGNETTE_MAX * smoothstep(0.3, 1.0, r);
    result = pow(pow(result, vec3(2.2)) * (1.0 - fall), vec3(1.0 / 2.2));
  }

  if (u_grain > 0.0) {
    float l = dot(result, vec3(0.2126, 0.7152, 0.0722));
    // 필름처럼 중간 톤에서 가장 잘 보이고 아주 어둡거나 밝은 곳에서는 약하게
    float weight = 0.35 + 2.6 * l * (1.0 - l);
    result = clamp(result + grainNoise(px) * u_grain * GRAIN_AMP * weight, 0.0, 1.0);
  }

  outColor = vec4(v_uv.x < u_compare ? src : result, 1.0);
}

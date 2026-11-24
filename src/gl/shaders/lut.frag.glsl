#version 300 es
// 모든 프리셋이 공유하는 셰이더: LUT 조회 + 강도 섞기. 프리셋별 분기는 넣지 않음 (PRD 5.4)
precision highp float;
precision highp sampler3D;

uniform sampler2D u_image;
uniform sampler3D u_lut;
uniform float u_lutSize;
uniform float u_strength;

in vec2 v_uv;
out vec4 outColor;

void main() {
  vec3 src = texture(u_image, v_uv).rgb;
  // 격자점 중심을 정확히 짚도록 반 텍셀 보정
  vec3 coord = src * ((u_lutSize - 1.0) / u_lutSize) + 0.5 / u_lutSize;
  vec3 graded = texture(u_lut, coord).rgb;
  outColor = vec4(mix(src, graded, u_strength), 1.0);
}

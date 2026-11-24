#version 300 es
// 정점 버퍼 없이 화면 전체를 덮는 삼각형 하나
out vec2 v_uv;

void main() {
  vec2 pos = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  // 텍스처의 첫 줄(사진 위쪽)이 화면 위쪽에 오도록 v를 뒤집음
  v_uv = vec2(pos.x * 0.5 + 0.5, 0.5 - pos.y * 0.5);
  gl_Position = vec4(pos, 0.0, 1.0);
}

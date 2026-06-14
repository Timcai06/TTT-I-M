// 点云渲染顶点着色器 — 从 GPGPU 位置纹理读每粒子位置，透视投影 + 景深尺寸。
// 普通 R3F ShaderMaterial（GLSL ES 1.0）：three 注入 modelViewMatrix /
// projectionMatrix / position 等内建。
uniform sampler2D uPosition;  // GPGPU 位置纹理（每帧 compute 后的结果）
uniform float uPointSize;     // 基础点尺寸（已含 DPR）
uniform float uSizeAtten;     // 透视衰减系数（按相机距离调）

attribute vec2 reference;     // 该粒子在位置纹理里的 uv

varying float vFade;          // 远处粒子淡出

void main() {
  vec3 pos = texture2D(uPosition, reference).xyz;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float dist = max(-mv.z, 0.1);
  gl_PointSize = uPointSize * (uSizeAtten / dist);
  vFade = clamp(1.0 - dist * 0.03, 0.2, 1.0);
}

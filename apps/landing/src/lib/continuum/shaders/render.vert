// 点云渲染顶点着色器 — 从 GPGPU 位置纹理读每粒子位置，透视投影 + 景深尺寸。
// 普通 R3F ShaderMaterial（GLSL ES 1.0）：three 注入 modelViewMatrix /
// projectionMatrix / position 等内建。
uniform sampler2D uPosition;  // GPGPU 位置纹理（每帧 compute 后的结果）
uniform sampler2D uFromTarget;
uniform sampler2D uToTarget;
uniform float uMorph;
uniform float uMorphSpread;
uniform float uPointSize;     // 基础点尺寸（已含 DPR）
uniform float uSizeAtten;     // 透视衰减系数（按相机距离调）

attribute vec2 reference;     // 该粒子在位置纹理里的 uv

varying float vFade;          // 远处粒子淡出
varying float vSparkle;       // 稳定伪随机亮度，让星尘有可辨认的颗粒高光
varying float vWeight;        // 形态权重：核心/旋臂/尘埃的亮度层级

void main() {
  vec3 pos = texture2D(uPosition, reference).xyz;
  float seed = texture2D(uPosition, reference).w;
  vec4 fromTarget = texture2D(uFromTarget, reference);
  vec4 toTarget = texture2D(uToTarget, reference);
  float morph = clamp((uMorph - seed * uMorphSpread) / max(0.001, 1.0 - uMorphSpread), 0.0, 1.0);
  vec4 target = mix(fromTarget, toTarget, morph);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float dist = max(-mv.z, 0.1);
  vWeight = clamp(target.w, 0.15, 1.0);
  gl_PointSize = uPointSize * mix(0.82, 1.42, vWeight) * (uSizeAtten / dist);
  vFade = clamp(1.0 - dist * 0.03, 0.2, 1.0);
  vSparkle = fract(sin(dot(reference, vec2(127.1, 311.7))) * 43758.5453123);
}

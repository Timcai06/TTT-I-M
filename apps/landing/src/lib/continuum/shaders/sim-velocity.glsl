// 速度积分 — 朝当前形态目标的弹簧力 + curl 湍流，半隐式欧拉 + 阻尼。
// GPUComputationRenderer 注入：#define resolution、依赖采样器 texturePosition /
// textureVelocity。GLSL ES 1.0（texture2D / gl_FragColor）。
uniform float uTime;
uniform float uDelta;
uniform float uStiffness;   // 朝目标的刚度（per-form）
uniform float uTurbulence;  // curl 湍流强度（per-form）
uniform float uDamping;     // 速度阻尼（<1）
uniform float uNoiseScale;  // 湍流空间频率
uniform float uMorph;       // 当前滚动段的形态混合进度
uniform float uMorphSpread; // per-particle seed 错峰量，避免整体平移
uniform sampler2D uFromTarget;
uniform sampler2D uToTarget;

#include "lygia/generative/curl.glsl"

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec3 pos = texture2D(texturePosition, uv).xyz;
  float seed = texture2D(texturePosition, uv).w;
  vec4 velData = texture2D(textureVelocity, uv);
  vec3 vel = velData.xyz;
  vec3 fromTarget = texture2D(uFromTarget, uv).xyz;
  vec3 toTarget = texture2D(uToTarget, uv).xyz;
  float morph = clamp((uMorph - seed * uMorphSpread) / max(0.001, 1.0 - uMorphSpread), 0.0, 1.0);
  vec3 target = mix(fromTarget, toTarget, morph);

  // 弹簧力：朝目标收敛（刚度→0 时粒子自由漂移 = 解体形态）
  vec3 force = (target - pos) * uStiffness;

  // curl-noise 湍流：无散度旋度场，液体感扰动
  force += curl(pos * uNoiseScale + uTime * 0.05) * uTurbulence;

  vel = (vel + force * uDelta) * uDamping;

  gl_FragColor = vec4(vel, velData.w);
}

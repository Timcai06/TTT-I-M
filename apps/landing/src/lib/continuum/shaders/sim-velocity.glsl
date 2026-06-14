// 速度积分 — 朝当前形态目标的弹簧力 + curl 湍流，半隐式欧拉 + 阻尼。
// GPUComputationRenderer 注入：#define resolution、依赖采样器 texturePosition /
// textureVelocity。GLSL ES 1.0（texture2D / gl_FragColor）。
uniform float uTime;
uniform float uDelta;
uniform float uStiffness;   // 朝目标的刚度（per-form）
uniform float uTurbulence;  // curl 湍流强度（per-form）
uniform float uDamping;     // 速度阻尼（<1）
uniform float uNoiseScale;  // 湍流空间频率
uniform sampler2D uTarget;  // 当前形态的目标位置纹理（forms 注入）

#include "lygia/generative/curl.glsl"

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec3 pos = texture2D(texturePosition, uv).xyz;
  vec4 velData = texture2D(textureVelocity, uv);
  vec3 vel = velData.xyz;
  vec3 target = texture2D(uTarget, uv).xyz;

  // 弹簧力：朝目标收敛（刚度→0 时粒子自由漂移 = 解体形态）
  vec3 force = (target - pos) * uStiffness;

  // curl-noise 湍流：无散度旋度场，液体感扰动
  force += curl(pos * uNoiseScale + uTime * 0.05) * uTurbulence;

  vel = (vel + force * uDelta) * uDamping;

  gl_FragColor = vec4(vel, velData.w);
}

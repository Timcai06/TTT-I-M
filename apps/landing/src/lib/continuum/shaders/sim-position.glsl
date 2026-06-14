// 位置积分 — pos += vel * dt。w 通道保留每粒子 seed（morph 错峰用）。
// GPUComputationRenderer 注入：#define resolution、依赖采样器。GLSL ES 1.0。
uniform float uDelta;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec4 posData = texture2D(texturePosition, uv);
  vec3 vel = texture2D(textureVelocity, uv).xyz;

  vec3 pos = posData.xyz + vel * uDelta;

  gl_FragColor = vec4(pos, posData.w);
}

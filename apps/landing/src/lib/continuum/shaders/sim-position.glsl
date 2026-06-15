// 位置积分 — pos += vel * dt，并用滚动目标纹理做轻量锚定。
// GPUComputationRenderer 注入：#define resolution、依赖采样器。GLSL ES 1.0。
uniform float uDelta;
uniform float uAnchorStrength;
uniform sampler2D uTarget;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec4 posData = texture2D(texturePosition, uv);
  vec3 vel = texture2D(textureVelocity, uv).xyz;
  vec3 target = texture2D(uTarget, uv).xyz;

  vec3 pos = posData.xyz + vel * uDelta;
  float anchor = clamp(uAnchorStrength * uDelta, 0.0, 0.16);
  pos = mix(pos, target, anchor);

  gl_FragColor = vec4(pos, posData.w);
}

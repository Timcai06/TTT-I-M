// 位置积分 — pos += vel * dt，并用滚动目标纹理做轻量锚定。
// GPUComputationRenderer 注入：#define resolution、依赖采样器。GLSL ES 1.0。
uniform float uDelta;
uniform float uAnchorStrength;
uniform float uMorph;
uniform float uMorphSpread;
uniform sampler2D uFromTarget;
uniform sampler2D uToTarget;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec4 posData = texture2D(texturePosition, uv);
  vec3 vel = texture2D(textureVelocity, uv).xyz;
  vec3 fromTarget = texture2D(uFromTarget, uv).xyz;
  vec3 toTarget = texture2D(uToTarget, uv).xyz;
  float morph = clamp((uMorph - posData.w * uMorphSpread) / max(0.001, 1.0 - uMorphSpread), 0.0, 1.0);
  vec3 target = mix(fromTarget, toTarget, morph);

  vec3 pos = posData.xyz + vel * uDelta;
  float anchor = clamp(uAnchorStrength * uDelta, 0.0, 0.16);
  pos = mix(pos, target, anchor);

  gl_FragColor = vec4(pos, posData.w);
}

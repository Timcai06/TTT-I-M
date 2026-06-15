// 点云渲染片元着色器 — 柔边圆精灵，颜色 = 章节色温 tint，远处淡出。
precision highp float;

uniform vec3 uTint;       // 章节色温（landingScrollNarrative 注入）
uniform float uOpacity;   // 全局不透明度（密度调节 / 形态淡入）

varying float vFade;
varying float vSparkle;
varying float vWeight;

void main() {
  // 圆形遮罩 + 柔边
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;

  float soft = smoothstep(0.25, 0.02, d);
  float core = smoothstep(0.55, 1.0, vWeight);
  float star = smoothstep(0.94, 1.0, vSparkle) * mix(0.25, 1.0, vWeight);
  float dust = mix(0.12, 0.58, vWeight) + pow(vSparkle, 3.0) * 0.22;
  float halo = smoothstep(0.25, 0.001, d) * core * 0.34;
  float alpha = soft * vFade * uOpacity * (dust + star * 1.85 + halo);
  vec3 color = mix(uTint * 0.72, vec3(1.0), core * 0.22 + star * 0.18);
  gl_FragColor = vec4(color, alpha);
}

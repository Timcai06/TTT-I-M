// 点云渲染片元着色器 — 柔边圆精灵，颜色 = 章节色温 tint，远处淡出。
precision highp float;

uniform vec3 uTint;       // 章节色温（landingScrollNarrative 注入）
uniform float uOpacity;   // 全局不透明度（密度调节 / 形态淡入）

varying float vFade;

void main() {
  // 圆形遮罩 + 柔边
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;

  float soft = smoothstep(0.25, 0.02, d);
  gl_FragColor = vec4(uTint, soft * vFade * uOpacity);
}

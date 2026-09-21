uniform sampler2D uTexture;
uniform vec3 uTintCool;
uniform vec3 uTintWarm;

varying vec2 vUv;
varying float vLum;
varying float vAlpha;
varying float vEdge;

void main() {
  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  float r = dot(cxy, cxy);
  if (r > 1.0) discard;

  vec3 color = texture2D(uTexture, vUv).rgb;
  vec3 cool = mix(uTintCool * 0.8, color * 1.1, vLum);
  vec3 edgeGlow = vec3(0.85, 0.9, 1.0) * vEdge * 0.6;
  vec3 graded = mix(cool, uTintWarm, smoothstep(0.4, 0.95, vLum) * 0.3) + edgeGlow;

  float alpha = vAlpha * (1.0 - r) * 0.9;
  gl_FragColor = vec4(graded, alpha);
}

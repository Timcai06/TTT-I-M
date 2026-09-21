uniform sampler2D uTexture;
uniform float uTime;
uniform float uPixelRatio;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uDepth;
uniform float uPointSize;
uniform float uIntro;
uniform vec2 uAspect;

varying vec2 vUv;
varying float vLum;
varying float vAlpha;
varying float vEdge;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                          + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vUv = uv;

  vec3 tex = texture2D(uTexture, uv).rgb;
  float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));
  vec2 px = vec2(1.0 / 900.0, 1.0 / 1200.0);
  float lumX = dot(texture2D(uTexture, uv + vec2(px.x, 0.0)).rgb, vec3(0.2126, 0.7152, 0.0722));
  float lumY = dot(texture2D(uTexture, uv + vec2(0.0, px.y)).rgb, vec3(0.2126, 0.7152, 0.0722));
  float edge = smoothstep(0.03, 0.18, abs(lum - lumX) + abs(lum - lumY));
  float portraitLum = pow(lum, 0.72);
  vLum = portraitLum;
  vEdge = edge;
  float mask = smoothstep(0.015, 0.12, lum);
  vAlpha = max(mask * 0.95, edge * 0.45);

  vec3 pos = position;
  pos.xy *= uAspect;

  float depth = (portraitLum - 0.5) * uDepth;
  pos.z += depth * mask;

  float n = snoise(uv * 3.0 + uTime * 0.15);
  pos.z += n * 0.08 * mask;

  vec2 toMouse = pos.xy - uMouse * uAspect;
  float d = length(toMouse);
  float falloff = smoothstep(0.32, 0.0, d); // 缩小扩散半径 (从 0.55 缩减至 0.32)
  pos.xy += normalize(toMouse + 0.0001) * falloff * uMouseStrength;
  pos.z += falloff * uMouseStrength * 1.0;  // 略微降低 Z 轴推起的高度使之更平滑细腻

  float introOffset = (1.0 - uIntro) * (1.2 + n * 0.4);
  pos.z -= introOffset;
  vAlpha *= uIntro;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float size = uPointSize * (0.75 + portraitLum * 1.5 + vEdge * 1.35);
  gl_PointSize = size * uPixelRatio * (1.0 / -mvPosition.z);
}

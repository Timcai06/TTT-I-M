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
  // The mask has to gate the edge term, not compete with it. `max(mask, edge)`
  // let any luminance step light a point, and sensor noise in the photograph's
  // black background is a luminance step — which is where the drifting sparkles
  // above the head came from. They read as decorative dust, which is the one
  // thing a portrait made of points must not read as. Edges now brighten the
  // subject instead of inventing points outside it, and the floor moves off
  // 0.015 so near-black stays near-black.
  // A point belongs to the figure only if its neighbourhood does. The photograph
  // has isolated highlights scattered through its dark corners — catchlights,
  // sensor noise, a stray reflection — and a threshold on the pixel alone let
  // every one of them through as a lone bright dot on black with nothing around
  // it. On screen that is not a portrait dissolving, it is decorative dust, and
  // dust drifting over a headline is the oldest tell in the genre. Sampling six
  // texels out in four directions costs four taps and removes the whole class:
  // a speck's neighbourhood is black, a cheekbone's is not.
  vec2 far = px * 10.0;
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float around = dot(texture2D(uTexture, uv + vec2(far.x, 0.0)).rgb, LUMA)
               + dot(texture2D(uTexture, uv - vec2(far.x, 0.0)).rgb, LUMA)
               + dot(texture2D(uTexture, uv + vec2(0.0, far.y)).rgb, LUMA)
               + dot(texture2D(uTexture, uv - vec2(0.0, far.y)).rgb, LUMA);
  float body = smoothstep(0.085, 0.24, (lum + around) * 0.2);
  float mask = smoothstep(0.13, 0.32, lum) * body;
  // The dissolve has to follow the light or it reads as a halftone filter applied
  // in post. Flat alpha across the whole subject was exactly that: a uniform dot
  // lattice whose density said nothing about form. Weighting alpha by luminance
  // makes the shadow side thin out and the lit side hold together, which is what
  // the eye reads as a figure dissolving rather than an image screened.
  // Ink is opaque. Tone is carried by how much of the cell the dot covers, not by
  // how transparent it is; varying both at once is what made the field look like
  // a filter applied to a photograph instead of a screen laid over one.
  vAlpha = mask;

  vec3 pos = position;
  pos.xy *= uAspect;

  float depth = (portraitLum - 0.5) * uDepth;
  pos.z += depth * mask;

  // The drift stays, at a quarter of its old amplitude. At 0.08 it was enough to
  // see the plane swimming, and a print does not swim; at 0.02 it is the slow
  // breath that keeps the surface from looking like a static image.
  float n = snoise(uv * 3.0 + uTime * 0.15);
  pos.z += n * 0.02 * mask;

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

  // In a halftone the dot's radius IS the tone — it is the only variable the
  // screen has. The edge term used to add to it, which put a bright ring around
  // every contour (the rim-light read), so it is gone from the size as well as
  // from the colour.
  // A floor above a pixel: a dot that resolves to less than one shimmers as the
  // plane breathes, which is the giveaway that these are points and not ink.
  // A floor above a pixel, and a wide range above it: in a halftone the dot's
  // radius IS the tone, so the shadows need a dot that still resolves and the
  // highlights need one that nearly closes its cell.
  //
  // The screen was briefly rotated 15° off the image, which is what a press
  // does to stop the rows lining up with the picture's own horizontals. On this
  // lattice it cost 37% of the points to the oversized grid the rotation needs,
  // and a screen that sparse reads as confetti over a photograph rather than as
  // ink. The banding it was meant to cure turned out to be the CRT scanline
  // layer that used to sit on top of this one, and that is gone instead.
  float size = uPointSize * (0.62 + portraitLum * 2.9);
  gl_PointSize = size * uPixelRatio * (1.0 / -mvPosition.z);
}

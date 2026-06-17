#ifdef GL_ES
precision highp float;
#endif

uniform float iTime;
uniform vec2 iResolution;
uniform vec3 uColorLow;   // near-black (valleys)
uniform vec3 uColorHigh;  // red (peaks)
uniform float uColorSteps; // quantization levels for the dither banding
uniform float uScale;      // noise field zoom
uniform float uSpeed;      // drift speed
uniform float uPixelSize;  // chunk size (device px) for the retro dither dots
uniform float uFade;       // 0→1 mount fade-in

// ── Value-noise fbm: a slow organic field that the dither quantizes into bands.
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 34.123); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, amp = 0.5;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += amp * vnoise(p); p = m * p * 2.0 + 11.0; amp *= 0.5; }
  return v;
}

// ── 8x8 ordered (Bayer) dithering, computed without array indexing (WebGL1-safe).
float Bayer2(vec2 a){ a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
#define Bayer4(a)  (Bayer2(0.5 * (a)) * 0.25 + Bayer2(a))
#define Bayer8(a)  (Bayer4(0.5 * (a)) * 0.25 + Bayer2(a))

void main(){
  // Pixelate to chunky blocks so the dither reads as retro pixel dots (his look).
  // `block` is the integer cell index; `frag` is its sampling origin.
  vec2 block = floor(gl_FragCoord.xy / uPixelSize);
  vec2 frag = block * uPixelSize;

  vec2 uv = frag / iResolution.xy;
  vec2 p = uv * uScale;
  p.x *= iResolution.x / max(iResolution.y, 1.0); // keep the field square, not stretched

  float t = iTime * uSpeed;
  // Domain-warped drift so the field churns instead of just sliding.
  float n = fbm(p + vec2(t * 0.15, t * 0.08) + fbm(p - t * 0.05));
  // A faint diagonal swell gives the dither a consistent banding direction.
  n = n * 0.72 + 0.28 * (0.5 + 0.5 * sin((uv.x + uv.y) * 3.0 - t * 0.6));
  n = clamp(n, 0.0, 1.0);

  // Black-dominant two-tone ramp: a steep gamma keeps most of the field near-black
  // and lets the red surface only in the brighter dither bands — matching the
  // reference's dark-dominant balance (recolored black↔red).
  float ramp = pow(n, 1.7);
  vec3 col = mix(uColorLow, uColorHigh, ramp);

  // Ordered dither on the BLOCK grid → one Bayer cell per chunk (chunky dots).
  float threshold = Bayer8(block) - 0.5;
  col += threshold / uColorSteps;
  col = floor(col * (uColorSteps - 1.0) + 0.5) / (uColorSteps - 1.0);

  gl_FragColor = vec4(col * uFade, 1.0);
}

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

  // color * 1.1 held the whole portrait under a quarter of the panel's white.
  // It is the only light source in the frame and it was losing to 10px mono.
  // A print, not a dissolve.
  //
  // "Human head made of floating dots" is the three.js demo the whole genre
  // ships, and every soft-edged, edge-lit, drifting point on this plane was
  // saying so. The geometry underneath is already a regular grid, which is also
  // what a halftone screen is — so the same points, given hard edges and a
  // radius that is purely a function of tone, stop reading as particles and
  // start reading as a screened photograph. That is a print reference, which is
  // the register the rest of the page is in.
  vec3 color = texture2D(uTexture, vUv).rgb;
  vec3 cool = mix(uTintCool * 0.8, color * 1.28, vLum);
  vec3 graded = mix(cool, uTintWarm, smoothstep(0.4, 0.95, vLum) * 0.3);

  // A halftone dot has an edge. `1.0 - r` feathered every point across its whole
  // radius, which is what made the field read as fog rather than as ink.
  float ink = 1.0 - smoothstep(0.62, 1.0, r);
  float alpha = vAlpha * ink;
  gl_FragColor = vec4(graded, alpha);
}

# Vendored LYGIA shaders

Source: [LYGIA](https://lygia.xyz) v1.4.1 (npm `lygia@^1.4.1`), MIT/BSD-like
prosperity license — see upstream `LICENSE.md`.

Only the dependency closure for **curl noise** (particle turbulence) is vendored,
preserving LYGIA's internal relative `#include` structure so its own includes
resolve inside this tree:

```
generative/curl.glsl        ← curl(vec2|vec3|vec4) turbulence
generative/snoise.glsl      ← simplex noise (curl's gradient source)
math/{mod289,permute,taylorInvSqrt,grad4}.glsl   ← snoise deps
```

The npm `lygia` package was removed after vendoring — these copies are the single
source of truth, version-pinned. To upgrade: re-copy the same files from a pinned
`lygia` release and bump the version above.

Resolved at build by `vite-plugin-glsl` (`#include`). Do not edit the vendored
files; treat them as third-party.

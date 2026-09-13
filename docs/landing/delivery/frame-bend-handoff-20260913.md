# Frame Canvas handoff

Frame's horizontal Bend previously required `visible` both to allocate its
canvas and to initialize the effect. Crossing a viewport boundary destroyed the
renderer, so another chapter or a reverse scroll repeated DOM cloning, image
decode, shader compilation and texture upload before Canvas could take over.
The late-created handle also missed scroll updates made while it was pending.

The preparation range now extends one viewport in either direction. Preparation
and visible rendering have separate lifetimes: a prepared effect pauses outside
the viewport and resumes with its current scroll state. A canvas pool transfers
released contexts to waiting chapters and retains at most one idle canvas while
Frame is nearby. The same canvas reuses its compiled shader program. All contexts
remain registered against the existing admission limit; failed contexts and idle
contexts outside Frame are explicitly disposed. Textures and capture DOM remain
owned by the current section and are released on handoff.

The scroll hook retains progress, distance and direction even before a handle
exists, including restored scroll positions and refreshes. Preparation initializes
the effect with that state. Image warmup includes both neighbouring clusters.
First capture waits for the images intersecting the capture viewport to decode;
canvas sizing happens before capture so a resize cannot clear the first uploaded
frame. DOM remains the fallback until the first successful texture-backed draw.

Validation: production build, all ten build guards, scoped ESLint, and 24 pool, Bend math, context
registry and local-effect lifecycle tests passed. Pool tests execute the actual
module with controlled context admission and cover reuse, queued handoff,
cancellation, failed contexts and release after leaving Frame. These checks do
not establish browser capture quality or measured transition latency. Per tim's
instruction, no frontend visual acceptance or screenshots were performed.

# Visual System & Art Direction

个人空间专项的最新方向见 [空间与滚动叙事](landing/experience/spatial-narrative.md)：延续本页的排版与摄影气质，同时允许胡桃木、纸张、布面、暖灰墙面和局部暖光。下方材质及转场建议不要求每个物件采用金属/玻璃，也不要求每段衔接都使用强烈冲击动效。

## Core Aesthetics
- **Keywords**: Darkroom exposure, engineering blueprints, mechanical precision, editorial layout, minimal but powerful.
- **Vibe**: Cold, photographic, academic/engineering hybrid, slightly experimental.

## Anti-Patterns (DO NOT INTRODUCE)
- Cheap sci-fi aesthetics / neon cyberpunk.
- Purple/blue glowing orbs or generic SaaS gradients.
- Overly noisy decorative lines or chaotic layouts.
- Standard opacity/fade transitions (too basic).

## Materials & Lighting (3D)
- **Materials**: Favour metallic, glass (high refraction/transmission), obsidian, or high-contrast negative film styles.
- **Lighting**: Restrained. Use volumetric spot lights, thermal imaging shaders, or rim lights. Avoid global ambient blasts.

## Transitions & Interactions
- **Chapter Transitions**: Should feel physical. Think mechanical shutter slams, glass shattering with refraction, or focal plane shifts.
- **Typography**: Text should have weight. Hover states should create tension (e.g., magnetic pull, slight tracking expansion, exposure flashes) rather than simple color changes.

## Layout Rules
- **Frame (Photography)**: Editorial-level whitespace. Do not cram images. Let them breathe like in a high-end magazine or gallery.
- **Hero/About**: 3D and particle systems should frame and enhance the typography, not overpower it. Typography is the core architecture.

## Corner Radius (design language)

Every radius used to be a one-off. The only accidental clusters were 18px and
12px, and the Index frame's 44px was unique — which is a problem, because
that frame is the shape the work is meant to be recognised by. Four steps
in `packages/tokens/src/tokens.css` absorb all of it, mirrored as `radii` in
`packages/tokens/src/index.ts`:

| token | value | used for |
| --- | --- | --- |
| `--radius-sm` | 12px | dialogs, carousels, small media frames |
| `--radius-md` | 18px | panels, buttons, bento cards, footer |
| `--radius-lg` | 24px | scroll-expand frame, border-glow cards |
| `--radius-signature` | 44px | the Index frame at the opening shot, and only it |

Pick a step. Do not introduce a fifth value, and do not reach for
`--radius-signature` for anything that is not the Index: it is a signature because
it appears once.

**Never on a projected surface.** `.archive-bridge__page`,
`.archive-chapter-bridge__page`, `.archive-bridge__page--source`,
`.archive-handoff-page` and `.hero__screen-page` carry an inline `matrix3d`
homography. Their corners are the seam the projection hides; a radius there cuts
into the quad and shows the room behind it. `tests/build/chapter-state-guards.mjs`
fails the build if one appears on the element itself — a rounded badge drawn
*inside* one is fine, because the homography carries it like any other pixel.

The Index frame is the exception that proves the rule, and the reason is
geometric rather than a special case. It is a `clip-path` scaled by
`--index-frame`, which is the camera's pull-back: 1 only at the opening shot,
where the camera stands on the monitor's own normal and the homography degenerates
to an axis-aligned rectangle, and 0 everywhere the quad is warped. So the radius
exists exactly in the state where a rounded frame can read as a frame. A static
`border-radius` would look right in that one frame and cut the corners through the
entire rest of the pull-back, which is what the guard is there to prevent.

## Sound

The room is scored with its own materials, not with music: one bed, which is the
outside arriving through the window and rises as the camera approaches it, and four
cues that are recordings of paper, a drawer and a book. There is deliberately no
second interior layer — the available public-domain room tone carried voices, and a
room with a single opening is honestly represented by what comes through it.
Provenance and processing are recorded in `THIRD_PARTY_NOTICES.md`. Sound is opt-in
and off by default; nothing in the visual narrative may depend on it.

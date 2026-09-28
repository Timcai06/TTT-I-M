# Darkroom film — 3D asset brief (for GPT / Codex)

> Attach the three keyframes (safelight / developing / lights-on) as the visual target.

## Context

You are building the props for a 12–15 s cinematic intro film: a photographic darkroom under a red
safelight, where black-and-white prints develop in a tray, then the white light comes on and a portrait
print hangs on a line. Another artist will assemble the scene, light it, animate the camera and the
liquid, write the print-development shader, and render in **Blender Cycles**. Your job is **only the
assets**. They must hold up in **macro close-ups** (lens 70–100 mm, 20–40 cm from the subject), so
edges, bevels, surface wear and small mechanical parts matter more than polygon economy.

The attached keyframes are the target for form, material and level of detail.

## Technical requirements (apply to every asset)

- **Blender 5.2**, built by a Python script you also deliver (`build_assets.py`), run with
  `blender -b -P build_assets.py`. It writes `darkroom_assets.blend`.
- Metres, **real-world scale**, Z up. Every object sits on Z = 0 unless noted, with **the origin at its
  natural pivot** (noted per asset).
- Name everything with the prefix `DR_`. Each asset goes in its own collection, named after the asset.
- Materials: **Principled BSDF only**, Cycles-compatible. Use procedural textures, or images **packed
  into the .blend**. No external file dependencies and no add-ons.
- Clean topology: real bevels on every hard edge (no knife-sharp 90° edges), smooth shading where
  appropriate, UV-unwrapped wherever an image or decal may later be applied. Keep modifiers live
  (Bevel, Subdivision, Solidify) where they are useful for later adjustment.
- **No lights, cameras or world** in the asset file, except in the separate preview scene below.
- Also render **one preview PNG per asset** (1600×1000, Cycles, neutral grey studio light, a 3/4 view
  and a close-up) to `previews/`.
- Output folder: `/Users/tim/DEV/TTT I'M/portfolio/apps/landing/output/darkroom/assets/`

## Assets

### Hero tier (seen in macro close-ups)

1. **`DR_Tray`**: photographic developing tray for 8×10" paper. Inner about 30 × 38 × 6 cm, 3–4 mm
   walls, rolled rim lip, a pour spout in one corner, and shallow ribs on the floor. Semi-gloss white
   polystyrene with faint use scratches and chemical staining near the waterline. Origin: centre of the
   floor. Also provide an **inner-volume helper mesh** (`DR_Tray_LiquidBounds`, hidden) that exactly
   fills the inside up to 3.5 cm high, for the liquid.
2. **`DR_Tongs`** ×2: print tongs, a bamboo shaft about 20 cm long with a moulded red rubber tip. One
   plain tip, one ribbed tip. Visible bamboo grain and nodes. Origin: the tip end, for animation.
3. **`DR_Paper`**: photographic print sheets 8×10" (20.3 × 25.4 cm) and 10×8", 0.3 mm thick, with
   enough subdivision (at least 80×100 quads) to bend, curl and sag under a deform. UVs 0–1 over the
   **whole sheet**, portrait orientation. Fibre-base paper surface: a subtle procedural tooth in a
   separate bump node. Origin: centre of the top edge (for hanging).
4. **`DR_Clothespin`**: wooden clothespin with a coiled steel spring, both halves as separate objects,
   parented so it can open. Origin: the spring axis.
5. **`DR_Line`**: twisted jute/twine line as a curve with real twist geometry, about 2 m long, with
   an adjustable sag (a hook or control point in the middle). Origin: left end.
6. **`DR_Sink`**: stainless-steel darkroom sink, about 180 × 70 cm, 18 cm deep. Rolled front edge,
   backsplash, one drain with a strainer, and brushed anisotropic steel with water spots and faint
   scratches. Include **a scatter of water droplets** (separate object `DR_Droplets`, flattened
   spheres of varied size, on the rim and floor) that can be switched off.

### Mid tier (seen at 50 mm, 0.5–1 m)

7. **`DR_Timer`**: a GraLab 300-style darkroom timer. Metal housing with screws, a glass bezel, a
   luminous dial with 0–55 numerals and minute ticks (the numerals and ticks as a **separate emissive
   material** `DR_TimerGlow`, teal-green), and the minute and second hands as **separate objects with
   origins at the dial centre** so they can be animated.
8. **`DR_Safelight`**: a round Kodak-style safelight lamp on a wall bracket, with a metal housing, a
   screw ring, and a dark-red filter glass disc as a **separate object** (so emission can go on it).
   Origin: the bracket's wall mount.
9. **`DR_Bottles`**: three amber glass chemical bottles (1 L, 500 ml, 250 ml) with black screw caps,
   real glass thickness, and paper labels with faint handwriting-like marks (UV-mapped decal planes).
   Plus one clear glass graduated cylinder, 250 ml, with printed graduations.

### Background tier (always out of focus)

10. **`DR_Enlarger`**: a Beseler-style photographic enlarger: a column, a bellows head and a
    baseboard. Silhouette accuracy matters more than detail.
11. **`DR_Shelf`**: a wall shelf with an assortment of jars, film canisters and paper boxes, to fill
    the background with small bokeh highlights.

## Do not

- Do not model hands or people.
- Do not add text or logos on any surface (labels may carry illegible pencil marks only).
- Do not put photographs on the paper: the artist maps the prints later.

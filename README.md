# Tim Cai - Personal Portfolio

A highly interactive, visually driven personal portfolio built with React, Vite, GSAP, and Three.js. 
This project focuses on editorial design, physical animation metaphors, and seamless WebGL integration.

## Core Tech Stack
- **Framework**: React 19 + Vite
- **Animation**: GSAP (ScrollTrigger, SplitText) + Lenis (Smooth Scroll)
- **3D / WebGL**: Three.js + React Three Fiber (R3F)
- **Interaction**: Pretext (Typography physics)

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
npm install
```

### Local Development
```bash
# This will automatically run `scripts/setup-assets.mjs` via the predev hook
npm run dev
```

## Available Scripts
- `npm run dev` - Start local development server.
- `npm run build` - Typecheck and build for production.
- `npm run typecheck` - Verify TypeScript integrity.
- `npm run lint` - Run ESLint.
- `npm run test:build` - Run architectural build guards.
- `npm run test:e2e` - Run Playwright tests.

## Engineering Guidelines
This project is governed by strict visual and performance rules. Please refer to the `docs/` directory for detailed architecture blueprints:
- [Architecture & Flow](docs/01-architecture.md)
- [Visual System](docs/02-visual-system.md)
- [Performance Strategy](docs/03-performance-and-assets.md)
- [File Structure](docs/04-file-structure.md)
- [Tests & Guards](docs/05-tests-and-guards.md)

**Crucial Note for Contributors & AI Agents**: 
Never sacrifice visual quality (3D shaders, GSAP transitions) for simplistic performance metrics. See `.clauderules`, `.codexrules` and `.antigravityrules` for the mandatory collaboration boundaries.

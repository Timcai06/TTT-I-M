# File Structure & Directory Governance

## `/src` Structure
- `components/`: Pure UI components, wrappers, and visual elements without deep business logic.
- `chapters/`: Large-scale page sections (Hero, About, Frame, Work). These act as lazy-loaded boundaries.
- `lib/`: Core infrastructure (GSAP context, Lenis setup, Loader logic, utility functions).
- `data/`: Static content, copywriting, and project configurations.
- `styles/`: Global CSS, variables, resets, and mixins.
- `assets/`: Media files that require Vite's hashing and processing pipeline.

## `/public` vs `/src/assets`
- **`public/`**: Static assets that are served as-is (e.g., `favicon.ico`, `robots.txt`, or dynamically fetched heavy JSON/models that bypass the Vite bundler).
- **`src/assets/`**: Images, SVGs, or fonts that are imported directly into JS/CSS and benefit from Vite's cache busting and optimization.

## Root Directories
- `scripts/`: Node.js scripts for asset generation, preprocessing, or environment setup.
- `tests/`: End-to-end tests (Playwright) and build architecture guards.
- `docs/`: Project documentation and engineering blueprints.

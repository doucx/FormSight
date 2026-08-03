## [COMMIT] feat(star-hopping): Implement dynamic Vite+Preact Star-Hopping web application

~~~~~act
git_add
.gitignore
package.json
tsconfig.json
tsconfig.node.json
vite.config.ts
postcss.config.js
tailwind.config.js
index.html
src/vite-env.d.ts
src/index.css
src/main.tsx
src/app.tsx
src/types/index.ts
src/utils/geometry.ts
src/components/StarCanvas.tsx
src/utils/db.ts
src/utils/adaptiveEngine.ts
src/views/Dashboard.tsx
src/views/TrainingView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(star-hopping): Implement dynamic Vite+Preact Star-Hopping web application

Replaces the static Anki python deck generator with a fully interactive, adaptive Vite/Preact Single Page Application for sketch perception and shape-finding exercises.

Key features added:
1. **Core Geometry Engine (`src/utils/geometry.ts`)**:
   - Supports Single Anchor, Double Anchor Horizontal, and Double Anchor Rotated modes.
   - Dynamic 5x5 grid generation and Hit Detection logic with Euclidean distance tolerance.

2. **Dual Canvas Renderer (`src/components/StarCanvas.tsx`)**:
   - 500x500 side-by-side pure white canvas layout (Reference vs. Interactive Answer area).
   - Real-time DPI-aware mouse/touch coordinate mapping and visual feedback (Green crosshairs for correct targets, red error vectors for misses).

3. **Adaptive Staircase Engine (`src/utils/adaptiveEngine.ts`)**:
   - Implements the 3-Up / 1-Down staircase method targeting an optimal ~80% accuracy flow state across grid step sequences (from 35px down to 3px).

4. **IndexedDB Local Storage Layer (`src/utils/db.ts`)**:
   - Robust offline data persistence for sessions, atomic trial records, and user capability profiles using the `idb` library.
   - Full JSON export and import capabilities for data portability.

5. **Complete UI & Workflow (`src/views/`)**:
   - **Dashboard View**: Overview of all 3 training modes with current degree metrics, history accuracy, training triggers, and benchmark tests.
   - **Training View**: Live telemetry (timer, trial count, current grid step, real-time accuracy) with keyboard shortcut support (`Space` for next, `Esc` to exit).
~~~~~

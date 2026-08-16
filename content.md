~~~~~act
git_add
src/utils/relativeColorUtils.ts
src/components/RelativeColorCanvas.tsx
src/utils/__tests__/relativeColorUtils.test.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(color): transform relative color vector shift into 4-choice distractor mode

Transformed the continuous HSV slider dragging mode in the Relative Color (Vector Shift) module into a discrete 4-choice candidate selection practice, resembling OKLab space star-hopping exercises.

Key changes:
1. Implemented a deterministic orthogonal displacement algorithm in OKLab space for candidate distractor generation, scaling with difficulty levels and avoiding gamut collision / infinite loops.
2. Re-arranged UI layout in `RelativeColorCanvas`: HSV slider gauges are now positioned as a locked, read-only reactive diagnostic dashboard above the 4 clickable candidate option cards.
3. Removed all distracting explanatory headers and tags, aligning the module's visual style with the rest of the application.
4. Added robust keyboard navigation support (`1~4` keys to select candidates, `Space` to submit).
5. Updated corresponding unit tests and ensured full backward compatibility with V4 IndexedDB schema.
~~~~~

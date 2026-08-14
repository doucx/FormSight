## [COMMIT] test(utils): Add comprehensive unit tests and Vitest setup

~~~~~act
git_add
package.json
src/utils/__tests__/adaptiveEngine.test.ts
src/utils/__tests__/colorUtils.test.ts
src/utils/__tests__/db.test.ts
src/utils/__tests__/geometry.test.ts
src/utils/__tests__/settings.test.ts
vite.config.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
test(utils): Add comprehensive unit tests and Vitest setup

- Configured Vitest and `@vitest/coverage-v8` in vite.config.ts and package.json.
- Added fake-indexeddb to support offline IndexedDB and database import/export testing.
- Created robust unit test suites for:
  - Spatial geometry algorithms and question generation (geometry.test.ts).
  - HSV color conversion, tolerance, cyclic hue distance, and color question generation (colorUtils.test.ts).
  - Staircase & block adaptive training progression engine (adaptiveEngine.test.ts).
  - LocalStorage settings persistence (settings.test.ts).
  - DB record persistence, time formatting, session aggregation, and full JSON export/import (db.test.ts).
- Implemented weighted target sector generation tests for star-hopping and color recognition.
~~~~~

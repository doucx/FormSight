## [COMMIT]

~~~~~act
git_add
src/utils/sound.ts
src/utils/settings.ts
src/hooks/useTrainingSession.ts
src/components/GlobalSettingsModal.tsx
src/utils/geometry/hitDetection.ts
src/components/StarCanvas.tsx
src/test/setup.ts
vite.config.ts
src/utils/__tests__/sound.test.ts
src/utils/__tests__/settings.test.ts
src/utils/__tests__/db.test.ts
src/utils/__tests__/geometry.test.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(audio & canvas): Add Web Audio API feedback system and dynamic crosshair scaling

1. Audio Feedback System (Web Audio API):
   - Created src/utils/sound.ts with zero-dependency synthetic audio synthesis.
   - Implemented playHitSound(streak) with dynamic pitch scaling based on streak count and playMissSound() for gentle error feedback.
   - Added soundEnabled toggle in global settings and migrated legacy config compatibility.

2. Dynamic Crosshair Scaling:
   - Added getGridMinSpacing and getDynamicCrosshairMetrics in src/utils/geometry/hitDetection.ts to calculate grid density and adaptively scale correct answer green crosshairs, line widths, and error dashed lines.

3. Test Infrastructure Improvement:
   - Extracted global localStorage mock into src/test/setup.ts via Vitest setupFiles, eliminating duplicated polyfill boilerplate across test files.
~~~~~

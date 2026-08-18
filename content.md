## [COMMIT]

~~~~~act
git_add
src/config/domains.ts
src/config/trainingPlugins.tsx
src/components/RelativeColorCanvas.tsx
src/utils/relativeColorUtils.ts
src/utils/__tests__/relativeColorUtils.test.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(relative-color): Integrate Albers simultaneous contrast training modes and 2AFC

Integrated Josef Albers' simultaneous contrast and visual illusion combat training suite into the 'relative_color' module, adding 3 new training modes alongside the existing vector shift mode:
1. LIGHTNESS_INDUCTION: Lightness contrast induction and physical compensation.
2. HUE_INDUCTION: Hue/chroma induction and complementary color reconciliation.
3. DECONTEXTUAL_2AFC: Environmental penetration 2AFC binary judgment with 50/50 trap/control randomization to prevent heuristic cheating.

Also:
- Removed white borders and outer shadows from central swatches in Albers training modes to allow direct OkLab color boundary contact with backgrounds.
- Fixed TypeScript optional property strict null check errors in relativeColorUtils.test.ts and expanded full test coverage.
~~~~~

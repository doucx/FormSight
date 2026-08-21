## [COMMIT] feat(relative-color): implement HUE_INDUCTION 4AFC mode and clean up answer bars

~~~~~act
git_add
src/components/RelativeColorCanvas.tsx
src/components/abstraction/GestureAxisView.tsx
src/components/abstraction/NotanThresholdView.tsx
src/components/abstraction/TopDown2AfcView.tsx
src/components/abstraction/TopDownPatternView.tsx
src/components/negativeSpace/AreaComparison2AfcView.tsx
src/components/negativeSpace/RatioEstimationView.tsx
src/components/negativeSpace/ShapeMemory2AfcView.tsx
src/components/negativeSpace/VertexFittingView.tsx
src/components/relativeColor/AlbersInductionView.tsx
src/components/relativeColor/Decontextual2AfcView.tsx
src/components/relativeColor/HueInductionView.tsx
src/config/cards.ts
src/config/plugins/relativeColorPlugin.tsx
src/utils/relativeColor/generators.ts
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(relative-color): implement HUE_INDUCTION 4AFC mode and clean up answer bars

- Added new `HueInductionView` component for 4AFC hue induction tasks with keyboard shortcuts (1-4, Space).
- Updated `RelativeColorCanvas` and `relativeColorPlugin` to support `HUE_INDUCTION` mode with options and correctIndex.
- Updated question generator `generateHueInductionQuestion` to use tetrahedral distractor generation for 4-choice options.
- Removed redundant answer diagnostic bars across multiple abstraction and negative space views for a cleaner UX.
~~~~~

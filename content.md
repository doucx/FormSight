# 📸 Snapshot Capture

### 💬 备注:
checkf

检测到工作区发生变更。

### 📝 变更文件摘要:
```
src/components/SessionSummaryModal.tsx             | 12 +++++++---
 src/components/common/Choice2AfcContainer.tsx      |  7 ++++--
 src/components/common/ChoiceNafcContainer.tsx      |  3 ++-
 src/components/common/QuestionCardShell.tsx        |  4 +++-
 src/components/common/StandardSliderView.tsx       |  4 +++-
 src/components/common/TagPill.tsx                  |  8 +++++--
 src/components/discovery/FilterEngine.tsx          |  4 +++-
 src/components/navigation/AppNavigation.tsx        |  4 +++-
 src/components/plan/PlanHeroCard.tsx               | 12 +++++++---
 src/components/plan/PlanSummaryModal.tsx           |  8 +++++--
 src/components/plan/editor/PlanLibraryDrawer.tsx   |  4 +++-
 src/components/plan/editor/PlanStageList.tsx       |  4 +++-
 .../settings/common/SliderMarginGroup.tsx          |  4 +++-
 .../settings/sections/DataGovernanceSection.tsx    |  8 +++++--
 src/components/stats/ActivityHeatmapCard.tsx       |  3 ++-
 src/components/training/TrainingShell.tsx          |  4 +++-
 src/core/analytics/difficultyPlateauView.tsx       |  7 +++++-
 src/core/analytics/speedAccuracyView.tsx           |  7 +++++-
 src/core/canvas/drawPointGrid.ts                   |  8 ++++++-
 src/hooks/useTheme.ts                              |  6 ++---
 src/packs/abstraction/canvas/drawPaletteTiles.ts   |  2 +-
 src/packs/abstraction/canvas/drawParticles.ts      |  2 +-
 .../abstraction/components/GestureAxisView.tsx     |  2 +-
 .../abstraction/components/TopDown2AfcView.tsx     |  2 +-
 .../abstraction/components/TopDownPatternView.tsx  |  2 +-
 .../angle/components/AngleParallel2AfcView.tsx     | 26 ++++++++++++++++++----
 src/packs/angle/utils/angleUtils.ts                |  2 +-
 src/packs/negative_space/analytics.tsx             |  6 +++--
 .../components/AreaComparison2AfcView.tsx          |  2 +-
 .../components/RatioEstimationView.tsx             |  2 +-
 ...
 43 files changed, 202 insertions(+), 73 deletions(-)
```
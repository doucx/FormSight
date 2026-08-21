# 📸 Snapshot Capture

### 💬 备注:
biome

检测到工作区发生变更。

### 📝 变更文件摘要:
```
src/components/AbstractionCanvas.tsx               |  2 +-
 src/components/NegativeSpaceCanvas.tsx             |  2 +-
 src/components/abstraction/GestureAxisView.tsx     |  8 ++-
 src/components/abstraction/NotanThresholdView.tsx  | 10 +++-
 .../abstraction/PaletteClusteringView.tsx          |  2 +-
 src/components/abstraction/TopDown2AfcView.tsx     | 63 ++++++++++++++++++----
 src/components/abstraction/TopDownPatternView.tsx  |  6 +--
 .../negativeSpace/AreaComparison2AfcView.tsx       | 10 ++--
 .../negativeSpace/RatioEstimationView.tsx          |  4 +-
 .../negativeSpace/ShapeMemory2AfcView.tsx          |  8 ++-
 src/components/negativeSpace/VertexFittingView.tsx | 16 +++---
 src/utils/abstraction/hitDetection.ts              |  2 +-
 src/utils/abstraction/index.ts                     |  2 +-
 src/utils/abstraction/pca.ts                       |  2 +-
 src/utils/abstraction/polygon.ts                   |  2 +-
 src/utils/abstraction/questionGenerator.ts         |  2 +-
 src/utils/abstraction/types.ts                     |  2 +-
 src/utils/abstractionUtils.ts                      |  2 +-
 src/utils/canvas/drawNotanField.ts                 |  2 +-
 src/utils/canvas/drawPaletteTiles.ts               |  2 +-
 src/utils/canvas/drawParticles.ts                  |  2 +-
 src/utils/negativeSpace/hitDetection.ts            |  2 +-
 src/utils/negativeSpace/index.ts                   |  2 +-
 src/utils/negativeSpace/polygonMath.ts             |  2 +-
 src/utils/negativeSpace/questionGenerator.ts       |  2 +-
 src/utils/negativeSpace/types.ts                   |  2 +-
 src/utils/negativeSpaceUtils.ts                    |  2 +-
 27 files changed, 104 insertions(+), 59 deletions(-)
```
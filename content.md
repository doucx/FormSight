# 📸 Snapshot Capture

### 💬 备注:
rm

检测到工作区发生变更。

### 📝 变更文件摘要:
```
src/packs/abstraction/canvas/drawPaletteTiles.ts   |  29 --
 src/packs/abstraction/canvas/drawParticles.ts      |  82 -----
 .../abstraction/components/GestureAxisView.tsx     |  84 -----
 .../abstraction/components/NotanThresholdView.tsx  | 114 ------
 .../components/PaletteClusteringView.tsx           |  75 ----
 .../abstraction/components/TopDown2AfcView.tsx     | 257 --------------
 .../abstraction/components/TopDownPatternView.tsx  |  83 -----
 src/packs/abstraction/index.ts                     | 165 ---------
 src/packs/abstraction/locales/en-US.json           |  78 ----
 src/packs/abstraction/locales/zh-CN.json           |  78 ----
 src/packs/abstraction/plugin.tsx                   |  42 ---
 src/packs/abstraction/utils/hitDetection.ts        |  98 -----
 src/packs/abstraction/utils/index.ts               |   5 -
 src/packs/abstraction/utils/pca.ts                 |  92 -----
 src/packs/abstraction/utils/polygon.ts             | 117 ------
 src/packs/abstraction/utils/questionGenerator.ts   | 395 ---------------------
 src/packs/abstraction/utils/types.ts               |  78 ----
 src/packs/abstraction/views/AbstractionCanvas.tsx  |  94 -----
 18 files changed, 1966 deletions(-)
```
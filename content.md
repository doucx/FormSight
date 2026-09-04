# 📸 Snapshot Capture

### 💬 备注:
checkf

检测到工作区发生变更。

### 📝 变更文件摘要:
```
scripts/migrate_card_imports.cjs                   | 138 +++++++++++----------
 src/card-sdk/index.ts                              |   7 +-
 src/cards/abs_gesture_axis/AbsGestureAxisView.tsx  |   6 +-
 src/cards/abs_gesture_axis/index.tsx               |  12 +-
 src/cards/abs_gesture_axis/types.ts                |   4 +-
 src/cards/abs_gesture_axis/utils/generator.ts      |   9 +-
 .../abs_notan_threshold/AbsNotanThresholdView.tsx  |   6 +-
 src/cards/abs_notan_threshold/index.tsx            |  12 +-
 src/cards/abs_notan_threshold/utils/generator.ts   |   6 +-
 .../AbsPaletteClusteringView.tsx                   |   7 +-
 src/cards/abs_palette_clustering/index.tsx         |   2 +-
 .../abs_palette_clustering/utils/generator.ts      |   6 +-
 .../AbsPolygonDecimationView.tsx                   |   8 +-
 src/cards/abs_polygon_decimation/index.tsx         |   2 +-
 src/cards/abs_polygon_decimation/types.ts          |   4 +-
 .../abs_polygon_decimation/utils/generator.ts      |   3 +-
 src/cards/abs_td_gesture_2afc/index.tsx            |   2 +-
 src/cards/abs_td_gesture_2afc/types.ts             |   4 +-
 src/cards/abs_td_gesture_2afc/utils/generator.ts   |   9 +-
 src/cards/abs_td_hull_2afc/AbsTdHull2afcView.tsx   |   8 +-
 src/cards/abs_td_hull_2afc/index.tsx               |   2 +-
 src/cards/abs_td_hull_2afc/types.ts                |   4 +-
 src/cards/abs_td_hull_2afc/utils/generator.ts      |   3 +-
 src/cards/abs_td_notan_2afc/AbsTdNotan2afcView.tsx |   2 +-
 src/cards/abs_td_notan_2afc/index.tsx              |   2 +-
 src/cards/abs_td_notan_2afc/utils/generator.ts     |   3 +-
 .../abs_td_palette_2afc/AbsTdPalette2afcView.tsx   |   8 +-
 src/cards/abs_td_palette_2afc/index.tsx            |   2 +-
 src/cards/abs_td_palette_2afc/utils/generator.ts   |   6 +-
 .../AngleComparison2AfcView.tsx                    |   2 +-
 ...
 120 files changed, 371 insertions(+), 513 deletions(-)
```
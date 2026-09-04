# 📸 Snapshot Capture

### 💬 备注:
migrate

检测到工作区发生变更。

### 📝 变更文件摘要:
```
scripts/migrate_card_imports.cjs                   | 84 ++++++++++++++++++++++
 scripts/migrate_card_imports.js                    | 84 ----------------------
 src/cards/abs_gesture_axis/AbsGestureAxisView.tsx  | 11 +--
 src/cards/abs_gesture_axis/index.tsx               | 11 +--
 src/cards/abs_gesture_axis/types.ts                |  3 +-
 src/cards/abs_gesture_axis/utils/generator.ts      | 12 ++--
 .../abs_notan_threshold/AbsNotanThresholdView.tsx  | 11 +--
 src/cards/abs_notan_threshold/index.tsx            | 11 +--
 src/cards/abs_notan_threshold/utils/generator.ts   | 10 ++-
 .../AbsPaletteClusteringView.tsx                   | 11 +--
 src/cards/abs_palette_clustering/index.tsx         |  4 +-
 .../abs_palette_clustering/utils/generator.ts      | 15 ++--
 .../AbsPolygonDecimationView.tsx                   | 13 ++--
 src/cards/abs_polygon_decimation/index.tsx         |  4 +-
 src/cards/abs_polygon_decimation/types.ts          |  3 +-
 .../abs_polygon_decimation/utils/generator.ts      |  3 +-
 .../abs_td_gesture_2afc/AbsTdGesture2afcView.tsx   |  5 +-
 src/cards/abs_td_gesture_2afc/index.tsx            |  4 +-
 src/cards/abs_td_gesture_2afc/types.ts             |  3 +-
 src/cards/abs_td_gesture_2afc/utils/generator.ts   | 12 ++--
 src/cards/abs_td_hull_2afc/AbsTdHull2afcView.tsx   | 13 ++--
 src/cards/abs_td_hull_2afc/index.tsx               |  4 +-
 src/cards/abs_td_hull_2afc/types.ts                |  3 +-
 src/cards/abs_td_hull_2afc/utils/generator.ts      |  3 +-
 src/cards/abs_td_notan_2afc/AbsTdNotan2afcView.tsx |  5 +-
 src/cards/abs_td_notan_2afc/index.tsx              |  4 +-
 src/cards/abs_td_notan_2afc/utils/generator.ts     |  3 +-
 .../abs_td_palette_2afc/AbsTdPalette2afcView.tsx   | 13 ++--
 src/cards/abs_td_palette_2afc/index.tsx            |  4 +-
 src/cards/abs_td_palette_2afc/utils/generator.ts   | 15 ++--
 ...
 121 files changed, 713 insertions(+), 494 deletions(-)
```
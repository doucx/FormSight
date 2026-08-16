# 📸 Snapshot Capture

检测到工作区发生变更。

### 📝 变更文件摘要:
```
src/components/SettingsModal.tsx                      |  2 +-
 src/components/settings/ColorSettingsForm.tsx         |  2 +-
 src/components/settings/RelativeColorSettingsForm.tsx |  7 ++-----
 src/components/settings/StarSettingsForm.tsx          |  2 +-
 src/hooks/useTrainingSession.ts                       |  2 +-
 src/utils/canvas/drawColorRing.ts                     |  2 +-
 src/utils/canvas/drawCompass.ts                       |  2 +-
 src/utils/canvas/drawHeatmap.ts                       |  2 +-
 src/utils/canvas/drawTrendChart.ts                    |  5 ++---
 src/utils/db.ts                                       |  2 +-
 src/utils/db/importExport.ts                          |  2 +-
 src/utils/db/index.ts                                 |  2 +-
 src/utils/db/queries.ts                               |  2 +-
 src/utils/db/schema.ts                                |  2 +-
 src/utils/geometry.ts                                 |  2 +-
 src/utils/geometry/gridGenerators.ts                  |  2 +-
 src/utils/geometry/hitDetection.ts                    |  2 +-
 src/utils/geometry/index.ts                           |  2 +-
 src/utils/geometry/pointMath.ts                       |  2 +-
 src/utils/geometry/questionGenerator.ts               |  2 +-
 src/views/ColorTrainingView.tsx                       | 15 ++++++++++++---
 src/views/RelativeColorTrainingView.tsx               | 15 ++++++++++++---
 src/views/TrainingView.tsx                            | 17 +++++++++++++----
 23 files changed, 59 insertions(+), 36 deletions(-)
```
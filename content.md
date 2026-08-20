# 📸 Snapshot Capture

### 💬 备注:
biome

检测到工作区发生变更。

### 📝 变更文件摘要:
```
src/app.tsx                               |  5 +--
 src/components/GlobalSettingsModal.tsx    |  6 ++-
 src/components/SessionSummaryModal.tsx    |  2 +-
 src/components/WeaknessAnalyticsModal.tsx | 11 +++---
 src/components/common/ConfirmModal.tsx    |  9 +----
 src/components/common/Toast.tsx           |  5 +--
 src/config/analyticsPlugins.tsx           | 66 +++++++++++++++++++++++--------
 src/config/trainingPlugins.tsx            |  9 +----
 src/hooks/useHashRoute.ts                 |  2 +-
 src/utils/canvas/drawColorRing.ts         |  2 +-
 src/utils/canvas/drawCompass.ts           |  2 +-
 src/utils/canvas/drawHeatmap.ts           |  2 +-
 src/utils/canvas/drawTrendChart.ts        |  2 +-
 src/utils/canvas/hidpi.ts                 |  2 +-
 src/utils/db/importExport.ts              |  2 +-
 src/utils/db/migration.ts                 | 30 ++++++++------
 src/utils/db/queries.ts                   |  7 +++-
 src/utils/db/schema.ts                    |  2 +-
 src/utils/settings.ts                     |  2 +-
 19 files changed, 101 insertions(+), 67 deletions(-)
```
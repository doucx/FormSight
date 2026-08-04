# 📸 Snapshot Capture

### 💬 备注:
biome

检测到工作区发生变更。

### 📝 变更文件摘要:
```
biome.json                             |   2 +-
 package-lock.json                      | 165 +++++++++++++++++++++++++++++++++
 package.json                           |   2 +-
 postcss.config.js                      |   2 +-
 src/app.tsx                            |  19 ++--
 src/components/AnalyticsModal.tsx      |  25 ++---
 src/components/SessionSummaryModal.tsx |  20 ++--
 src/components/SettingsModal.tsx       |   8 +-
 src/components/StarCanvas.tsx          |  14 +--
 src/index.css                          |   6 +-
 src/main.tsx                           |   2 +-
 src/types/index.ts                     |  18 ++--
 src/utils/adaptiveEngine.ts            |  14 +--
 src/utils/db.ts                        |  18 ++--
 src/utils/geometry.ts                  |  48 +++++-----
 src/utils/settings.ts                  |  14 +--
 src/views/Dashboard.tsx                |  44 ++++-----
 src/views/TrainingView.tsx             |  43 ++++-----
 src/vite-env.d.ts                      |   2 +-
 tailwind.config.js                     |  11 +--
 tsconfig.json                          |   2 +-
 tsconfig.node.json                     |   2 +-
 vite.config.ts                         |   4 +-
 23 files changed, 310 insertions(+), 175 deletions(-)
```
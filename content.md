# 📸 Snapshot Capture

### 💬 备注:
biome

检测到工作区发生变更。

### 📝 变更文件摘要:
```
src/app.tsx                                       |  6 +---
 src/components/settings/DynamicDomainSettings.tsx |  2 +-
 src/config/trainingPlugins.tsx                    | 44 +++++++++++++++++++----
 src/core/geometry/pointGrid.ts                    |  2 +-
 src/domains/color/index.ts                        |  2 +-
 src/domains/star/index.ts                         |  2 +-
 src/domains/star/utils/hitDetection.ts            |  7 ++--
 src/hooks/session/useIdleProtection.ts            |  2 +-
 src/hooks/session/useTrainingKeybindings.ts       |  2 +-
 src/hooks/useTrainingSession.ts                   |  2 +-
 src/utils/db/importExport.ts                      | 11 ++++--
 src/utils/db/repository.ts                        |  2 +-
 src/views/GenericTrainingView.tsx                 | 10 ++++--
 13 files changed, 64 insertions(+), 30 deletions(-)
```
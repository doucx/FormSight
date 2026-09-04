经过与代码库当前架构的比对，主要发现了以下过时与缺失项：
1. **废弃的 Packs 目录**：工程已完成 Flat Cards 架构升级，`src/packs/` 目录已不存在，原 `packs` 预设已失效。
2. **新增的 SDK 与 Signals 响应式 Store**：新增的 `@formsight/card-sdk`（`src/card-sdk/index.ts`）和全局响应式状态层 `src/stores/`（包含 `planStore.ts`、`profileStore.ts` 等）尚未纳入预设。
3. **失效的设置组件路径**：`src/components/settings/DynamicDomainSettings.tsx` 已被拆解为 `sections/` 与 `common/` 模块。

我将生成一个计划，更新 `piconfig.json`，使其与当前架构完全对齐。

## [WIP] chore: 同步更新 piconfig.json 预设配置以匹配当前工程架构

### 用户需求
根据当前代码库的实际目录结构和最新演进状态，更新项目上下文抓取配置 `piconfig.json`，清理不存在的废弃路径并纳入新增的 Card SDK 与状态管理层。

### 评论
维护精准的上下文探查配置（PathInspector config）对于 AI 代理在后续跨会话重构时准确、高效地获取完整依赖图至关重要。

### 目标
1. 移除已废弃的 `packs` 预设，或将其收敛更新。
2. 将 `src/card-sdk/index.ts` 分别纳入 `core` 和 `cards` 预设。
3. 将 `src/stores/` 状态管理层按需加入 `core`、`plan` 和 `stats` 预设。
4. 修正 `cards` 预设中已删除的 `DynamicDomainSettings.tsx`，补充 `src/components/settings/sections/`。

### 基本原理
`piconfig.json` 充当模块上下文过滤器。去除 404 死路径并补充核心架构防腐层与状态驱动层后，能确保提取的上下文无噪点且完备。

### 标签
#intent/tooling #flow/ready #priority/medium #comp/build #concept/config #scope/dx #ai/instruct #task/domain/tooling #task/object/piconfig #task/action/update #task/state/begin #task/status/active

---

### Script

#### Acts 1: 更新 `piconfig.json` 预设配置

我们将更新 `piconfig.json`，匹配当前系统的真实文件布局。

~~~~~act
write_file
piconfig.json
~~~~~
~~~~~json
{
  "presets": {
    "core": {
      "format": "xml",
      "extension": ["ts", "tsx"],
      "paths": [
        "src/types/plan.ts",
        "src/types/card.ts",
        "src/types/index.ts",
        "src/config/planTemplates.ts",
        "src/config/tags.ts",
        "src/card-sdk/index.ts",
        "src/core/i18n.ts",
        "src/core/registry.ts",
        "src/core/contracts.ts",
        "src/core/cardContract.ts",
        "src/core/engine/adaptiveEngine.ts",
        "src/stores/",
        "src/storage/settings.ts",
        "src/storage/planStorage.ts",
        "src/storage/repository.ts",
        "src/storage/db/schema.ts",
        "src/storage/db/queries.ts",
        "src/storage/db/importExport.ts",
        "src/hooks/useAppBootstrap.ts",
        "src/hooks/useTrainingSession.ts",
        "src/hooks/session/useIdleProtection.ts",
        "src/hooks/session/useTrainingKeybindings.ts",
        "src/hooks/useHashRoute.ts",
        "src/hooks/useTodayStats.ts",
        "src/hooks/useTheme.ts",
        "src/components/routing/AppRouter.tsx",
        "src/components/navigation/AppNavigation.tsx",
        "src/components/training/TrainingShell.tsx",
        "src/components/modals/SessionSummaryModal.tsx",
        "src/components/modals/GlobalSettingsModal.tsx",
        "src/components/modals/SettingsModal.tsx",
        "src/views/HomeView.tsx",
        "src/views/GenericTrainingView.tsx",
        "src/views/DiscoveryView.tsx",
        "src/app.tsx"
      ]
    },
    "cards": {
      "format": "xml",
      "extension": ["ts", "tsx", "json"],
      "paths": [
        "src/card-sdk/index.ts",
        "src/types/card.ts",
        "src/types/index.ts",
        "src/config/tags.ts",
        "src/core/cardContract.ts",
        "src/core/contracts.ts",
        "src/core/i18n.ts",
        "src/storage/settings.ts",
        "src/components/common/",
        "src/components/ui/",
        "src/components/settings/common/",
        "src/components/settings/sections/",
        "src/core/math/",
        "src/core/geometry/",
        "src/core/color/",
        "src/core/canvas/hidpi.ts",
        "src/core/canvas/drawPointGrid.ts",
        "src/core/canvas/drawPolygon.ts",
        "src/utils/theme.ts",
        "src/utils/cn.ts",
        "src/cards/star_single/",
        "src/cards/color_hue/",
        "src/cards/neg_shape_match_2afc/"
      ]
    },
    "plan": {
      "format": "xml",
      "extension": ["ts", "tsx"],
      "paths": [
        "src/types/plan.ts",
        "src/config/planTemplates.ts",
        "src/storage/planStorage.ts",
        "src/stores/planStore.ts",
        "src/components/plan/PlanHeroCard.tsx",
        "src/components/plan/PlanSummaryModal.tsx",
        "src/components/plan/editor/PlanEditorHeader.tsx",
        "src/components/plan/editor/PlanStageList.tsx",
        "src/components/plan/editor/PlanLibraryDrawer.tsx",
        "src/components/plan/editor/CardPickerPanel.tsx",
        "src/components/plan/editor/planItemUtils.ts",
        "src/components/plan/editor/usePlanEditorState.ts",
        "src/views/PlanEditorView.tsx",
        "src/views/PlanTrainingView.tsx"
      ]
    },
    "stats": {
      "format": "xml",
      "extension": ["ts", "tsx"],
      "paths": [
        "src/core/analytics/",
        "src/core/canvas/charts/",
        "src/core/math/downsample.ts",
        "src/core/worker/workerClient.ts",
        "src/workers/compute.worker.ts",
        "src/stores/profileStore.ts",
        "src/components/stats/ActivityHeatmapCard.tsx",
        "src/components/stats/CognitiveMasteryGrid.tsx",
        "src/components/stats/StatsMetricCards.tsx",
        "src/hooks/useGlobalStatsData.ts",
        "src/hooks/useTodayStats.ts",
        "src/views/GlobalStatsView.tsx",
        "src/views/CardAnalyticsView.tsx"
      ]
    },
    "full": {
      "format": "xml",
      "extension": ["ts", "tsx", "json", "css", "html"],
      "paths": ["src/", "./index.html"],
      "ignore": ["*.test.ts", "*.test.tsx"]
    }
  }
}
~~~~~

### 下一步建议
配置已完全同步，您可以使用相应的预设（例如 `core`、`cards`、`plan` 等）提取最新、最干净的代码上下文。接下来可以继续推进**“倒置 UI 控制权：解散 StandardNafcView”**的任务。

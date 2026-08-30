好的，我将为你生成更新 `piconfig.json` 中 `core` 预设路径配置的计划。

## [WIP] chore: 更新 piconfig.json 中的 core 预设路径配置

### 用户需求
更新项目根目录下的 `piconfig.json` 配置文件中的 `core` 预设路径，移除已过时失效的文件路径（如已重构拆分的 `PlanEditorModal.tsx`），并补齐当前系统中核心架构、状态流、路由器及计划编排相关的关键代码文件。

### 评论
随着应用架构从单模态弹窗向独立视图 (`PlanEditorView`)、路由分层 (`AppRouter`) 与 Bootstrap 管理器 (`useAppBootstrap`) 重构演进，及时同步打包工具/上下文收集器 (`piconfig.json`) 中的核心路径预设，能显著提升上下文提取的完整性与准确性。

### 目标
1. 移除 `core` 预设中不存在的 `src/components/plan/PlanEditorModal.tsx`。
2. 增补当前核心架构文件：
   - 国际化与启动流：`src/core/i18n.ts`, `src/hooks/useAppBootstrap.ts`
   - 导航与路由：`src/components/routing/AppRouter.tsx`, `src/components/navigation/AppNavigation.tsx`
   - 计划编排模块：`PlanEditorHeader.tsx`, `planItemUtils.ts`, `usePlanEditorState.ts`, `PlanEditorView.tsx`。

### 基本原理
直接使用 `patch_file` 对 `piconfig.json` 中的 `core.paths` 数组进行精准替换，确保格式对齐与严格合法。

### 标签
#intent/tooling #flow/ready #priority/medium #comp/build #concept/config #scope/dx #ai/instruct #task/domain/tooling #task/object/piconfig #task/action/update #task/state/begin

---

### Script

#### Acts 1: 更新 `piconfig.json` 中的 `core` 预设路径

修改 `piconfig.json`，校准 `core` 预设中的文件路径列表。

~~~~~act
patch_file
piconfig.json
~~~~~
~~~~~old
    "core": {
      "format": "xml",
      "extension": ["ts", "tsx"],
      "paths": [
        "src/types/plan.ts",
        "src/types/card.ts",
        "src/types/index.ts",
        "src/config/planTemplates.ts",
        "src/config/trainingPlugins.tsx",
        "src/core/registry.ts",
        "src/core/contracts.ts",
        "src/core/engine/adaptiveEngine.ts",
        "src/utils/settings.ts",
        "src/utils/planStorage.ts",
        "src/utils/db/schema.ts",
        "src/utils/db/queries.ts",
        "src/utils/db/repository.ts",
        "src/utils/db/importExport.ts",
        "src/hooks/useTrainingSession.ts",
        "src/hooks/session/useIdleProtection.ts",
        "src/hooks/session/useTrainingKeybindings.ts",
        "src/hooks/useHashRoute.ts",
        "src/hooks/useTodayStats.ts",
        "src/components/training/TrainingShell.tsx",
        "src/components/SessionSummaryModal.tsx",
        "src/components/plan/PlanHeroCard.tsx",
        "src/components/plan/PlanEditorModal.tsx",
        "src/components/plan/PlanSummaryModal.tsx",
        "src/components/plan/editor/PlanStageList.tsx",
        "src/components/plan/editor/PlanLibraryDrawer.tsx",
        "src/components/plan/editor/CardPickerPanel.tsx",
        "src/views/PlanTrainingView.tsx",
        "src/views/GenericTrainingView.tsx",
        "src/views/Home.tsx",
        "src/app.tsx"
      ]
    }
~~~~~
~~~~~new
    "core": {
      "format": "xml",
      "extension": ["ts", "tsx"],
      "paths": [
        "src/types/plan.ts",
        "src/types/card.ts",
        "src/types/index.ts",
        "src/config/planTemplates.ts",
        "src/config/trainingPlugins.tsx",
        "src/core/i18n.ts",
        "src/core/registry.ts",
        "src/core/contracts.ts",
        "src/core/engine/adaptiveEngine.ts",
        "src/utils/settings.ts",
        "src/utils/planStorage.ts",
        "src/utils/db/schema.ts",
        "src/utils/db/queries.ts",
        "src/utils/db/repository.ts",
        "src/utils/db/importExport.ts",
        "src/hooks/useAppBootstrap.ts",
        "src/hooks/useTrainingSession.ts",
        "src/hooks/session/useIdleProtection.ts",
        "src/hooks/session/useTrainingKeybindings.ts",
        "src/hooks/useHashRoute.ts",
        "src/hooks/useTodayStats.ts",
        "src/components/routing/AppRouter.tsx",
        "src/components/navigation/AppNavigation.tsx",
        "src/components/training/TrainingShell.tsx",
        "src/components/SessionSummaryModal.tsx",
        "src/components/plan/PlanHeroCard.tsx",
        "src/components/plan/PlanSummaryModal.tsx",
        "src/components/plan/editor/PlanEditorHeader.tsx",
        "src/components/plan/editor/PlanStageList.tsx",
        "src/components/plan/editor/PlanLibraryDrawer.tsx",
        "src/components/plan/editor/CardPickerPanel.tsx",
        "src/components/plan/editor/planItemUtils.ts",
        "src/components/plan/editor/usePlanEditorState.ts",
        "src/views/PlanEditorView.tsx",
        "src/views/PlanTrainingView.tsx",
        "src/views/GenericTrainingView.tsx",
        "src/views/Home.tsx",
        "src/app.tsx"
      ]
    }
~~~~~

### 下一步建议
- 执行测试与格式检查以确保配置合法。
- 如需将 `cards` 预设一并与当前最新的 Pack 结构对齐，可随时发起调整。

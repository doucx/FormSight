收到，现在对代码库中残留的非语义化硬编码样式进行精准清理，将遗留的 `slate` 颜色类名彻底替换为系统的语义化 Token（`bg-border` 和 `bg-muted-foreground`），实现 100% 纯净的 Design Tokens 约束。

## [WIP] refactor(ui): 清理残留的硬编码样式类名并统一语义化令牌

### 用户需求
清除全局代码中遗漏的几处 `slate` 硬编码类名，将分隔线与指示圆点的色彩定义完全归拢至系统的 CSS 语义变量体系。

### 评论
虽然这几处硬编码不影响核心训练功能，但在暗色模式下或进行品牌主色调重定义时可能会造成微小的对比度瑕疵。将其彻底清洗是保持整个 Design System 高度一致性和可维护性的必要收尾工作。

### 目标
1. 在 `src/views/PlanTrainingView.tsx` 中将分隔竖线的 `bg-slate-200` 替换为语义化 `bg-border`。
2. 在 `src/packs/perspective/components/ProportionDivisionView.tsx` 与 `ProportionMigrationView.tsx` 中将终点比例徽章的 `bg-slate-400` 替换为 `bg-muted-foreground`。

### 基本原理
通过将具体的色值名称（如 `slate-200`、`slate-400`）替换为基于 CSS 变量的语义化类名（`border`、`muted-foreground`），确保在明暗主题切换时这些视觉元素能够自动响应主题定义的明度与色调变化。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/design-system-cleanup #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 清理 `PlanTrainingView` 与透视包中的残留硬编码样式

我们将对 3 个包含遗留类名的文件执行精确替换。

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~tsx
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRequestExit}
            className="gap-1.5 text-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-border"
            title={t('plan.exitPlan')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('plan.exitPlan')}
          </Button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2.5">
~~~~~
~~~~~tsx
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRequestExit}
            className="gap-1.5 text-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-border"
            title={t('plan.exitPlan')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('plan.exitPlan')}
          </Button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2.5">
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionDivisionView.tsx
~~~~~
~~~~~tsx
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="secondary"
              size="sm"
              className="w-2 h-2 p-0 rounded-full border-none bg-slate-400"
            />
            <span>{t('common.endPercent')}</span>
          </span>
~~~~~
~~~~~tsx
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="secondary"
              size="sm"
              className="w-2 h-2 p-0 rounded-full border-none bg-muted-foreground"
            />
            <span>{t('common.endPercent')}</span>
          </span>
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionMigrationView.tsx
~~~~~
~~~~~tsx
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="secondary"
              size="sm"
              className="w-2 h-2 p-0 rounded-full border-none bg-slate-400"
            />
            <span>{t('common.endPercent')}</span>
          </span>
~~~~~
~~~~~tsx
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <Badge
              variant="secondary"
              size="sm"
              className="w-2 h-2 p-0 rounded-full border-none bg-muted-foreground"
            />
            <span>{t('common.endPercent')}</span>
          </span>
~~~~~

### 下一步建议
1. **运行项目验证**: 在本地执行 `npm run build` 或 `npm run test` 确保无样式构建与类型报错。
2. **提交代码**: 确认无误后，可以生成 `[COMMIT]` 计划将此次 Design System 的重构与清理工作提交到 Git 仓库。

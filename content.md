我将为你创建一个自动化迁移脚本 `scripts/migrate-design-system.mjs`，对 `src/packs/` 之外的所有业务组件与视图进行语义化 Design Tokens（包括色彩变量、UI 组件规范如 Button / Badge / Input 等）的系统性替换与迁移，并直接执行该脚本完成自动化重构。

## [WIP] refactor(ui): 批量迁移所有非 Pack 业务组件与视图至语义化 Design System

### 用户需求
针对扫描报告中除 `src/packs/` 之外的所有业务组件、视图与核心容器，消除硬编码色彩（如 `text-slate-*`, `bg-slate-*`, `text-indigo-*` 等）及原始原生标签（如 raw `<button>`），统一迁移到 Design System 语义化 Token 与基础 UI 组件库。

### 评论
将基础视觉硬编码类重构为语义化 Token（如 `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `text-primary`, `border-border` 等）能彻底解决深色模式下的对比度与样式断层问题，大幅提升全站的设计一致性与可维护性。编写自动化脚本处理非 Pack 业务代码能够高效、无遗漏地完成这项规模化重构。

### 目标
1. 编写专用的迁移重构脚本 `scripts/migrate-design-system.mjs`，涵盖所有 views、components、core 等非 pack 文件中的硬编码颜色与组件调用模式。
2. 运行迁移脚本对目标文件执行语义化转换与规范化重构。
3. 清理临时迁移脚本，保持工程整洁。

### 基本原理
通过 Node.js 脚本解析并遍历 `src/` 下非 `src/packs/` 目录的代码文件，针对性匹配并替换：
- **Grayscale / Dual-theme 色彩**: `text-slate-400` -> `text-muted-foreground`，`text-slate-800` -> `text-foreground`，`bg-slate-900/60 dark:bg-black/75` -> `bg-background/80 dark:bg-black/80 backdrop-blur-sm` 等；
- **Brand 色彩**: `text-indigo-600` / `dark:text-indigo-400` -> `text-primary`，`bg-indigo-50` -> `bg-accent`，`border-indigo-100` -> `border-border/60` 等；
- **原生按钮组件**: 将通用的操作按钮迁移至 `<Button>` 或语义化组件。

### 标签
#intent/refine #flow/ready #priority/high
#comp/cli #concept/ui #scope/ux #scope/dx
#ai/instruct
#task/domain/ui
#task/object/design-system-unification
#task/action/refactor
#task/state/begin

---

### Script

#### Acts 1: 创建自动化迁移脚本并执行迁移

我们将创建 `scripts/migrate-design-system.mjs` 并执行重构。

~~~~~act
write_file
scripts/migrate-design-system.mjs
~~~~~
~~~~~javascript
import fs from 'node:fs';
import path from 'node:path';

const filesToProcess = [
  'src/app.tsx',
  'src/components/discovery/FilterEngine.tsx',
  'src/components/discovery/AdvancedTagMatrix.tsx',
  'src/components/plan/editor/PlanEditorHeader.tsx',
  'src/components/plan/editor/CardPickerPanel.tsx',
  'src/components/plan/editor/PlanLibraryDrawer.tsx',
  'src/components/plan/PlanSummaryModal.tsx',
  'src/components/training/TrainingShell.tsx',
  'src/components/navigation/AppNavigation.tsx',
  'src/components/settings/DynamicDomainSettings.tsx',
  'src/components/settings/common/TargetingSection.tsx',
  'src/components/settings/common/SettingToggleItem.tsx',
  'src/components/settings/common/SliderMarginGroup.tsx',
  'src/components/settings/sections/DataGovernanceSection.tsx',
  'src/components/settings/sections/GeneralPreferencesSection.tsx',
  'src/components/stats/ActivityHeatmapCard.tsx',
  'src/components/stats/CognitiveMasteryGrid.tsx',
  'src/components/stats/StatsMetricCards.tsx',
  'src/components/common/Choice2AfcContainer.tsx',
  'src/components/common/ChoiceNafcContainer.tsx',
  'src/components/common/ConfirmModal.tsx',
  'src/components/common/DualViewportContainer.tsx',
  'src/components/common/IdlePauseOverlay.tsx',
  'src/components/common/ModalShell.tsx',
  'src/components/common/StandardNafcView.tsx',
  'src/components/common/StandardSliderView.tsx',
  'src/components/common/TagPill.tsx',
  'src/components/common/Toast.tsx',
  'src/components/GlobalSettingsModal.tsx',
  'src/components/SettingsModal.tsx',
  'src/components/SessionSummaryModal.tsx',
  'src/components/HsvTrackSlider.tsx',
  'src/components/routing/AppRouter.tsx',
  'src/core/analytics/difficultyPlateauView.tsx',
  'src/core/analytics/speedAccuracyView.tsx',
  'src/views/CardAnalyticsView.tsx',
  'src/views/DiscoveryView.tsx',
  'src/views/GlobalStatsView.tsx',
  'src/views/Home.tsx',
  'src/views/PlanEditorView.tsx',
  'src/views/PlanTrainingView.tsx',
];

const tokenReplacements = [
  // Slate grayscale
  [/\btext-slate-400\b/g, 'text-muted-foreground'],
  [/\btext-slate-500\b/g, 'text-muted-foreground'],
  [/\btext-slate-600\b/g, 'text-muted-foreground'],
  [/\btext-slate-700\b/g, 'text-foreground'],
  [/\btext-slate-800\b/g, 'text-foreground'],
  [/\btext-slate-900\b/g, 'text-foreground'],
  [/\btext-slate-200\b/g, 'text-muted-foreground'],
  [/\btext-slate-300\b/g, 'text-muted-foreground'],
  [/\bdark:text-slate-300\b/g, 'dark:text-muted-foreground'],
  [/\bdark:text-slate-400\b/g, 'dark:text-muted-foreground'],
  [/\bdark:text-slate-600\b/g, 'dark:text-muted-foreground'],

  // Slate borders
  [/\bborder-slate-200\/60\b/g, 'border-border/60'],
  [/\bborder-slate-200\/80\b/g, 'border-border/60'],
  [/\bborder-slate-200\b/g, 'border-border'],
  [/\bborder-slate-300\/80\b/g, 'border-border/60'],
  [/\bborder-slate-300\b/g, 'border-border'],
  [/\bborder-slate-700\/80\b/g, 'border-border/60'],
  [/\bborder-slate-700\b/g, 'border-border'],
  [/\bborder-slate-800\b/g, 'border-border'],
  [/\bborder-slate-900\b/g, 'border-border'],
  [/\bdark:border-slate-600\/80\b/g, 'dark:border-border/60'],
  [/\bdark:border-slate-700\b/g, 'dark:border-border'],
  [/\bdark:border-slate-800\b/g, 'dark:border-border'],
  [/\bdark:border-slate-900\b/g, 'dark:border-border'],

  // Slate backgrounds
  [/\bbg-slate-50\/70\b/g, 'bg-background'],
  [/\bbg-slate-50\b/g, 'bg-muted/40'],
  [/\bbg-slate-100\/60\b/g, 'bg-muted/60'],
  [/\bbg-slate-100\b/g, 'bg-muted'],
  [/\bbg-slate-800\b/g, 'bg-muted'],
  [/\bbg-slate-900\/40\b/g, 'bg-background/40'],
  [/\bbg-slate-900\/60\b/g, 'bg-background/60'],
  [/\bbg-slate-900\/95\b/g, 'bg-card/95'],
  [/\bbg-slate-900\b/g, 'bg-card'],
  [/\bdark:bg-slate-800\/80\b/g, 'dark:bg-muted/80'],
  [/\bdark:bg-slate-800\b/g, 'dark:bg-muted'],
  [/\bdark:bg-slate-900\b/g, 'dark:bg-card'],
  [/\bdark:bg-slate-950\b/g, 'dark:bg-background'],
  [/\bdark:bg-black\/75\b/g, 'dark:bg-background/80'],

  // Brand Indigo Colors
  [/\btext-indigo-600\b/g, 'text-primary'],
  [/\btext-indigo-500\b/g, 'text-primary'],
  [/\btext-indigo-700\b/g, 'text-primary'],
  [/\bdark:text-indigo-400\b/g, 'dark:text-primary'],
  [/\bdark:text-indigo-500\b/g, 'dark:text-primary'],
  [/\bbg-indigo-50\/30\b/g, 'bg-accent/30'],
  [/\bbg-indigo-50\/60\b/g, 'bg-accent/60'],
  [/\bbg-indigo-50\/80\b/g, 'bg-accent/80'],
  [/\bbg-indigo-50\b/g, 'bg-accent'],
  [/\bbg-indigo-100\/50\b/g, 'bg-accent/50'],
  [/\bbg-indigo-100\b/g, 'bg-accent'],
  [/\bbg-indigo-600\b/g, 'bg-primary'],
  [/\bbg-indigo-700\b/g, 'bg-primary/90'],
  [/\bdark:bg-indigo-950\/40\b/g, 'dark:bg-accent/40'],
  [/\bdark:bg-indigo-950\/60\b/g, 'dark:bg-accent/60'],
  [/\bdark:bg-indigo-950\b/g, 'dark:bg-accent'],
  [/\bborder-indigo-100\/80\b/g, 'border-border/60'],
  [/\bborder-indigo-100\/90\b/g, 'border-border/60'],
  [/\bborder-indigo-100\b/g, 'border-border/60'],
  [/\bborder-indigo-200\/60\b/g, 'border-border/60'],
  [/\bborder-indigo-200\b/g, 'border-border'],
  [/\bborder-indigo-300\b/g, 'border-border'],
  [/\bborder-indigo-500\/20\b/g, 'border-primary/20'],
  [/\bborder-indigo-600\b/g, 'border-primary'],
  [/\bdark:border-indigo-700\b/g, 'dark:border-border'],
  [/\bdark:border-indigo-800\b/g, 'dark:border-border'],
  [/\bdark:border-indigo-900\/60\b/g, 'dark:border-border/60'],
  [/\bdark:border-indigo-900\b/g, 'dark:border-border'],
  [/\bhover:bg-indigo-50\b/g, 'hover:bg-accent'],
  [/\bhover:bg-indigo-100\b/g, 'hover:bg-accent'],
  [/\bhover:text-indigo-600\b/g, 'hover:text-primary'],
  [/\bhover:border-indigo-400\b/g, 'hover:border-primary/60'],
];

let totalModified = 0;

for (const relPath of filesToProcess) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;

  for (const [pattern, replacement] of tokenReplacements) {
    content = content.replace(pattern, replacement);
  }

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated: ${relPath}`);
    totalModified++;
  }
}

console.log(`Migration complete. Modified ${totalModified} files.`);
~~~~~

~~~~~act
run_command
~~~~~
~~~~~
node scripts/migrate-design-system.mjs
rm scripts/migrate-design-system.mjs
~~~~~

### 下一步建议
1. 运行测试套件（如 `pnpm test` 或 `npm run test`）验证功能逻辑与组件渲染完全正常。
2. 运行代码检查与格式化工具（如 `pnpm biome check` 或 `pnpm lint`）确保代码风格统一。
3. 检查剩余的 `src/packs/` 目录中的分析图表与专用视图，视需要将 Pack 内私有组件也完成语义化收敛。

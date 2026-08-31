我将为你创建一个针对非 Pack 核心业务组件与视图的深度重构脚本 `scripts/refactor-nonpack-components.mjs`，将所有残留的硬编码色彩类（如 `dark:bg-slate-700`、`dark:hover:bg-slate-700`）以及原生 `<button>`、ad-hoc badge 元素系统性地迁移为 `<Button>` 和 `<Badge>` 设计规范组件，并立即执行该自动化脚本。

## [WIP] refactor(ui): 深度重构非 Pack 业务组件为语义化 Button 与 Badge 规范

### 用户需求
彻底修复非 Pack 业务组件与视图中剩余的 40+ 处违规项，包括将原始 `<button>` 替换为 `<Button>` 组件、将 ad-hoc 状态标签替换为 `<Badge>`、并消除残留的 `dark:bg-slate-700` 等硬编码类名。

### 评论
将这些交互按钮和状态标签统一至 `<Button>` 和 `<Badge>` 设计体系，不仅能消减组件中散落的样式冗余，还能统一全站的 hover/focus/active 交互微动效与触控反馈，保证极端主题对比度下的一致性。

### 目标
1. 编写重构脚本 `scripts/refactor-nonpack-components.mjs` 对 18 个非 Pack 文件进行语义化升级。
2. 将 Modal 操作、导航条、训练外壳（TrainingShell）、设置项、筛选器等模块中的原生按钮替换为 `<Button>` 组件。
3. 替换残留的 `dark:bg-slate-700` 等 Slate 硬编码色彩，并执行脚本验证。

### 基本原理
通过精确的文本/模式匹配，在目标组件中按需导入 `<Button>` 或 `<Badge>`，将原生 `<button>` 标签转换为带有统一变体（variant / size）的 Design System 组件，保持属性（如 disabled、onClick、type 等）与语义完全兼容。

### 标签
#intent/refine #flow/ready #priority/high
#comp/cli #concept/ui #scope/ux #scope/dx
#ai/instruct
#task/domain/ui
#task/object/design-system-unification
#task/action/refactor
#task/state/continue

---

### Script

#### Acts 1: 编写并执行非 Pack 业务组件深度重构脚本

我们将创建并执行 `scripts/refactor-nonpack-components.mjs`。

~~~~~act
write_file
scripts/refactor-nonpack-components.mjs
~~~~~
~~~~~javascript
import fs from 'node:fs';
import path from 'node:path';

function patchFile(relPath, transformFn) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  const transformed = transformFn(content);
  if (transformed !== content) {
    fs.writeFileSync(fullPath, transformed, 'utf8');
    console.log(`Updated: ${relPath}`);
  }
}

// 1. src/components/common/Choice2AfcContainer.tsx
patchFile('src/components/common/Choice2AfcContainer.tsx', (code) => {
  return code
    .replace(/dark:bg-slate-700/g, 'dark:bg-muted')
    .replace(/text-white flex items-center justify-center font-mono text-\[11px\]/g, 'text-foreground flex items-center justify-center font-mono text-[11px]');
});

// 2. src/components/common/ChoiceNafcContainer.tsx
patchFile('src/components/common/ChoiceNafcContainer.tsx', (code) => {
  return code
    .replace(/dark:bg-slate-700/g, 'dark:bg-muted')
    .replace(/text-white flex items-center justify-center font-mono text-\[11px\]/g, 'text-foreground flex items-center justify-center font-mono text-[11px]');
});

// 3. src/components/plan/editor/CardPickerPanel.tsx
patchFile('src/components/plan/editor/CardPickerPanel.tsx', (code) => {
  return code
    .replace(/dark:hover:bg-slate-700/g, 'dark:hover:bg-muted');
});

// 4. src/components/common/ModalShell.tsx
patchFile('src/components/common/ModalShell.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../ui/button';")) {
    res = res.replace("import { X } from 'lucide-preact';", "import { X } from 'lucide-preact';\nimport { Button } from '../ui/button';");
  }
  res = res.replace(
    `<button\n              type="button"\n              onClick={onClose}\n              className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"\n            >\n              <X className="w-5 h-5" />\n            </button>`,
    `<Button\n              variant="ghost"\n              size="iconSm"\n              onClick={onClose}\n              className="text-muted-foreground hover:text-foreground"\n            >\n              <X className="w-5 h-5" />\n            </Button>`
  );
  return res;
});

// 5. src/components/common/ConfirmModal.tsx
patchFile('src/components/common/ConfirmModal.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../ui/button';")) {
    res = res.replace("import { ModalShell } from './ModalShell';", "import { ModalShell } from './ModalShell';\nimport { Button } from '../ui/button';");
  }
  res = res.replace(
    `<button\n            type="button"\n            onClick={onCancel}\n            className="w-full py-2.5 px-3 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-all active:scale-95"\n          >\n            {effectiveCancelText}\n          </button>`,
    `<Button\n            variant="secondary"\n            onClick={onCancel}\n            className="w-full py-2.5 h-auto"\n          >\n            {effectiveCancelText}\n          </Button>`
  );
  res = res.replace(
    `<button\n            type="button"\n            onClick={onConfirm}\n            className={\`w-full py-2.5 px-3 text-xs font-bold text-white rounded-xl shadow-sm transition-all active:scale-95 \${\n              isDangerous\n                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none'\n                : 'bg-primary hover:bg-primary/90 shadow-indigo-200 dark:shadow-none'\n            }\`}\n          >\n            {effectiveConfirmText}\n          </button>`,
    `<Button\n            variant={isDangerous ? 'danger' : 'default'}\n            onClick={onConfirm}\n            className="w-full py-2.5 h-auto"\n          >\n            {effectiveConfirmText}\n          </Button>`
  );
  return res;
});

// 6. src/components/common/IdlePauseOverlay.tsx
patchFile('src/components/common/IdlePauseOverlay.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../ui/button';")) {
    res = res.replace("import { useTranslation } from '../../core/i18n';", "import { useTranslation } from '../../core/i18n';\nimport { Button } from '../ui/button';");
  }
  res = res.replace(
    `<button\n          type="button"\n          onClick={onResume}\n          className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95"\n        >\n          {t('common.clickToResume')}\n        </button>`,
    `<Button\n          variant="default"\n          onClick={onResume}\n          className="mt-1 w-full py-2.5 h-auto"\n        >\n          {t('common.clickToResume')}\n        </Button>`
  );
  return res;
});

// 7. src/components/common/Toast.tsx
patchFile('src/components/common/Toast.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../ui/button';")) {
    res = res.replace("import { useEffect } from 'preact/hooks';", "import { useEffect } from 'preact/hooks';\nimport { Button } from '../ui/button';");
  }
  res = res.replace(
    `<button\n        type="button"\n        onClick={onDismiss}\n        className="p-1 rounded-lg text-muted-foreground dark:text-muted-foreground hover:text-foreground transition-colors ml-2"\n      >\n        <X className="w-3.5 h-3.5" />\n      </button>`,
    `<Button\n        variant="ghost"\n        size="iconSm"\n        onClick={onDismiss}\n        className="text-muted-foreground hover:text-foreground ml-2 h-6 w-6"\n      >\n        <X className="w-3.5 h-3.5" />\n      </Button>`
  );
  return res;
});

// 8. src/components/common/StandardNafcView.tsx
patchFile('src/components/common/StandardNafcView.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../ui/button';")) {
    res = res.replace("import { QuestionCardShell } from './QuestionCardShell';", "import { QuestionCardShell } from './QuestionCardShell';\nimport { Button } from '../ui/button';");
  }
  res = res.replace(
    `<button\n          type="button"\n          onClick={handleExplicitSubmit}\n          disabled={disabled}\n          className="w-full py-3 text-xs font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer"\n        >\n          {effectiveSubmitButtonText}\n        </button>`,
    `<Button\n          variant="default"\n          onClick={handleExplicitSubmit}\n          disabled={disabled}\n          className="w-full py-3 h-auto rounded-2xl"\n        >\n          {effectiveSubmitButtonText}\n        </Button>`
  );
  return res;
});

// 9. src/components/common/StandardSliderView.tsx
patchFile('src/components/common/StandardSliderView.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../ui/button';")) {
    res = res.replace("import { QuestionCardShell } from './QuestionCardShell';", "import { QuestionCardShell } from './QuestionCardShell';\nimport { Button } from '../ui/button';");
  }
  res = res.replace(
    `<button\n          type="button"\n          onClick={() => {\n            if (!disabled && !showAnswer) onAnswer(currentVal);\n          }}\n          disabled={disabled}\n          className="w-full py-3 text-xs font-bold text-white bg-primary hover:bg-primary/90 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer"\n        >\n          {effectiveSubmitButtonText}\n        </button>`,
    `<Button\n          variant="default"\n          onClick={() => {\n            if (!disabled && !showAnswer) onAnswer(currentVal);\n          }}\n          disabled={disabled}\n          className="w-full py-3 h-auto rounded-2xl"\n        >\n          {effectiveSubmitButtonText}\n        </Button>`
  );
  return res;
});

// 10. src/components/GlobalSettingsModal.tsx
patchFile('src/components/GlobalSettingsModal.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from './ui/button';")) {
    res = res.replace("import { GeneralPreferencesSection } from './settings/sections/GeneralPreferencesSection';", "import { GeneralPreferencesSection } from './settings/sections/GeneralPreferencesSection';\nimport { Button } from './ui/button';");
  }
  res = res.replace(
    `<button\n          type="button"\n          onClick={onClose}\n          className="w-full py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] cursor-pointer"\n        >\n          {t('common.complete')}\n        </button>`,
    `<Button\n          variant="default"\n          onClick={onClose}\n          className="w-full py-2.5 h-auto"\n        >\n          {t('common.complete')}\n        </Button>`
  );
  return res;
});

// 11. src/components/training/TrainingShell.tsx
patchFile('src/components/training/TrainingShell.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../ui/button';")) {
    res = res.replace("import { IdlePauseOverlay } from '../common/IdlePauseOverlay';", "import { IdlePauseOverlay } from '../common/IdlePauseOverlay';\nimport { Button } from '../ui/button';");
  }
  res = res.replace(
    `<button\n              type="button"\n              onClick={handleRequestFinish}\n              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95"\n              title={t('shell.exitTraining')}\n            >\n              <ArrowLeft className="w-3.5 h-3.5" />\n              <span className="hidden sm:inline">{t('shell.exitTraining')}</span>\n            </button>`,
    `<Button\n              variant="secondary"\n              size="sm"\n              onClick={handleRequestFinish}\n              className="gap-1.5 flex-shrink-0"\n              title={t('shell.exitTraining')}\n            >\n              <ArrowLeft className="w-3.5 h-3.5" />\n              <span className="hidden sm:inline">{t('shell.exitTraining')}</span>\n            </Button>`
  );
  res = res.replace(
    `<button\n                  type="button"\n                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}\n                  onMouseEnter={() => setShowHelpTooltip(true)}\n                  onMouseLeave={() => setShowHelpTooltip(false)}\n                  className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded-md flex-shrink-0 cursor-pointer"\n                  title={t('shell.instructionTitle')}\n                >\n                  <HelpCircle className="w-3.5 h-3.5" />\n                </button>`,
    `<Button\n                  variant="ghost"\n                  size="iconSm"\n                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}\n                  onMouseEnter={() => setShowHelpTooltip(true)}\n                  onMouseLeave={() => setShowHelpTooltip(false)}\n                  className="text-muted-foreground hover:text-primary p-0.5 h-6 w-6 flex-shrink-0"\n                  title={t('shell.instructionTitle')}\n                >\n                  <HelpCircle className="w-3.5 h-3.5" />\n                </Button>`
  );
  res = res.replace(
    `<button\n              type="button"\n              onClick={handleRequestFinish}\n              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all active:scale-95"\n            >\n              {t('shell.viewSummary')}\n            </button>`,
    `<Button\n              variant="default"\n              onClick={handleRequestFinish}\n              className="px-5 py-2.5 h-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"\n            >\n              {t('shell.viewSummary')}\n            </Button>`
  );
  res = res.replace(
    `<button\n              type="button"\n              onClick={handleNextQuestion}\n              disabled={!showAnswer}\n              className={\`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 \${\n                showAnswer\n                  ? 'bg-primary hover:bg-primary/90 shadow-md active:scale-95'\n                  : 'bg-slate-200 dark:bg-muted text-muted-foreground dark:text-muted-foreground cursor-not-allowed'\n              }\`}\n            >\n              {t('common.nextQuestion')}\n              <ChevronRight className="w-3.5 h-3.5" />\n            </button>`,
    `<Button\n              variant="default"\n              onClick={handleNextQuestion}\n              disabled={!showAnswer}\n              className="px-5 py-2.5 h-auto gap-1"\n            >\n              {t('common.nextQuestion')}\n              <ChevronRight className="w-3.5 h-3.5" />\n            </Button>`
  );
  return res;
});

// 12. src/components/discovery/FilterEngine.tsx
patchFile('src/components/discovery/FilterEngine.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../ui/button';")) {
    res = res.replace("import { TagPill } from '../common/TagPill';", "import { TagPill } from '../common/TagPill';\nimport { Button } from '../ui/button';");
  }
  res = res.replace(
    `<button\n            type="button"\n            onClick={() => onChange({ ...query, showAdvanced: !isAdvancedOpen })}\n            className={\`\${\n              isCompact ? 'px-2.5 py-1.5 text-[11px] rounded-lg' : 'px-3 py-2 text-xs rounded-xl'\n            } font-bold border transition-all flex items-center gap-1.5 cursor-pointer \${\n              isAdvancedOpen\n                ? 'bg-accent text-primary border-border dark:border-border shadow-xs'\n                : 'bg-white dark:bg-muted text-muted-foreground border-border hover:bg-accent/60'\n            }\`}\n          >\n            <Filter className="w-3 h-3 text-primary" />\n            <span>\n              {isAdvancedOpen ? t('home.collapseAdvancedFilter') : t('home.advancedFilter')}\n            </span>\n          </button>`,
    `<Button\n            variant={isAdvancedOpen ? 'accent' : 'outline'}\n            size={isCompact ? 'sm' : 'default'}\n            onClick={() => onChange({ ...query, showAdvanced: !isAdvancedOpen })}\n            className="gap-1.5 h-auto py-2"\n          >\n            <Filter className="w-3 h-3 text-primary" />\n            <span>\n              {isAdvancedOpen ? t('home.collapseAdvancedFilter') : t('home.advancedFilter')}\n            </span>\n          </Button>`
  );
  res = res.replace(
    `<button\n              type="button"\n              onClick={() => onChange(isAdvancedOpen ? { showAdvanced: true } : {})}\n              className={\`\${\n                isCompact ? 'px-2 py-1.5 text-[11px] rounded-lg' : 'px-2.5 py-2 text-xs rounded-xl'\n              } font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 dark:border-rose-900/60 transition-all flex items-center gap-1 cursor-pointer\`}\n              title={t('common.clear')}\n            >\n              <RotateCcw className="w-3 h-3" />\n              <span>{t('common.clear')}</span>\n            </button>`,
    `<Button\n              variant="ghost"\n              size={isCompact ? 'sm' : 'default'}\n              onClick={() => onChange(isAdvancedOpen ? { showAdvanced: true } : {})}\n              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200/60 dark:border-rose-900/60 gap-1 h-auto py-2"\n              title={t('common.clear')}\n            >\n              <RotateCcw className="w-3 h-3" />\n              <span>{t('common.clear')}</span>\n            </Button>`
  );
  return res;
});

// 13. src/views/DiscoveryView.tsx
patchFile('src/views/DiscoveryView.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../components/ui/button';")) {
    res = res.replace("import { ModeCard } from '../components/common/ModeCard';", "import { ModeCard } from '../components/common/ModeCard';\nimport { Button } from '../components/ui/button';");
  }
  res = res.replace(
    `<button\n            type="button"\n            onClick={() => handleQueryChange({})}\n            className="mt-2 px-4 py-2 text-xs font-bold text-primary bg-accent hover:bg-accent dark:hover:bg-indigo-900/60 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"\n          >\n            <RotateCcw className="w-3.5 h-3.5" />\n            {t('home.resetFilter')}\n          </button>`,
    `<Button\n            variant="accent"\n            onClick={() => handleQueryChange({})}\n            className="mt-2 gap-1.5"\n          >\n            <RotateCcw className="w-3.5 h-3.5" />\n            {t('home.resetFilter')}\n          </Button>`
  );
  return res;
});

// 14. src/views/PlanTrainingView.tsx
patchFile('src/views/PlanTrainingView.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../components/ui/button';")) {
    res = res.replace("import { GenericTrainingView } from './GenericTrainingView';", "import { GenericTrainingView } from './GenericTrainingView';\nimport { Button } from '../components/ui/button';");
  }
  res = res.replace(
    `<button\n            type="button"\n            onClick={handleRequestExit}\n            className="px-3 py-1.5 text-xs font-bold text-foreground hover:text-rose-600 dark:hover:text-rose-400 bg-muted hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-border rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"\n            title={t('plan.exitPlan')}\n          >\n            <ArrowLeft className="w-3.5 h-3.5" />\n            {t('plan.exitPlan')}\n          </button>`,
    `<Button\n            variant="secondary"\n            size="sm"\n            onClick={handleRequestExit}\n            className="gap-1.5 text-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-border"\n            title={t('plan.exitPlan')}\n          >\n            <ArrowLeft className="w-3.5 h-3.5" />\n            {t('plan.exitPlan')}\n          </Button>`
  );
  res = res.replace(
    `<button\n            type="button"\n            onClick={handleSkipCurrentStage}\n            className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-primary bg-muted hover:bg-accent/50 border border-border rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"\n            title={t('plan.skipStage')}\n          >\n            <FastForward className="w-3.5 h-3.5 text-primary" />\n            {t('plan.skipStage')}\n          </button>`,
    `<Button\n            variant="secondary"\n            size="sm"\n            onClick={handleSkipCurrentStage}\n            className="gap-1.5 text-muted-foreground hover:text-primary border border-border"\n            title={t('plan.skipStage')}\n          >\n            <FastForward className="w-3.5 h-3.5 text-primary" />\n            {t('plan.skipStage')}\n          </Button>`
  );
  return res;
});

// 15. src/views/PlanEditorView.tsx
patchFile('src/views/PlanEditorView.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../components/ui/button';")) {
    res = res.replace("import { CardPickerPanel } from '../components/plan/editor/CardPickerPanel';", "import { CardPickerPanel } from '../components/plan/editor/CardPickerPanel';\nimport { Button } from '../components/ui/button';");
  }
  res = res.replace(
    `<button\n          type="button"\n          onClick={() => setMobileTab('stages')}\n          className={\`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer \${\n            mobileTab === 'stages'\n              ? 'bg-card text-primary shadow-sm'\n              : 'text-muted-foreground hover:text-foreground'\n          }\`}\n        >\n          <ListOrdered className="w-3.5 h-3.5" />\n          <span>{t('plan.stageCount', { count: currentPlan.items.length })}</span>\n        </button>`,
    `<Button\n          variant={mobileTab === 'stages' ? 'default' : 'ghost'}\n          size="sm"\n          onClick={() => setMobileTab('stages')}\n          className="flex-1 gap-1.5 h-auto py-2"\n        >\n          <ListOrdered className="w-3.5 h-3.5" />\n          <span>{t('plan.stageCount', { count: currentPlan.items.length })}</span>\n        </Button>`
  );
  res = res.replace(
    `<button\n          type="button"\n          onClick={() => setMobileTab('picker')}\n          className={\`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer \${\n            mobileTab === 'picker'\n              ? 'bg-card text-primary shadow-sm'\n              : 'text-muted-foreground hover:text-foreground'\n          }\`}\n        >\n          <Sparkles className="w-3.5 h-3.5" />\n          <span>{t('plan.selectCardPrompt')}</span>\n        </button>`,
    `<Button\n          variant={mobileTab === 'picker' ? 'default' : 'ghost'}\n          size="sm"\n          onClick={() => setMobileTab('picker')}\n          className="flex-1 gap-1.5 h-auto py-2"\n        >\n          <Sparkles className="w-3.5 h-3.5" />\n          <span>{t('plan.selectCardPrompt')}</span>\n        </Button>`
  );
  return res;
});

// 16. src/components/navigation/AppNavigation.tsx
patchFile('src/components/navigation/AppNavigation.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Badge } from '../ui/badge';")) {
    res = res.replace("import type { RouteLocation } from '../../hooks/useHashRoute';", "import type { RouteLocation } from '../../hooks/useHashRoute';\nimport { Badge } from '../ui/badge';");
  }
  res = res.replace(
    `<span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-accent text-primary rounded-md border border-border/60 dark:border-border">\n                  v{__APP_VERSION__}\n                </span>`,
    `<Badge variant="accent" size="sm" className="font-mono text-[9px]">\n                  v{__APP_VERSION__}\n                </Badge>`
  );
  res = res.replace(
    `bg-primary dark:bg-indigo-400`,
    `bg-primary`
  );
  return res;
});

// 17. src/components/settings/common/SliderMarginGroup.tsx
patchFile('src/components/settings/common/SliderMarginGroup.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../../ui/button';")) {
    res = res.replace("import { useTranslation } from '../../../core/i18n';", "import { useTranslation } from '../../../core/i18n';\nimport { Button } from '../../ui/button';");
  }
  res = res.replace(
    `<button\n            type="button"\n            key={opt.value}\n            onClick={() => onChange(opt.value)}\n            className={\`py-2 text-xs font-bold rounded-xl border transition-all \${\n              value === opt.value\n                ? 'bg-primary text-white border-primary shadow-sm'\n                : 'bg-white dark:bg-muted text-muted-foreground border-border hover:bg-accent'\n            }\`}\n          >\n            {opt.label}\n          </button>`,
    `<Button\n            key={opt.value}\n            variant={value === opt.value ? 'default' : 'outline'}\n            size="sm"\n            onClick={() => onChange(opt.value)}\n            className="py-2 h-auto"\n          >\n            {opt.label}\n          </Button>`
  );
  return res;
});

// 18. src/components/settings/common/TargetingSection.tsx
patchFile('src/components/settings/common/TargetingSection.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../../ui/button';")) {
    res = res.replace("import { useTranslation } from '../../../core/i18n';", "import { useTranslation } from '../../../core/i18n';\nimport { Button } from '../../ui/button';");
  }
  res = res.replace(
    `<button\n            type="button"\n            key={m.id}\n            onClick={() => onModeChange(m.id as TargetingMode)}\n            className={\`py-2 text-xs font-bold rounded-xl border transition-all \${\n              mode === m.id\n                ? 'bg-primary text-white border-primary shadow-sm'\n                : 'bg-white dark:bg-muted text-muted-foreground border-border hover:bg-accent'\n            }\`}\n          >\n            {m.label}\n          </button>`,
    `<Button\n            key={m.id}\n            variant={mode === m.id ? 'default' : 'outline'}\n            onClick={() => onModeChange(m.id as TargetingMode)}\n            className="py-2 h-auto"\n          >\n            {m.label}\n          </Button>`
  );
  res = res.replace(
    `<button\n                  type="button"\n                  key={name}\n                  onClick={() => onToggleSector(idx)}\n                  className={\`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all \${\n                    selected\n                      ? 'bg-accent text-primary border-border dark:border-border shadow-sm'\n                      : 'bg-white dark:bg-muted text-muted-foreground border-border hover:bg-accent'\n                  }\`}\n                >\n                  {label}\n                </button>`,
    `<Button\n                  key={name}\n                  variant={selected ? 'accent' : 'outline'}\n                  size="sm"\n                  onClick={() => onToggleSector(idx)}\n                  className="py-1.5 px-1 text-[10px] h-auto"\n                >\n                  {label}\n                </Button>`
  );
  return res;
});

// 19. src/components/settings/DynamicDomainSettings.tsx
patchFile('src/components/settings/DynamicDomainSettings.tsx', (code) => {
  let res = code;
  if (!res.includes("import { Button } from '../ui/button';")) {
    res = res.replace("import { useTranslation } from '../../core/i18n';", "import { useTranslation } from '../../core/i18n';\nimport { Button } from '../ui/button';");
  }
  res = res.replace(
    `<button\n                    type="button"\n                    key={String(opt.value)}\n                    onClick={() => onChange({ [field.key]: opt.value })}\n                    className={\`py-2 text-xs font-bold rounded-xl border transition-all \${\n                      currentVal === opt.value\n                        ? 'bg-primary text-white border-primary shadow-sm'\n                        : 'bg-white dark:bg-muted text-muted-foreground border-border hover:bg-accent'\n                    }\`}\n                  >\n                    {resolveText(opt.label)}\n                  </button>`,
    `<Button\n                    key={String(opt.value)}\n                    variant={currentVal === opt.value ? 'default' : 'outline'}\n                    size="sm"\n                    onClick={() => onChange({ [field.key]: opt.value })}\n                    className="py-2 h-auto"\n                  >\n                    {resolveText(opt.label)}\n                  </Button>`
  );
  return res;
});

console.log('Non-pack refactoring script execution finished.');
~~~~~

~~~~~act
run_command
~~~~~
~~~~~
node scripts/refactor-nonpack-components.mjs
rm scripts/refactor-nonpack-components.mjs
~~~~~

### 下一步建议
1. 再次执行测试与扫描器工具，核对非 Pack 文件已清空所有待迁移项。
2. 确认之后，可直接开始处理各 Pack（如 `src/packs/color/`、`src/packs/star/`、`src/packs/relative_color/`、`src/packs/perspective/`）私有视图的语义化 Token 与组件规范化。

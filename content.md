我已根据扫描报告分析了所有设计系统统一化规范问题。报告中涵盖了 25 处设计系统优化点，涉及将原生 HTML 标签（`<button>`、`<input>`）替换为统一封装的 UI 基础组件（`<Button>`、`<Input>`、`<Badge>`），以及在单元测试与图例组件中消除硬编码颜色。

我将生成一个标准重构计划，对所有涉及的文件进行精确替换与统一化收敛。

## [WIP] refactor(ui): 统一设计系统基础组件与视觉规范

### 用户需求
根据 FormSight 设计系统统一化扫描报告（25 项规范化机会），将项目中散落的原生 `<button>` 标签、裸 `<input>` 元素、硬编码颜色和 Ad-hoc 图例标签统一收敛至设计系统的 UI 基础组件（`Button`、`Input`、`Badge`）与 `PALETTE` 色彩 Token 中。

### 评论
通过将原生元素和 Ad-hoc 样式替换为经过无障碍、响应式与深浅色主题适配的统一 UI 基础原子，能够极大提升组件库的一致性与可维护性，避免设计退化和样式冗余。

### 目标
1. 在 `AppNavigation.tsx`、`CardPickerPanel.tsx`、`PlanLibraryDrawer.tsx` 中将原生 `<button>` 替换为 `<Button>`。
2. 在 `SettingsModal.tsx`、`PlanEditorHeader.tsx`、`DataGovernanceSection.tsx` 中收敛 `<input>`。
3. 在 `Choice2AfcContainer.tsx`、`ChoiceNafcContainer.tsx`、`SessionSummaryModal.tsx`、`ProportionDivisionView.tsx`、`ProportionMigrationView.tsx` 中规范化 Ad-hoc 标记与状态胶囊。
4. 在 `colorUtils.test.ts` 中引用 `PALETTE` 语义常量消除硬编码色值。

### 基本原理
- 利用 `Button` 提供的 `variant="ghost"` / `variant="secondary"` 与 `size` 变体替代裸 `<button>`，统一处理焦点、禁用、缩放与触控反馈。
- 利用 `Badge` 替换手动拼接样式的按键角标与指示胶囊。
- 测试用例直接对齐 `PALETTE.spectrum.*`、`PALETTE.white` 与 `PALETTE.black`，确保色彩 Token 唯一真相源。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/design-system-unification #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 规范化 `AppNavigation.tsx` 中的按钮与徽章指示器

~~~~~act
patch_file
src/components/navigation/AppNavigation.tsx
~~~~~
~~~~~typescript.old
import { BarChart2, Compass, Github, Layers, Settings, Sparkles, Target } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import type { RouteLocation } from '../../hooks/useHashRoute';
import { Badge } from '../ui/badge';

interface AppNavigationProps {
  currentRoute: RouteLocation;
  onNavigate: (route: RouteLocation) => void;
  onOpenSettings: () => void;
}
~~~~~
~~~~~typescript.new
import { BarChart2, Compass, Github, Layers, Settings, Sparkles, Target } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import type { RouteLocation } from '../../hooks/useHashRoute';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface AppNavigationProps {
  currentRoute: RouteLocation;
  onNavigate: (route: RouteLocation) => void;
  onOpenSettings: () => void;
}
~~~~~

~~~~~act
patch_file
src/components/navigation/AppNavigation.tsx
~~~~~
~~~~~typescript.old
          {/* 品牌标识 */}
          <button
            type="button"
            onClick={() => onNavigate({ type: 'home' })}
            className="flex items-center gap-3 text-left cursor-pointer focus:outline-none group px-2 py-1 w-full"
          >
            <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-transform flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-base text-foreground tracking-tight leading-tight flex items-center gap-1.5">
                {t('common.appName')}
                <Badge variant="accent" size="sm" className="font-mono text-[9px]">
                  v{__APP_VERSION__}
                </Badge>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                {t('common.appSubtitle').slice(0, 14)}...
              </div>
            </div>
          </button>

          {/* 导航菜单列表 */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isTabActive(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.target)}
                  className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer select-none text-left ${
                    active
                      ? 'bg-accent text-primary shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      active ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <span className="truncate flex-1">{item.label}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 侧边栏底部：设置与社区外链 */}
        <div className="pt-4 border-t border-border/60 space-y-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-accent/60 transition-all flex items-center gap-2.5 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="truncate">{t('common.globalSettings')}</span>
          </button>
~~~~~
~~~~~typescript.new
          {/* 品牌标识 */}
          <Button
            variant="ghost"
            onClick={() => onNavigate({ type: 'home' })}
            className="h-auto flex items-center justify-start gap-3 text-left group px-2 py-1 w-full rounded-2xl"
          >
            <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-transform flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-base text-foreground tracking-tight leading-tight flex items-center gap-1.5">
                {t('common.appName')}
                <Badge variant="accent" size="sm" className="font-mono text-[9px]">
                  v{__APP_VERSION__}
                </Badge>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                {t('common.appSubtitle').slice(0, 14)}...
              </div>
            </div>
          </Button>

          {/* 导航菜单列表 */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isTabActive(item.id);

              return (
                <Button
                  key={item.id}
                  variant={active ? 'accent' : 'ghost'}
                  onClick={() => onNavigate(item.target)}
                  className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-start gap-3 text-left ${
                    active
                      ? 'bg-accent text-primary shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      active ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <span className="truncate flex-1">{item.label}</span>
                  {active && (
                    <Badge variant="default" size="sm" className="w-1.5 h-1.5 p-0 rounded-full flex-shrink-0" />
                  )}
                </Button>
              );
            })}
          </nav>
        </div>

        {/* 侧边栏底部：设置与社区外链 */}
        <div className="pt-4 border-t border-border/60 space-y-2">
          <Button
            variant="ghost"
            onClick={onOpenSettings}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-accent/60 transition-all flex items-center justify-start gap-2.5 h-auto"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="truncate">{t('common.globalSettings')}</span>
          </Button>
~~~~~

~~~~~act
patch_file
src/components/navigation/AppNavigation.tsx
~~~~~
~~~~~typescript.old
      {/* 2. 移动端底部便携导航栏 (Mobile Bottom Tab Bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-2 py-1.5 flex items-center justify-around shadow-lg transition-colors">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isTabActive(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.target)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                active
                  ? 'text-primary font-extrabold'
                  : 'text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground transition-all cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span>{t('common.settings')}</span>
        </button>
      </div>
~~~~~
~~~~~typescript.new
      {/* 2. 移动端底部便携导航栏 (Mobile Bottom Tab Bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-2 py-1.5 flex items-center justify-around shadow-lg transition-colors">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isTabActive(item.id);

          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onNavigate(item.target)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold transition-all h-auto ${
                active
                  ? 'text-primary font-extrabold'
                  : 'text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Button>
          );
        })}

        <Button
          variant="ghost"
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground transition-all h-auto"
        >
          <Settings className="w-4 h-4" />
          <span>{t('common.settings')}</span>
        </Button>
      </div>
~~~~~

#### Acts 2: 规范化 `Choice2AfcContainer.tsx` 与 `ChoiceNafcContainer.tsx` 的选项序号角标

~~~~~act
patch_file
src/components/common/Choice2AfcContainer.tsx
~~~~~
~~~~~typescript.old
import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { ChoiceCard, getChoiceCardState } from '../ui/choice-card';
~~~~~
~~~~~typescript.new
import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { Badge } from '../ui/badge';
import { ChoiceCard, getChoiceCardState } from '../ui/choice-card';
~~~~~

~~~~~act
patch_file
src/components/common/Choice2AfcContainer.tsx
~~~~~
~~~~~typescript.old
        <div className="flex items-center justify-between w-full px-1">
          <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
            <span className="w-5 h-5 rounded-lg bg-muted text-foreground flex items-center justify-center font-mono text-[11px]">
              {opt.keyLabel || (opt.key === 'A' ? '1' : '2')}
            </span>
            {opt.title}
          </span>
~~~~~
~~~~~typescript.new
        <div className="flex items-center justify-between w-full px-1">
          <span className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase">
            <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-[11px]">
              {opt.keyLabel || (opt.key === 'A' ? '1' : '2')}
            </Badge>
            {opt.title}
          </span>
~~~~~

~~~~~act
patch_file
src/components/common/ChoiceNafcContainer.tsx
~~~~~
~~~~~typescript.old
import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { ChoiceCard, getChoiceCardState } from '../ui/choice-card';
~~~~~
~~~~~typescript.new
import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { Badge } from '../ui/badge';
import { ChoiceCard, getChoiceCardState } from '../ui/choice-card';
~~~~~

~~~~~act
patch_file
src/components/common/ChoiceNafcContainer.tsx
~~~~~
~~~~~typescript.old
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                <span className="w-5 h-5 rounded-lg bg-muted text-foreground flex items-center justify-center font-mono text-[11px]">
                  {keyLabel}
                </span>
                {opt.title || t('common.optionN', { num: keyLabel })}
              </span>
              {showAnswer && isTarget && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
              )}
            </div>
~~~~~
~~~~~typescript.new
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center font-mono text-[11px]">
                  {keyLabel}
                </Badge>
                {opt.title || t('common.optionN', { num: keyLabel })}
              </span>
              {showAnswer && isTarget && (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 font-extrabold" />
              )}
            </div>
~~~~~

#### Acts 3: 规范化计划中心与治理面板中的原生按钮与输入框

~~~~~act
patch_file
src/components/plan/editor/CardPickerPanel.tsx
~~~~~
~~~~~typescript.old
import { Check, Plus, Sparkles } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { getCardDesc, getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { CardQueryOptions } from '../../../types/card';
import { FilterEngine } from '../../discovery/FilterEngine';
~~~~~
~~~~~typescript.new
import { Check, Plus, Sparkles } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { getCardDesc, getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { CardQueryOptions } from '../../../types/card';
import { FilterEngine } from '../../discovery/FilterEngine';
import { Button } from '../../ui/button';
~~~~~

~~~~~act
patch_file
src/components/plan/editor/CardPickerPanel.tsx
~~~~~
~~~~~typescript.old
            return (
              <button
                type="button"
                key={card.id}
                onClick={() => onAddItem(card.id)}
                className={`p-2.5 rounded-2xl text-left transition-all flex items-center justify-between gap-2 group active:scale-[0.98] border cursor-pointer ${cardBgStyle}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={`p-1.5 rounded-xl transition-transform flex-shrink-0 ${iconBgStyle}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold truncate ${
                          isAdded
                            ? 'text-emerald-800 dark:text-emerald-200 dark:text-emerald-200'
                            : 'text-foreground'
                        }`}
                      >
                        {cardTitle}
                      </span>
                      {isAdded && (
                        <span className="font-mono text-[9px] font-black bg-emerald-200/80 dark:bg-emerald-800/80 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.2 rounded-md flex-shrink-0 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          {addedCount > 1 ? `x${addedCount}` : ''}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] truncate ${
                        isAdded
                          ? 'text-emerald-700/80 dark:text-emerald-300/80'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {cardDesc}
                    </div>
                  </div>
                </div>

                <div
                  className={`p-1 rounded-lg flex-shrink-0 transition-colors ${
                    isAdded
                      ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60'
                      : 'text-indigo-400 group-hover:text-primary dark:group-hover:text-indigo-400 hover:bg-accent/50 dark:hover:bg-muted'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </button>
            );
~~~~~
~~~~~typescript.new
            return (
              <Button
                variant="ghost"
                key={card.id}
                onClick={() => onAddItem(card.id)}
                className={`p-2.5 h-auto rounded-2xl text-left transition-all flex items-center justify-between gap-2 group border ${cardBgStyle}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={`p-1.5 rounded-xl transition-transform flex-shrink-0 ${iconBgStyle}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold truncate ${
                          isAdded
                            ? 'text-emerald-800 dark:text-emerald-200'
                            : 'text-foreground'
                        }`}
                      >
                        {cardTitle}
                      </span>
                      {isAdded && (
                        <span className="font-mono text-[9px] font-black bg-emerald-200/80 dark:bg-emerald-800/80 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.2 rounded-md flex-shrink-0 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          {addedCount > 1 ? `x${addedCount}` : ''}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] truncate ${
                        isAdded
                          ? 'text-emerald-700/80 dark:text-emerald-300/80'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {cardDesc}
                    </div>
                  </div>
                </div>

                <div
                  className={`p-1 rounded-lg flex-shrink-0 transition-colors ${
                    isAdded
                      ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60'
                      : 'text-indigo-400 group-hover:text-primary dark:group-hover:text-indigo-400 hover:bg-accent/50 dark:hover:bg-muted'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </Button>
            );
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanLibraryDrawer.tsx
~~~~~
~~~~~typescript.old
              <button
                type="button"
                onClick={() => onSelectPlan(p)}
                className="min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-foreground truncate">{p.name}</span>
                  {p.isBuiltin && (
                    <Badge variant="accent" size="sm">
                      {t('plan.officialTag')}
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {t('plan.stageAndTrialsSummary', { stages: stageCount, trials: totalTrials })}
                </div>
              </button>
~~~~~
~~~~~typescript.new
              <Button
                variant="ghost"
                onClick={() => onSelectPlan(p)}
                className="min-w-0 flex-1 text-left justify-start flex-col items-start p-0 h-auto"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-foreground truncate">{p.name}</span>
                  {p.isBuiltin && (
                    <Badge variant="accent" size="sm">
                      {t('plan.officialTag')}
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 font-normal">
                  {t('plan.stageAndTrialsSummary', { stages: stageCount, trials: totalTrials })}
                </div>
              </Button>
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanEditorHeader.tsx
~~~~~
~~~~~typescript.old
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onImportPlan}
          className="hidden"
        />
~~~~~
~~~~~typescript.new
        <Input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onImportPlan}
          className="hidden"
        />
~~~~~

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript.old
import { ConfirmModal } from '../../common/ConfirmModal';
import type { ToastType } from '../../common/Toast';
import { Button } from '../../ui/button';

interface DataGovernanceSectionProps {
~~~~~
~~~~~typescript.new
import { ConfirmModal } from '../../common/ConfirmModal';
import type { ToastType } from '../../common/Toast';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

interface DataGovernanceSectionProps {
~~~~~

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript.old
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />
~~~~~
~~~~~typescript.new
        <Input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />
~~~~~

#### Acts 4: 规范化 `SettingsModal.tsx`、`SessionSummaryModal.tsx` 与透视组件的图例

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
import { ModalShell } from './common/ModalShell';
import { DynamicDomainSettings } from './settings/DynamicDomainSettings';
import { Button } from './ui/button';
import { Switch } from './ui/switch';

interface SettingsModalProps {
~~~~~
~~~~~typescript.new
import { ModalShell } from './common/ModalShell';
import { DynamicDomainSettings } from './settings/DynamicDomainSettings';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';

interface SettingsModalProps {
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={cardConfig.autoNextDelay}
              onInput={(e) => {
                const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                updateCardConfig({ autoNextDelay: val });
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
~~~~~
~~~~~typescript.new
            <Input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={cardConfig.autoNextDelay}
              onInput={(e) => {
                const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                updateCardConfig({ autoNextDelay: val });
              }}
              className="w-full accent-indigo-600 cursor-pointer p-0 h-auto bg-transparent border-none shadow-none"
            />
~~~~~

~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~typescript.old
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{' '}
                {t('summary.hitLegend')}
              </span>
              <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{' '}
                {t('summary.missLegend')}
              </span>
            </div>
~~~~~
~~~~~typescript.new
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Badge variant="success" size="sm" className="w-2 h-2 p-0 rounded-full border-none" />{' '}
                {t('summary.hitLegend')}
              </span>
              <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-semibold">
                <Badge variant="destructive" size="sm" className="w-2 h-2 p-0 rounded-full border-none" />{' '}
                {t('summary.missLegend')}
              </span>
            </div>
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionDivisionView.tsx
~~~~~
~~~~~typescript.old
import { Disc } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { useTranslation } from '../../../core/i18n';
import type { Point } from '../../../types';
~~~~~
~~~~~typescript.new
import { Disc } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { Badge } from '../../../components/ui/badge';
import { useTranslation } from '../../../core/i18n';
import type { Point } from '../../../types';
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionDivisionView.tsx
~~~~~
~~~~~typescript.old
        <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-indigo-600 inline-block" />
            <span>{t('common.startPercent')}</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span>{t('common.endPercent')}</span>
          </span>
        </div>
~~~~~
~~~~~typescript.new
        <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Badge variant="accent" size="sm" className="w-2.5 h-2.5 p-0 rounded-full border-2 border-indigo-600 bg-indigo-600" />
            <span>{t('common.startPercent')}</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <Badge variant="secondary" size="sm" className="w-2 h-2 p-0 rounded-full border-none bg-slate-400" />
            <span>{t('common.endPercent')}</span>
          </span>
        </div>
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionMigrationView.tsx
~~~~~
~~~~~typescript.old
import { ArrowRightLeft } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { useTranslation } from '../../../core/i18n';
import type { Point } from '../../../types';
~~~~~
~~~~~typescript.new
import { ArrowRightLeft } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { Badge } from '../../../components/ui/badge';
import { useTranslation } from '../../../core/i18n';
import type { Point } from '../../../types';
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionMigrationView.tsx
~~~~~
~~~~~typescript.old
        <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-indigo-600 inline-block" />
            <span>{t('common.startPercent')}</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span>{t('common.endPercent')}</span>
          </span>
        </div>
~~~~~
~~~~~typescript.new
        <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Badge variant="accent" size="sm" className="w-2.5 h-2.5 p-0 rounded-full border-2 border-indigo-600 bg-indigo-600" />
            <span>{t('common.startPercent')}</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <Badge variant="secondary" size="sm" className="w-2 h-2 p-0 rounded-full border-none bg-slate-400" />
            <span>{t('common.endPercent')}</span>
          </span>
        </div>
~~~~~

#### Acts 5: 在 `colorUtils.test.ts` 中引用 `PALETTE` 消除硬编码色值

~~~~~act
patch_file
src/utils/__tests__/colorUtils.test.ts
~~~~~
~~~~~typescript.old
import { describe, expect, it } from 'vitest';
import { checkColorHit, generateColorQuestion, hsvToHex } from '../../core/color/colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from '../../core/color/oklchUtils';

describe('colorUtils & oklchUtils', () => {
  it('hsvToHex - should correctly convert HSV to HEX string including 360 boundary', () => {
    expect(hsvToHex(0, 100, 100)).toBe('#FF0000'); // Red
    expect(hsvToHex(360, 100, 100)).toBe('#FF0000'); // Red 360 boundary
    expect(hsvToHex(120, 100, 100)).toBe('#00FF00'); // Green
    expect(hsvToHex(240, 100, 100)).toBe('#0000FF'); // Blue
    expect(hsvToHex(0, 0, 100)).toBe('#FFFFFF'); // White
    expect(hsvToHex(0, 0, 0)).toBe('#000000'); // Black
  });
~~~~~
~~~~~typescript.new
import { describe, expect, it } from 'vitest';
import { checkColorHit, generateColorQuestion, hsvToHex } from '../../core/color/colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from '../../core/color/oklchUtils';
import { PALETTE } from '../theme';

describe('colorUtils & oklchUtils', () => {
  it('hsvToHex - should correctly convert HSV to HEX string including 360 boundary', () => {
    expect(hsvToHex(0, 100, 100)).toBe(PALETTE.spectrum.red);
    expect(hsvToHex(360, 100, 100)).toBe(PALETTE.spectrum.red);
    expect(hsvToHex(120, 100, 100)).toBe(PALETTE.spectrum.green);
    expect(hsvToHex(240, 100, 100)).toBe(PALETTE.spectrum.blue);
    expect(hsvToHex(0, 0, 100)).toBe(PALETTE.white);
    expect(hsvToHex(0, 0, 0)).toBe(PALETTE.black);
  });
~~~~~

### 下一步建议
1. 运行 `pnpm test` 与 `pnpm build` 验证所有单元测试及类型检查均 100% 通过。
2. 重新执行扫描脚本，验证 25 项统一化机会已完全清零。
3. 验证无误后，生成 `[COMMIT]` 计划正式提交变更。

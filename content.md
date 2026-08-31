现在我们继续在设置界面的各个功能板块（`GeneralPreferencesSection.tsx` 和 `DataGovernanceSection.tsx`）中接入 `<Button>` UI 原语，消除手写类名并统一操作态与焦点样式。

## [WIP] refactor(settings): 在偏好设置与数据治理板块中全面接入 Button UI 原语

### 用户需求
在偏好设置（`GeneralPreferencesSection`）与数据治理（`DataGovernanceSection`）中，将外观主题切换器、语言切换器、闲置超时档位选择、数据备份导入导出、数据库瘦身以及危险重置等按钮全面替换为统一的 `<Button>` 组件。

### 评论
设置面板涉及常规偏好切换（轻量）、数据治理导出（主操作）以及数据清空（危险操作）等多种语义场景。使用 `<Button variant="default | outline | ghost | danger">` 能清晰传达操作权重与风险等级，提升可访问性与统一的无障碍焦点体验。

### 目标
1. 在 `GeneralPreferencesSection.tsx` 中引入 `<Button>` 原语，替换主题模式、语言切换与闲置超时时间选择按钮。
2. 在 `DataGovernanceSection.tsx` 中引入 `<Button>` 原语，替换流式备份导出、备份导入、安全瘦身、重置官方计划及危险清空按钮。

### 基本原理
利用 `Button` 组件的变体属性：
- 普通工具栏/分段器切换使用 `variant="ghost"` / `variant="default"`
- 次级操作框使用 `variant="outline"`
- 危险删除操作使用 `variant="danger"`
从而避免大量手写的 `hover:bg-slate-xxx` 和 `active:scale-95` 内联类名。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/settings-ui-primitives #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 在 `GeneralPreferencesSection.tsx` 中接入 `Button` 原语

我们将重构偏好设置板块，统一主题、语言与休眠时长的切换按钮。

~~~~~act
patch_file
src/components/settings/sections/GeneralPreferencesSection.tsx
~~~~~
~~~~~typescript.old
import { Clock, Globe, HelpCircle, Monitor, Moon, Sun, Volume2 } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import { applyThemeToDocument } from '../../../hooks/useTheme';
import type { GlobalSettings, ThemeMode, UserSettings } from '../../../utils/settings';
import type { ToastType } from '../../common/Toast';
import { SettingToggleItem } from '../common/SettingToggleItem';
import { SliderMarginGroup } from '../common/SliderMarginGroup';

interface GeneralPreferencesSectionProps {
~~~~~
~~~~~typescript.new
import { Clock, Globe, HelpCircle, Monitor, Moon, Sun, Volume2 } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import { applyThemeToDocument } from '../../../hooks/useTheme';
import type { GlobalSettings, ThemeMode, UserSettings } from '../../../utils/settings';
import type { ToastType } from '../../common/Toast';
import { Button } from '../../ui/button';
import { SettingToggleItem } from '../common/SettingToggleItem';
import { SliderMarginGroup } from '../common/SliderMarginGroup';

interface GeneralPreferencesSectionProps {
~~~~~

~~~~~act
patch_file
src/components/settings/sections/GeneralPreferencesSection.tsx
~~~~~
~~~~~typescript.old
        <div className="flex items-center bg-muted p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              currentTheme === 'light'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={t('settings.themeLight')}
          >
            <Sun className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeLight')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              currentTheme === 'dark'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={t('settings.themeDark')}
          >
            <Moon className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeDark')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('system')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              currentTheme === 'system'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={t('settings.themeSystem')}
          >
            <Monitor className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeSystem')}</span>
          </button>
        </div>
      </div>

      {/* 语言切换器 */}
      <div className="flex items-center justify-between bg-muted/60 p-3.5 rounded-2xl border border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-accent text-primary rounded-xl">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">{t('settings.languageTitle')}</div>
            <div className="text-[11px] text-slate-400">{t('settings.languageDesc')}</div>
          </div>
        </div>

        <div className="flex items-center bg-muted p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => handleLocaleChange('zh-CN')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              (settings.global.locale || locale) === 'zh-CN'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('settings.langZh')}
          </button>
          <button
            type="button"
            onClick={() => handleLocaleChange('en-US')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              (settings.global.locale || locale) === 'en-US'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('settings.langEn')}
          </button>
        </div>
      </div>
~~~~~
~~~~~typescript.new
        <div className="flex items-center bg-muted p-0.5 rounded-xl gap-0.5">
          <Button
            variant={currentTheme === 'light' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleThemeChange('light')}
            className="gap-1 h-auto py-1 px-2.5"
            title={t('settings.themeLight')}
          >
            <Sun className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeLight')}</span>
          </Button>
          <Button
            variant={currentTheme === 'dark' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleThemeChange('dark')}
            className="gap-1 h-auto py-1 px-2.5"
            title={t('settings.themeDark')}
          >
            <Moon className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeDark')}</span>
          </Button>
          <Button
            variant={currentTheme === 'system' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleThemeChange('system')}
            className="gap-1 h-auto py-1 px-2.5"
            title={t('settings.themeSystem')}
          >
            <Monitor className="w-3 h-3" />
            <span className="hidden sm:inline">{t('settings.themeSystem')}</span>
          </Button>
        </div>
      </div>

      {/* 语言切换器 */}
      <div className="flex items-center justify-between bg-muted/60 p-3.5 rounded-2xl border border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-accent text-primary rounded-xl">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">{t('settings.languageTitle')}</div>
            <div className="text-[11px] text-muted-foreground">{t('settings.languageDesc')}</div>
          </div>
        </div>

        <div className="flex items-center bg-muted p-0.5 rounded-xl gap-0.5">
          <Button
            variant={(settings.global.locale || locale) === 'zh-CN' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleLocaleChange('zh-CN')}
            className="h-auto py-1 px-2.5"
          >
            {t('settings.langZh')}
          </Button>
          <Button
            variant={(settings.global.locale || locale) === 'en-US' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleLocaleChange('en-US')}
            className="h-auto py-1 px-2.5"
          >
            {t('settings.langEn')}
          </Button>
        </div>
      </div>
~~~~~

~~~~~act
patch_file
src/components/settings/sections/GeneralPreferencesSection.tsx
~~~~~
~~~~~typescript.old
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[
            { label: t('settings.idleOff'), value: 0 },
            { label: t('settings.idle30s'), value: 30 },
            { label: t('settings.idle60s'), value: 60 },
            { label: t('settings.idle120s'), value: 120 },
          ].map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => onUpdateGlobal({ idleTimeout: opt.value })}
              className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                settings.global.idleTimeout === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
~~~~~
~~~~~typescript.new
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[
            { label: t('settings.idleOff'), value: 0 },
            { label: t('settings.idle30s'), value: 30 },
            { label: t('settings.idle60s'), value: 60 },
            { label: t('settings.idle120s'), value: 120 },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={settings.global.idleTimeout === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onUpdateGlobal({ idleTimeout: opt.value })}
              className="py-2 h-auto"
            >
              {opt.label}
            </Button>
          ))}
        </div>
~~~~~

#### Acts 2: 在 `DataGovernanceSection.tsx` 中接入 `Button` 原语

我们将重构数据治理板块，接入备份、修剪、重置和删除按钮。

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript.old
import { Download, RotateCcw, Scissors, Trash2, Upload } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import {
  clearAllData,
  exportAllDataStream,
  importAllData,
  pruneColdRecords,
} from '../../../utils/db/index';
import { resetPlansToDefault } from '../../../utils/planStorage';
import { ConfirmModal } from '../../common/ConfirmModal';
import type { ToastType } from '../../common/Toast';

interface DataGovernanceSectionProps {
~~~~~
~~~~~typescript.new
import { Download, RotateCcw, Scissors, Trash2, Upload } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import {
  clearAllData,
  exportAllDataStream,
  importAllData,
  pruneColdRecords,
} from '../../../utils/db/index';
import { resetPlansToDefault } from '../../../utils/planStorage';
import { ConfirmModal } from '../../common/ConfirmModal';
import type { ToastType } from '../../common/Toast';
import { Button } from '../../ui/button';

interface DataGovernanceSectionProps {
~~~~~

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript.old
  return (
    <div className="space-y-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {t('settings.dataGovernance')}
      </div>

      {/* 备份导出与导入 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isExporting}
          onClick={handleExport}
          className="py-3 px-4 bg-muted/60 hover:bg-accent/50 hover:text-primary border border-border rounded-2xl text-xs font-bold text-foreground dark:text-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4 text-indigo-600" />
          {isExporting ? t('settings.exporting') : t('settings.exportStream')}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="py-3 px-4 bg-muted/60 hover:bg-accent/50 hover:text-primary border border-border rounded-2xl text-xs font-bold text-foreground transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
        >
          <Upload className="w-4 h-4 text-indigo-600" />
          {t('settings.importBackup')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {/* 数据库瘦身与修剪 */}
      <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-primary rounded-xl">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              {t('settings.pruneTitle')}
            </div>
            <div className="text-[11px] text-primary">{t('settings.pruneDesc')}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPruneConfirm(true)}
          className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0 cursor-pointer"
        >
          {t('settings.pruneBtn')}
        </button>
      </div>

      {/* 计划库重置与危险操作 */}
      <div className="pt-2 border-t border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-foreground">{t('settings.resetPlansTitle')}</div>
            <div className="text-[11px] text-slate-400">{t('settings.resetPlansDesc')}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowResetPlansConfirm(true)}
            className="py-2 px-3 bg-muted hover:bg-accent text-foreground border border-border rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('settings.resetPlansBtn')}
          </button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xs font-bold text-rose-600">{t('settings.clearDataTitle')}</div>
            <div className="text-[11px] text-slate-400">{t('settings.clearDataDesc')}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="py-2 px-3 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('settings.clearDataBtn')}
          </button>
        </div>
      </div>
~~~~~
~~~~~typescript.new
  return (
    <div className="space-y-4">
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {t('settings.dataGovernance')}
      </div>

      {/* 备份导出与导入 */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          disabled={isExporting}
          onClick={handleExport}
          className="py-3 px-4 rounded-2xl gap-2 h-auto"
        >
          <Download className="w-4 h-4 text-primary" />
          {isExporting ? t('settings.exporting') : t('settings.exportStream')}
        </Button>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="py-3 px-4 rounded-2xl gap-2 h-auto"
        >
          <Upload className="w-4 h-4 text-primary" />
          {t('settings.importBackup')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {/* 数据库瘦身与修剪 */}
      <div className="bg-accent p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-primary rounded-xl">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">
              {t('settings.pruneTitle')}
            </div>
            <div className="text-[11px] text-primary">{t('settings.pruneDesc')}</div>
          </div>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowPruneConfirm(true)}
          className="flex-shrink-0"
        >
          {t('settings.pruneBtn')}
        </Button>
      </div>

      {/* 计划库重置与危险操作 */}
      <div className="pt-2 border-t border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-foreground">{t('settings.resetPlansTitle')}</div>
            <div className="text-[11px] text-muted-foreground">{t('settings.resetPlansDesc')}</div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowResetPlansConfirm(true)}
            className="gap-1 border border-border"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('settings.resetPlansBtn')}
          </Button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xs font-bold text-rose-600">{t('settings.clearDataTitle')}</div>
            <div className="text-[11px] text-muted-foreground">{t('settings.clearDataDesc')}</div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            className="gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('settings.clearDataBtn')}
          </Button>
        </div>
      </div>
~~~~~

### 下一步建议
1. **全局弹窗（ConfirmModal / SessionSummaryModal）重构**：检查并替换弹窗底部的确认/取消操作按钮为统一的 `<Button>` 原语。
2. **测试与构建校验**：运行测试与打包命令验证类型安全性。
3. **创建 Git 提交**：若当前阶段代码稳定，可进行一次完整的版本提交。

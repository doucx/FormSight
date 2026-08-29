现在我们对榜单第 1 名的 **`GlobalSettingsModal.tsx`**（Score: 51.8, SLOC: 425）进行拆分重构。

本次实施将：
1. 创建 **`GeneralPreferencesSection`**：封装界面语言、音效、文字指引、休眠保护与滑块边缘感应等系统常规偏好配置；
2. 创建 **`DataGovernanceSection`**：封装流式备份导出、JSON 导入、数据库瘦身（Prune）、计划重置与全量数据清空及其对应的 3 个 `ConfirmModal` 确认逻辑；
3. 将 **`GlobalSettingsModal.tsx`** 精简为装配容器（代码量从 425 行降至 ~60 行）。

## [WIP] refactor: 模块化拆分 GlobalSettingsModal 设置弹窗

### 用户需求
拆解 `GlobalSettingsModal.tsx` 中的两类完全不同职责的业务逻辑（常规偏好 vs 高危数据备份与治理），消除多重嵌套弹窗状态，降低单文件复杂度。

### 评论
原组件在同一个视图内管理了 3 组独立的危险确认弹窗状态和深层 I/O 事件，通过按领域垂直拆解为「常规偏好」和「数据治理」两个自包含的子模块，不仅能消除过载，也便于后续独立扩充设置项。

### 目标
1. 新建 `src/components/settings/sections/GeneralPreferencesSection.tsx` 承载常规偏好项。
2. 新建 `src/components/settings/sections/DataGovernanceSection.tsx` 承载数据备份、修剪与清理逻辑及二次确认弹窗。
3. 重写 `src/components/GlobalSettingsModal.tsx`，使其专注于弹窗外壳与子章节排版。

### 基本原理
按照领域驱动与职责单一原则，将无害设置项与高危数据持久化操作进行物理隔离。各子章节就近管理自身涉及的 I/O 事件与确认状态。

### 标签
#intent/refine #flow/ready #priority/high #comp/settings #concept/config #concept/state #scope/core #scope/dx #ai/delegate #task/domain/refactoring #task/object/god-files #task/action/modularization #task/state/continue

---

### Script

#### Acts 1: 创建 `GeneralPreferencesSection` 常规偏好配置组件

新建常规偏好模块，处理语言切换、音效开关、指引开关、闲置休眠及滑块感应边缘。

~~~~~act
write_file
src/components/settings/sections/GeneralPreferencesSection.tsx
~~~~~
~~~~~typescript
import { Clock, Globe, HelpCircle, Volume2 } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import type { GlobalSettings, UserSettings } from '../../../utils/settings';
import type { ToastType } from '../../common/Toast';
import { SettingToggleItem } from '../common/SettingToggleItem';
import { SliderMarginGroup } from '../common/SliderMarginGroup';

interface GeneralPreferencesSectionProps {
  settings: UserSettings;
  onUpdateGlobal: (patch: Partial<GlobalSettings>) => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function GeneralPreferencesSection({
  settings,
  onUpdateGlobal,
  showToast,
}: GeneralPreferencesSectionProps) {
  const { t, locale, setLocale } = useTranslation();

  const handleLocaleChange = (newLocale: string) => {
    onUpdateGlobal({ locale: newLocale });
    setLocale(newLocale);
    showToast(t('settings.switchedLocaleToast'), 'success');
  };

  return (
    <div className="space-y-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {t('settings.preferences')}
      </div>

      {/* 语言切换器 */}
      <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700">{t('settings.languageTitle')}</div>
            <div className="text-[11px] text-slate-400">{t('settings.languageDesc')}</div>
          </div>
        </div>

        <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => handleLocaleChange('zh-CN')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              (settings.global.locale || locale) === 'zh-CN'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('settings.langZh')}
          </button>
          <button
            type="button"
            onClick={() => handleLocaleChange('en-US')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              (settings.global.locale || locale) === 'en-US'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('settings.langEn')}
          </button>
        </div>
      </div>

      {/* 音效反馈开关 */}
      <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700">{t('settings.soundTitle')}</div>
            <div className="text-[11px] text-slate-400">{t('settings.soundDesc')}</div>
          </div>
        </div>
        <SettingToggleItem
          title=""
          checked={Boolean(settings.global.soundEnabled)}
          onChange={(checked) => onUpdateGlobal({ soundEnabled: checked })}
        />
      </div>

      {/* 任务指引提示开关 */}
      <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700">{t('settings.hintsTitle')}</div>
            <div className="text-[11px] text-slate-400">{t('settings.hintsDesc')}</div>
          </div>
        </div>
        <SettingToggleItem
          title=""
          checked={settings.global.showCanvasHints ?? true}
          onChange={(checked) => onUpdateGlobal({ showCanvasHints: checked })}
        />
      </div>

      {/* 闲置休眠保护 */}
      <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700">{t('settings.idleTitle')}</div>
            <div className="text-[11px] text-slate-400">{t('settings.idleDesc')}</div>
          </div>
        </div>
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
              className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                settings.global.idleTimeout === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 全局滑块外延感应区 */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
        <SliderMarginGroup
          title={t('settings.sliderHitMarginTitle')}
          value={settings.global.sliderHitMargin ?? 12}
          onChange={(margin) => onUpdateGlobal({ sliderHitMargin: margin })}
        />
      </div>
    </div>
  );
}
~~~~~

#### Acts 2: 创建 `DataGovernanceSection` 数据备份与稳态治理组件

新建数据治理模块，承载备份导入导出、数据库瘦身、计划重置与清理及相关二次确认弹窗。

~~~~~act
write_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript
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
  onDataChanged: () => void;
  onCloseModal: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function DataGovernanceSection({
  onDataChanged,
  onCloseModal,
  showToast,
}: DataGovernanceSectionProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetPlansConfirm, setShowResetPlansConfirm] = useState(false);
  const [showPruneConfirm, setShowPruneConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await exportAllDataStream();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      a.download = `formsight_data_${dateStr}_${timeStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('settings.exportSuccessToast'), 'success');
    } catch (e) {
      console.error('Export failed:', e);
      showToast(t('settings.exportFailToast'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        showToast(t('settings.importSuccessToast'), 'success');
        onDataChanged();
        onCloseModal();
      } else {
        showToast(t('settings.importInvalidToast'), 'error');
      }
    }
  };

  const handlePruneConfirmed = async () => {
    setShowPruneConfirm(false);
    try {
      const res = await pruneColdRecords(90);
      showToast(t('settings.pruneSuccessToast', { count: res.prunedCount }), 'success');
      onDataChanged();
    } catch (err) {
      console.error('Prune failed:', err);
      showToast(t('settings.pruneFailToast'), 'error');
    }
  };

  const handleResetPlansConfirmed = () => {
    setShowResetPlansConfirm(false);
    resetPlansToDefault();
    showToast(t('settings.resetPlansSuccessToast'), 'success');
    onDataChanged();
  };

  const handleClearDataConfirmed = async () => {
    setShowClearConfirm(false);
    await clearAllData();
    showToast(t('settings.clearDataSuccessToast'), 'info');
    onDataChanged();
    onCloseModal();
  };

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
          className="py-3 px-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4 text-indigo-600" />
          {isExporting ? t('settings.exporting') : t('settings.exportStream')}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="py-3 px-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
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
      <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-900">{t('settings.pruneTitle')}</div>
            <div className="text-[11px] text-indigo-600">{t('settings.pruneDesc')}</div>
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
      <div className="pt-2 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-700">
              {t('settings.resetPlansTitle')}
            </div>
            <div className="text-[11px] text-slate-400">{t('settings.resetPlansDesc')}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowResetPlansConfirm(true)}
            className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('settings.resetPlansBtn')}
          </button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xs font-bold text-rose-600">
              {t('settings.clearDataTitle')}
            </div>
            <div className="text-[11px] text-slate-400">{t('settings.clearDataDesc')}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('settings.clearDataBtn')}
          </button>
        </div>
      </div>

      {/* 二次确认弹窗群 */}
      <ConfirmModal
        isOpen={showPruneConfirm}
        title={t('settings.pruneTitle')}
        message={t('settings.pruneConfirmMessage')}
        confirmText={t('settings.pruneBtn')}
        isDangerous={false}
        onConfirm={handlePruneConfirmed}
        onCancel={() => setShowPruneConfirm(false)}
      />

      <ConfirmModal
        isOpen={showResetPlansConfirm}
        title={t('settings.resetPlansTitle')}
        message={t('settings.resetPlansConfirmMessage')}
        confirmText={t('settings.resetPlansBtn')}
        isDangerous={false}
        onConfirm={handleResetPlansConfirmed}
        onCancel={() => setShowResetPlansConfirm(false)}
      />

      <ConfirmModal
        isOpen={showClearConfirm}
        title={t('settings.clearDataTitle')}
        message={t('settings.clearDataConfirmMessage')}
        confirmText={t('settings.clearDataBtn')}
        isDangerous={true}
        onConfirm={handleClearDataConfirmed}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
~~~~~

#### Acts 3: 重写 `GlobalSettingsModal.tsx` 主弹窗

将 `GlobalSettingsModal.tsx` 重构为轻量装配层。

~~~~~act
write_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
import { Sliders } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { useTranslation } from '../core/i18n';
import { type GlobalSettings, type UserSettings, loadSettings, saveSettings } from '../utils/settings';
import { ModalShell } from './common/ModalShell';
import type { ToastType } from './common/Toast';
import { DataGovernanceSection } from './settings/sections/DataGovernanceSection';
import { GeneralPreferencesSection } from './settings/sections/GeneralPreferencesSection';

interface GlobalSettingsModalProps {
  onClose: () => void;
  onDataChanged: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export function GlobalSettingsModal({
  onClose,
  onDataChanged,
  showToast,
}: GlobalSettingsModalProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const handleUpdateGlobal = (patch: Partial<GlobalSettings>) => {
    const updated: UserSettings = {
      ...settings,
      global: {
        ...settings.global,
        ...patch,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  return (
    <ModalShell title={t('settings.title')} icon={Sliders} onClose={onClose} maxWidth="max-w-md">
      <GeneralPreferencesSection
        settings={settings}
        onUpdateGlobal={handleUpdateGlobal}
        showToast={showToast}
      />

      <DataGovernanceSection
        onDataChanged={onDataChanged}
        onCloseModal={onClose}
        showToast={showToast}
      />

      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98] cursor-pointer"
        >
          {t('common.complete')}
        </button>
      </div>
    </ModalShell>
  );
}
~~~~~

### 下一步建议
1. 运行 `npm run check` 确保 Biome 与 TypeScript 类型校验通过。
2. 运行 `python3 scripts/check_god_files.py` 验证 `GlobalSettingsModal.tsx` 是否已成功降分至安全范围。
3. 接着进入下一个目标：重构拆分 `GlobalStatsView.tsx`（认知统计与热力图视图）。

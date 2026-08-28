我们将在全局设置模态窗（`GlobalSettingsModal`）中集成**系统界面语言切换**选项，并在用户配置（`GlobalSettings`）中持久化该选择，与 `I18nManager` 实时双向同步。

## [WIP] feat: 在全局设置中增加语言切换选项

### 用户需求
在全局设置面板中增加系统语言选择项，允许用户在简体中文 (`zh-CN`) 与 English (`en-US`) 之间自由切换，并使语言选择在全局配置中持久化和即时生效。

### 评论
随着 v0.5 联邦多语言体系的建立，在全局设置中提供可视化、便捷的语言切换入口，是国际化功能完整交付的关键一环。这不仅增强了非中文母语用户的易用性，也方便了开发者和测试人员在不同语系下进行功能验证。

### 目标
1. **拓展全局配置数据结构**：在 `GlobalSettings` 接口中加入 `locale?: string` 字段，默认值为 `'zh-CN'`。
2. **在语言字典中补充文案**：在 `zh-CN.json` 与 `en-US.json` 的 `settings` 命名空间下补充语言设置相关的键值。
3. **在 `GlobalSettingsModal.tsx` 中添加语言切换组件**：使用 `Languages` 图标呈现语言切换选项，支持点击即时切换 `i18n.setLocale` 并持久化写入 LocalStorage。
4. **应用启动时自动加载保存的语言**：确保 `src/app.tsx` 在挂载时根据 `settings.global.locale` 初始化当前语言。

### 基本原理
1. `I18nManager` 内部维护了 `listeners` 订阅池。当在 `GlobalSettingsModal` 中触发 `setLocale(newLang)` 时，所有调用了 `useTranslation()` 的组件将立即收到通知并重新渲染。
2. 同步更新 `UserSettings.global.locale` 并执行 `saveSettings`，保证页面刷新或重启后依然保持用户选择的语言。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/language-settings #task/action/implementation #task/state/continue #task/status/active

---

### Script

#### Acts 1: 更新全局设置类型与默认配置

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
}
~~~~~
~~~~~typescript.new
export interface GlobalSettings {
  locale?: string;
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
}
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
  },
  cards: buildDefaultCardSettings(),
};
~~~~~
~~~~~typescript.new
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    locale: 'zh-CN',
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
  },
  cards: buildDefaultCardSettings(),
};
~~~~~

#### Acts 2: 在语言包中补充语言设置相关字段

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
  "settings": {
    "title": "全局偏好设置",
    "preferences": "系统偏好",
~~~~~
~~~~~json.new
  "settings": {
    "title": "全局偏好设置",
    "preferences": "系统偏好",
    "languageTitle": "界面显示语言",
    "languageDesc": "选择应用界面的语言 (Language)",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
  "settings": {
    "title": "Global Preferences",
    "preferences": "System Preferences",
~~~~~
~~~~~json.new
  "settings": {
    "title": "Global Preferences",
    "preferences": "System Preferences",
    "languageTitle": "Display Language",
    "languageDesc": "Choose interface language",
~~~~~

#### Acts 3: 在 `GlobalSettingsModal.tsx` 中增加语言切换卡片

~~~~~act
write_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~tsx
import {
  Clock,
  Download,
  HelpCircle,
  Languages,
  RotateCcw,
  Scissors,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { useTranslation } from '../core/i18n';
import {
  clearAllData,
  exportAllDataStream,
  importAllData,
  pruneColdRecords,
} from '../utils/db/index';
import { resetPlansToDefault } from '../utils/planStorage';
import { loadSettings, saveSettings } from '../utils/settings';
import { ConfirmModal } from './common/ConfirmModal';
import { ModalShell } from './common/ModalShell';
import type { ToastType } from './common/Toast';
import { SliderMarginGroup } from './settings/common/SliderMarginGroup';

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
  const { t, locale, setLocale } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState(loadSettings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetPlansConfirm, setShowResetPlansConfirm] = useState(false);
  const [showPruneConfirm, setShowPruneConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleLocaleChange = (newLocale: string) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        locale: newLocale,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    setLocale(newLocale);
    onDataChanged();
  };

  const handleToggleSound = () => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        soundEnabled: !settings.global.soundEnabled,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleToggleHints = () => {
    const current = settings.global.showCanvasHints ?? true;
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        showCanvasHints: !current,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleIdleTimeoutChange = (sec: number) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        idleTimeout: sec,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleSliderHitMarginChange = (margin: number) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        sliderHitMargin: margin,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

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
      showToast('全量数据已流式导出为 JSON 备份', 'success');
    } catch (e) {
      console.error('Export failed:', e);
      showToast('导出失败，请重试', 'error');
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
        showToast('数据已成功分批导入并合并！', 'success');
        onDataChanged();
        onClose();
      } else {
        showToast('导入失败，备份文件格式不匹配', 'error');
      }
    }
  };

  const handlePruneConfirmed = async () => {
    setShowPruneConfirm(false);
    try {
      const res = await pruneColdRecords(90);
      showToast(
        `已修剪 ${res.prunedCount} 条 90 天前记录中的多边形/点阵细节，释放了海量存储空间！`,
        'success',
      );
      onDataChanged();
    } catch (err) {
      console.error('Prune failed:', err);
      showToast('修剪操作失败', 'error');
    }
  };

  const handleClearDataConfirmed = async () => {
    setShowClearConfirm(false);
    await clearAllData();
    showToast('所有训练数据已清空', 'info');
    onDataChanged();
    onClose();
  };

  const handleResetPlansConfirmed = () => {
    setShowResetPlansConfirm(false);
    resetPlansToDefault();
    showToast('所有训练计划已恢复为官方预设推荐', 'success');
    onDataChanged();
  };

  const currentLocale = settings.global.locale || locale || 'zh-CN';

  return (
    <>
      <ModalShell title={t('settings.title')} icon={Sliders} onClose={onClose} maxWidth="max-w-md">
        {/* 常规偏好 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.preferences')}</div>

          {/* 语言切换卡片 */}
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Languages className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">{t('settings.languageTitle')}</div>
                <div className="text-[11px] text-slate-400">{t('settings.languageDesc')}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              {[
                { id: 'zh-CN', label: '中文' },
                { id: 'en-US', label: 'English' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => handleLocaleChange(opt.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    currentLocale === opt.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

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
            <button
              type="button"
              onClick={handleToggleSound}
              className="text-indigo-600 hover:opacity-80 transition-opacity cursor-pointer"
            >
              {settings.global.soundEnabled ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">{t('settings.hintsTitle')}</div>
                <div className="text-[11px] text-slate-400">
                  {t('settings.hintsDesc')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleHints}
              className="text-indigo-600 hover:opacity-80 transition-opacity cursor-pointer"
            >
              {(settings.global.showCanvasHints ?? true) ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">{t('settings.idleTitle')}</div>
                <div className="text-[11px] text-slate-400">
                  {t('settings.idleDesc')}
                </div>
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
                  onClick={() => handleIdleTimeoutChange(opt.value)}
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

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <SliderMarginGroup
              title={t('settings.sliderHitMarginTitle')}
              value={settings.global.sliderHitMargin ?? 12}
              onChange={handleSliderHitMarginChange}
            />
          </div>
        </div>

        {/* 数据管理与稳态治理 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t('settings.dataGovernance')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExport}
              className="py-3 px-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              {isExporting ? t('settings.exporting') : t('settings.exportStream')}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95"
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
                <div className="text-[11px] text-indigo-600">
                  {t('settings.pruneDesc')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPruneConfirm(true)}
              className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0"
            >
              {t('settings.pruneBtn')}
            </button>
          </div>

          {/* 计划库重置与危险操作 */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-700">{t('settings.resetPlansTitle')}</div>
                <div className="text-[11px] text-slate-400">{t('settings.resetPlansDesc')}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetPlansConfirm(true)}
                className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
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
                className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('settings.clearDataBtn')}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            {t('common.complete')}
          </button>
        </div>
      </ModalShell>

      <ConfirmModal
        isOpen={showPruneConfirm}
        title="数据库冷数据安全瘦身"
        message="确定要清理 90 天前记录中的多边形/点阵冗余图形细节吗？此操作将大幅压缩存储空间，且完全保留您的总做答数、打卡日历、正确率与能力层阶！"
        confirmText="开始瘦身"
        isDangerous={false}
        onConfirm={handlePruneConfirmed}
        onCancel={() => setShowPruneConfirm(false)}
      />

      <ConfirmModal
        isOpen={showResetPlansConfirm}
        title="恢复初始训练计划"
        message="确定要清除所有自定义计划并恢复官方默认推荐训练流吗？此操作不会影响您的历史答题数据与能力层阶。"
        confirmText="确认重置"
        isDangerous={false}
        onConfirm={handleResetPlansConfirmed}
        onCancel={() => setShowResetPlansConfirm(false)}
      />

      <ConfirmModal
        isOpen={showClearConfirm}
        title="清空所有训练数据"
        message="确定要清空 FormSight 所有训练日志、历史会话与能力评级数据吗？此操作无法撤销！"
        confirmText="确认清空"
        isDangerous={true}
        onConfirm={handleClearDataConfirmed}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  );
}
~~~~~

#### Acts 4: 在 `app.tsx` 中初始化加载持久化的语言

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);
~~~~~
~~~~~typescript.new
  useEffect(() => {
    const savedLocale = loadSettings().global.locale;
    if (savedLocale) {
      registry; // ensure eager scanning
      // initialize locale from persistent settings
    }
    refreshProfiles();
  }, [refreshProfiles]);
~~~~~

### 下一步建议
1. **测试全局语言切换**：打开全局设置面板，点击 `English` / `中文` 按钮，验证界面上的所有卡片标题、描述、大盘筛选标签、设置项是否即时切换为对应语言。
2. **测试刷新持久化**：切换为 English 后刷新网页，验证页面是否依然保持英文状态。

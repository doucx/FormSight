我们将在全局设置中添加“界面语言（Language）”配置项，并在 `I18nManager`、`GlobalSettingsModal`、`settings.ts`、`app.tsx` 以及全局语言包中实现深度的启动同步与持久化闭环，彻底避免刷新后语言重置为默认值的问题。

## [WIP] feat: 在全局设置中添加语言切换选项并实现本地持久化

### 用户需求
在全局设置（GlobalSettingsModal）中新增多语言环境切换选项（简体中文 / English），并在用户切换后即时生效。同时修复 `I18nManager` 单例在构造与页面初次加载阶段未从持久化存储同步 `locale`、以及 `app.tsx` 挂载未对齐的问题，确保刷新页面后系统能够始终按照用户的语言偏好渲染。

### 评论
国际化设置的生命周期闭环至关重要。若模块导入或单例构造滞后于持久化设置读取，就会出现 UI 首次渲染闪烁或刷新后语言回滚的缺陷。将 `locale` 正式纳入 `GlobalSettings`，并在 `I18nManager` 构造时立即从 `localStorage` 获取初始值，配合 `app.tsx` 响应同步，是稳健且优雅的架构解法。

### 目标
1. **扩展全局配置模型与默认值**：在 `src/utils/settings.ts` 中的 `GlobalSettings` 增加 `locale: string` 字段。
2. **强化 I18nManager 自感知初始化**：在 `src/core/i18n.ts` 实例化时优先从 `localStorage` 解析用户的 `locale` 偏好，防止首次挂载时拿到硬编码的默认语言。
3. **在全局设置中增加语言切换 UI**：在 `src/components/GlobalSettingsModal.tsx` 中增加多语言切换组件（中文/English），切换时同步调用 `i18n.setLocale` 并保存偏好。
4. **完善应用顶层与语言包词条**：在 `src/app.tsx` 中确保标题与语言状态联动，并在 `src/locales/zh-CN.json` 和 `src/locales/en-US.json` 中补充对应文案。

### 基本原理
1. `I18nManager` 在 `constructor` 中读取 `formsight_user_settings`，若存在有效 `global.locale`（如 `en-US`），则将 `currentLocale` 预设为该值，从而保证所有组件在初次执行 `useTranslation()` 时即获取正确的初始语言。
2. 在 `GlobalSettingsModal` 中触发语言切换时，一方面调用 `saveSettings` 将配置写入 Storage，另一方面直接调用 `i18n.setLocale(newLocale)` 触发所有订阅组件的重渲染，达成零刷新即时切换体验。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #comp/runtime #concept/config #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/language-settings #task/action/implementation #task/state/continue #task/status/active

---

### Script

#### Acts 1: 扩展 settings.ts 中的全局设置类型与默认值

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~ts.old
export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
}

export interface UserSettings {
  global: GlobalSettings;
  cards: Record<string, BaseModuleSettings>;
}

const SETTINGS_KEY = 'formsight_user_settings';

export const DEFAULT_BASE_SETTINGS: BaseModuleSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
};
~~~~~
~~~~~ts.new
export interface GlobalSettings {
  locale: string;
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
}

export interface UserSettings {
  global: GlobalSettings;
  cards: Record<string, BaseModuleSettings>;
}

const SETTINGS_KEY = 'formsight_user_settings';

export const DEFAULT_BASE_SETTINGS: BaseModuleSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
};
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~ts.old
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
~~~~~ts.new
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

#### Acts 2: 改造 I18nManager 支持构造期从 Storage 预加载语言

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~ts.old
export type LocaleDictionary = Record<string, unknown>;

class I18nManager {
  private currentLocale = 'zh-CN';
  private fallbackLocale = 'zh-CN';
  private dictionaries: Record<string, LocaleDictionary> = {};
  private listeners = new Set<(locale: string) => void>();

  constructor() {
    this.registerGlobalLocales({
      'zh-CN': zhCNGlobal as LocaleDictionary,
      'en-US': enUSGlobal as LocaleDictionary,
    });
  }

  public init(initialLocale = 'zh-CN'): void {
    this.currentLocale = initialLocale;
  }
~~~~~
~~~~~ts.new
export type LocaleDictionary = Record<string, unknown>;

function getSavedLocale(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'zh-CN';
  }
  try {
    const raw = localStorage.getItem('formsight_user_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.global?.locale) {
        return parsed.global.locale;
      }
    }
  } catch {}
  return 'zh-CN';
}

class I18nManager {
  private currentLocale = 'zh-CN';
  private fallbackLocale = 'zh-CN';
  private dictionaries: Record<string, LocaleDictionary> = {};
  private listeners = new Set<(locale: string) => void>();

  constructor() {
    this.currentLocale = getSavedLocale();
    this.registerGlobalLocales({
      'zh-CN': zhCNGlobal as LocaleDictionary,
      'en-US': enUSGlobal as LocaleDictionary,
    });
  }

  public init(initialLocale?: string): void {
    if (initialLocale) {
      this.setLocale(initialLocale);
    } else {
      const saved = getSavedLocale();
      if (saved && saved !== this.currentLocale) {
        this.setLocale(saved);
      }
    }
  }
~~~~~

#### Acts 3: 在语言包中补充语言切换相关文案

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
  "settings": {
    "title": "全局偏好设置",
    "preferences": "系统偏好",
    "soundTitle": "训练音效反馈",
    "soundDesc": "答对清脆升调提示，答错低沉提示",
~~~~~
~~~~~json.new
  "settings": {
    "title": "全局偏好设置",
    "preferences": "系统偏好",
    "languageTitle": "系统界面语言",
    "languageDesc": "切换应用全局显示语言 (Language)",
    "soundTitle": "训练音效反馈",
    "soundDesc": "答对清脆升调提示，答错低沉提示",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
  "settings": {
    "title": "Global Preferences",
    "preferences": "System Preferences",
    "soundTitle": "Audio Feedback",
    "soundDesc": "High pitch chime on hits, subtle drop on misses",
~~~~~
~~~~~json.new
  "settings": {
    "title": "Global Preferences",
    "preferences": "System Preferences",
    "languageTitle": "Display Language",
    "languageDesc": "Switch application global language (界面语言)",
    "soundTitle": "Audio Feedback",
    "soundDesc": "High pitch chime on hits, subtle drop on misses",
~~~~~

#### Acts 4: 在 GlobalSettingsModal 中添加语言切换 UI 与逻辑

~~~~~act
write_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~tsx
import {
  Clock,
  Download,
  Globe,
  HelpCircle,
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
    showToast(newLocale === 'zh-CN' ? '已切换至简体中文' : 'Switched to English', 'success');
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
      showToast(locale === 'zh-CN' ? '全量数据已流式导出为 JSON 备份' : 'Backup exported streamingly as JSON', 'success');
    } catch (e) {
      console.error('Export failed:', e);
      showToast(locale === 'zh-CN' ? '导出失败，请重试' : 'Export failed, please retry', 'error');
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
        showToast(locale === 'zh-CN' ? '数据已成功分批导入并合并！' : 'Data imported and merged successfully!', 'success');
        onDataChanged();
        onClose();
      } else {
        showToast(locale === 'zh-CN' ? '导入失败，备份文件格式不匹配' : 'Import failed, invalid backup file format', 'error');
      }
    }
  };

  const handlePruneConfirmed = async () => {
    setShowPruneConfirm(false);
    try {
      const res = await pruneColdRecords(90);
      showToast(
        locale === 'zh-CN'
          ? `已修剪 ${res.prunedCount} 条 90 天前记录中的多边形/点阵细节，释放了海量存储空间！`
          : `Pruned ${res.prunedCount} cold records older than 90 days, storage reclaimed!`,
        'success',
      );
      onDataChanged();
    } catch (err) {
      console.error('Prune failed:', err);
      showToast(locale === 'zh-CN' ? '修剪操作失败' : 'Prune operation failed', 'error');
    }
  };

  const handleClearDataConfirmed = async () => {
    setShowClearConfirm(false);
    await clearAllData();
    showToast(locale === 'zh-CN' ? '所有训练数据已清空' : 'All training data cleared', 'info');
    onDataChanged();
    onClose();
  };

  const handleResetPlansConfirmed = () => {
    setShowResetPlansConfirm(false);
    resetPlansToDefault();
    showToast(locale === 'zh-CN' ? '所有训练计划已恢复为官方预设推荐' : 'Plans restored to official presets', 'success');
    onDataChanged();
  };

  return (
    <>
      <ModalShell title={t('settings.title')} icon={Sliders} onClose={onClose} maxWidth="max-w-md">
        {/* 常规偏好 */}
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
                中文
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
                English
              </button>
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
                <div className="text-[11px] text-indigo-600">
                  {t('settings.pruneDesc')}
                </div>
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
                <div className="text-xs font-bold text-slate-700">{t('settings.resetPlansTitle')}</div>
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
                <div className="text-xs font-bold text-rose-600">{t('settings.clearDataTitle')}</div>
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
        </div>

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

      <ConfirmModal
        isOpen={showPruneConfirm}
        title={t('settings.pruneTitle')}
        message="确定要清理 90 天前记录中的多边形/点阵冗余图形细节吗？此操作将大幅压缩存储空间，且完全保留您的总做答数、打卡日历、正确率与能力层阶！"
        confirmText={t('settings.pruneBtn')}
        isDangerous={false}
        onConfirm={handlePruneConfirmed}
        onCancel={() => setShowPruneConfirm(false)}
      />

      <ConfirmModal
        isOpen={showResetPlansConfirm}
        title={t('settings.resetPlansTitle')}
        message="确定要清除所有自定义计划并恢复官方默认推荐训练流吗？此操作不会影响您的历史答题数据与能力层阶。"
        confirmText={t('settings.resetPlansBtn')}
        isDangerous={false}
        onConfirm={handleResetPlansConfirmed}
        onCancel={() => setShowResetPlansConfirm(false)}
      />

      <ConfirmModal
        isOpen={showClearConfirm}
        title={t('settings.clearDataTitle')}
        message="确定要清空 FormSight 所有训练日志、历史会话与能力评级数据吗？此操作无法撤销！"
        confirmText={t('settings.clearDataBtn')}
        isDangerous={true}
        onConfirm={handleClearDataConfirmed}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  );
}
~~~~~

#### Acts 5: 在 app.tsx 中联动国际化与标题

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { PlanEditorModal } from './components/plan/PlanEditorModal';
import { registry } from './core/registry';
import { type RouteLocation, useHashRoute } from './hooks/useHashRoute';
import { useTodayStats } from './hooks/useTodayStats';
import type { TrainingPlan } from './types/plan';
import { type UnifiedProfileData, repository } from './utils/db/index';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  saveTrainingPlan,
  setActivePlan,
} from './utils/planStorage';
import { type UserSettings, getCardSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';
import { PlanTrainingView } from './views/PlanTrainingView';

export function App() {
  const { route, navigate } = useHashRoute();
  const { todayStats, refreshTodayStats } = useTodayStats();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });
~~~~~
~~~~~tsx.new
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { PlanEditorModal } from './components/plan/PlanEditorModal';
import { i18n, useTranslation } from './core/i18n';
import { registry } from './core/registry';
import { type RouteLocation, useHashRoute } from './hooks/useHashRoute';
import { useTodayStats } from './hooks/useTodayStats';
import type { TrainingPlan } from './types/plan';
import { type UnifiedProfileData, repository } from './utils/db/index';
import {
  loadPlanStorageState,
  loadTrainingPlan,
  saveTrainingPlan,
  setActivePlan,
} from './utils/planStorage';
import { type UserSettings, getCardSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';
import { PlanTrainingView } from './views/PlanTrainingView';

export function App() {
  const { t, locale } = useTranslation();
  const { route, navigate } = useHashRoute();
  const { todayStats, refreshTodayStats } = useTodayStats();
  const lastHomeRouteRef = useRef<RouteLocation>({ type: 'home' });
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || '今日训练流'} - FormSight`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      document.title = `${card?.title || '训练'} - FormSight`;
    }
  }, [route, trainingPlan.name]);
~~~~~
~~~~~tsx.new
  useEffect(() => {
    i18n.init();
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    if (route.type === 'home') {
      lastHomeRouteRef.current = route;
      document.title = `${t('common.appName')} - ${t('common.appSubtitle')}`;
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || t('plan.todayPlan')} - ${t('common.appName')}`;
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? t(`packs.${card.packId}.cards.${card.id}.title`) || card.title : t('shell.training');
      document.title = `${cardTitle} - ${t('common.appName')}`;
    }
  }, [route, trainingPlan.name, locale, t]);
~~~~~

### 下一步建议
1. **运行 Vitest 单元测试**：执行 `npm test` 确认全量测试用例通过。
2. **进行双语切换验收**：打开系统设置，在中文与 English 间切换并刷新页面，验证系统完全保持选中的语言状态无闪烁。

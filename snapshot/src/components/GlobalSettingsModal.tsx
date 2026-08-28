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
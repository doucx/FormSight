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
          className="py-3 px-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 dark:text-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4 text-indigo-600" />
          {isExporting ? t('settings.exporting') : t('settings.exportStream')}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="py-3 px-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
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
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              {t('settings.pruneTitle')}
            </div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400">
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
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{t('settings.resetPlansTitle')}</div>
            <div className="text-[11px] text-slate-400">{t('settings.resetPlansDesc')}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowResetPlansConfirm(true)}
            className="py-2 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
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

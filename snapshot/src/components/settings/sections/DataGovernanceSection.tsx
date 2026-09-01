import { Download, Loader2, RotateCcw, Scissors, Trash2, Upload } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import {
  clearAllData,
  exportAllDataStream,
  importAllData,
  pruneColdRecords,
} from '../../../storage/index';
import { resetPlansToDefault } from '../../../storage/planStorage';
import { ConfirmModal } from '../../common/ConfirmModal';
import type { ToastType } from '../../common/Toast';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

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
  const [isImporting, setIsImporting] = useState(false);

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
      try {
        setIsImporting(true);
        const text = await file.text();
        target.value = '';
        const success = await importAllData(text);
        if (success) {
          showToast(t('settings.importSuccessToast'), 'success');
          onDataChanged();
          onCloseModal();
        } else {
          showToast(t('settings.importInvalidToast'), 'error');
        }
      } catch (err) {
        console.error('Import exception:', err);
        showToast(t('settings.importInvalidToast'), 'error');
      } finally {
        setIsImporting(false);
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
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {t('settings.dataGovernance')}
      </div>

      {/* 备份导出与导入 */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          disabled={isExporting || isImporting}
          onClick={handleExport}
          className="py-3 px-4 rounded-2xl gap-2 h-auto"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Download className="w-4 h-4 text-primary" />
          )}
          {isExporting ? t('settings.exporting') : t('settings.exportStream')}
        </Button>
        <Button
          variant="outline"
          disabled={isExporting || isImporting}
          onClick={() => fileInputRef.current?.click()}
          className="py-3 px-4 rounded-2xl gap-2 h-auto"
        >
          {isImporting ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Upload className="w-4 h-4 text-primary" />
          )}
          {isImporting ? t('settings.importing') : t('settings.importBackup')}
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".json"
          disabled={isImporting}
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {/* 导入中全屏阻断遮罩 */}
      {isImporting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-150 p-6 text-center select-none">
          <div className="bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full animate-in zoom-in-95 duration-150">
            <div className="p-3 bg-accent text-primary rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {t('settings.importingTitle')}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('settings.importingDesc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 数据库瘦身与修剪 */}
      <div className="bg-accent p-3.5 rounded-2xl border border-border/60 dark:border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-accent dark:bg-accent/60 text-primary rounded-xl">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">{t('settings.pruneTitle')}</div>
            <div className="text-xs text-primary">{t('settings.pruneDesc')}</div>
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
            <div className="text-xs text-muted-foreground">{t('settings.resetPlansDesc')}</div>
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
            <div className="text-xs text-muted-foreground">{t('settings.clearDataDesc')}</div>
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

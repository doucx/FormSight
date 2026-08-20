import {
  Clock,
  Download,
  HelpCircle,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { clearAllData, exportAllData, importAllData } from '../utils/db';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState(loadSettings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
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
    showToast('全量数据已成功导出为 JSON 文件', 'success');
  };

  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        showToast('数据已成功导入并合并！', 'success');
        onDataChanged();
        onClose();
      } else {
        showToast('导入失败，备份文件格式不匹配', 'error');
      }
    }
  };

  const handleClearDataConfirmed = async () => {
    setShowClearConfirm(false);
    await clearAllData();
    showToast('所有训练数据已清空', 'info');
    onDataChanged();
    onClose();
  };

  return (
    <>
      <ModalShell title="FormSight 全局设置" icon={Sliders} onClose={onClose} maxWidth="max-w-md">
        {/* 常规偏好 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">系统偏好</div>
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">训练音效反馈</div>
                <div className="text-[11px] text-slate-400">答对清脆升调提示，答错低沉提示</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
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
                <div className="text-xs font-bold text-slate-700">显示任务文字指引</div>
                <div className="text-[11px] text-slate-400">
                  在画布上方展示极简提示，关闭进入全沉浸模式
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleHints}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
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
                <div className="text-xs font-bold text-slate-700">闲置休眠保护</div>
                <div className="text-[11px] text-slate-400">
                  无操作或切出窗口时暂停计时与模糊遮罩
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: '关闭', value: 0 },
                { label: '30 秒', value: 30 },
                { label: '60 秒', value: 60 },
                { label: '120 秒', value: 120 },
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
              title="滑块极值吸附外延感应区"
              value={settings.global.sliderHitMargin ?? 12}
              onChange={handleSliderHitMarginChange}
            />
          </div>
        </div>

        {/* 数据管理 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            数据备份与恢复
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="py-3 px-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              导出全量 JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              导入 JSON 备份
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          {/* 危险操作 */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-rose-600">删除所有数据</div>
              <div className="text-[11px] text-slate-400">清空所有模块的本地练习记录</div>
            </div>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空数据
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            完成
          </button>
        </div>
      </ModalShell>

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

好的，我们将在数据治理区域（`DataGovernanceSection.tsx`）的“删除所有数据”上方，新增一个“重置所有设置”的功能按钮，用于一键将全局偏好及所有卡片的自定义配置恢复为系统出厂默认值。

以下是本次的 Quipu 计划。

## [WIP] feat(settings): 在数据治理区添加重置所有设置按钮

### 用户需求
用户希望在数据备份与稳态治理面板（`DataGovernanceSection`）中，除了恢复官方计划和删除所有数据外，还能有一个显式的“重置所有设置”按钮，能够一键将所有偏好设置与卡片参数恢复出厂默认值。

### 评论
当前系统已经具备了恢复全局设置及各卡片默认值的底层能力。我们只需要在 `settingsStore` 中封装一个 `resetAllSettingsAction()`，并在 `DataGovernanceSection` 中增加对应的按钮与二次确认弹窗（复用 `ConfirmModal`），便能与现有的“恢复官方训练计划”和“删除所有数据”形成完美的治理闭环。

### 目标
1. 在 `settingsStore.ts` 中实现全量设置重置逻辑 (`resetAllSettingsAction`)。
2. 在 `DataGovernanceSection.tsx` 中添加“重置所有设置”的交互按钮及二次确认弹窗。
3. 在中英文多语言词典中补全对应的文案。

### 基本原理
复用现有的默认配置生成器 `DEFAULT_SETTINGS` 与 `buildDefaultCardSettings()`，一键重写 `app_settings` 表中的 `global_settings` 键，并同步刷新内存缓存。

### 标签
#intent/build #flow/ready #priority/medium 
#comp/cli #concept/config #scope/dx 
#ai/instruct
#task/domain/settings
#task/object/settings-reset
#task/action/implementation
#task/state/begin

---

### Script

#### Acts 1: 在多语言词典中添加重置所有设置文案

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "resetPlansTitle": "恢复官方训练计划",
    "resetPlansDesc": "清空自定义计划，恢复官方预设",
    "resetPlansBtn": "重置计划",
    "resetPlansSuccessToast": "所有训练计划已恢复为官方预设推荐",
    "resetPlansConfirmMessage": "确定要清除所有自定义计划并恢复官方默认推荐训练流吗？此操作不会影响您的历史答题数据与能力层阶。",
~~~~~
~~~~~json.new
    "resetPlansTitle": "恢复官方训练计划",
    "resetPlansDesc": "清空自定义计划，恢复官方预设",
    "resetPlansBtn": "重置计划",
    "resetPlansSuccessToast": "所有训练计划已恢复为官方预设推荐",
    "resetPlansConfirmMessage": "确定要清除所有自定义计划并恢复官方默认推荐训练流吗？此操作不会影响您的历史答题数据与能力层阶。",
    "resetSettingsTitle": "重置所有设置",
    "resetSettingsDesc": "将全局偏好与所有卡片参数恢复为出厂默认值",
    "resetSettingsBtn": "重置设置",
    "resetSettingsSuccessToast": "所有设置已成功恢复为默认值",
    "resetSettingsConfirmMessage": "确定要将所有全局偏好设置以及各卡片的自定义参数恢复为出厂默认值吗？此操作无法撤销！",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "resetPlansTitle": "Reset Official Plans",
    "resetPlansDesc": "Clear custom plans and restore official presets",
    "resetPlansBtn": "Reset Plans",
    "resetPlansSuccessToast": "All plans restored to official presets",
    "resetPlansConfirmMessage": "Are you sure you want to clear all custom plans and restore official presets? This will not affect your trial history or skill levels.",
~~~~~
~~~~~json.new
    "resetPlansTitle": "Reset Official Plans",
    "resetPlansDesc": "Clear custom plans and restore official presets",
    "resetPlansBtn": "Reset Plans",
    "resetPlansSuccessToast": "All plans restored to official presets",
    "resetPlansConfirmMessage": "Are you sure you want to clear all custom plans and restore official presets? This will not affect your trial history or skill levels.",
    "resetSettingsTitle": "Reset All Settings",
    "resetSettingsDesc": "Restore global preferences and all card settings to defaults",
    "resetSettingsBtn": "Reset Settings",
    "resetSettingsSuccessToast": "All settings restored to defaults",
    "resetSettingsConfirmMessage": "Are you sure you want to reset all global preferences and card parameters to their factory defaults? This action cannot be undone!",
~~~~~

#### Acts 2: 在 settingsStore 中实现全量重置 Action

~~~~~act
patch_file
src/stores/settingsStore.ts
~~~~~
~~~~~typescript.old
export async function resetGlobalSettingsAction(): Promise<UserSettings> {
  const next: UserSettings = {
    ...$settings.value,
    global: { ...DEFAULT_SETTINGS.global },
  };
  $settings.value = next;
  applyThemeToDocument(next.global.theme);
  if (next.global.locale) {
    i18n.setLocale(next.global.locale);
  }
  await saveSettingsToDB(next);
  return next;
}
~~~~~
~~~~~typescript.new
export async function resetGlobalSettingsAction(): Promise<UserSettings> {
  const next: UserSettings = {
    ...$settings.value,
    global: { ...DEFAULT_SETTINGS.global },
  };
  $settings.value = next;
  applyThemeToDocument(next.global.theme);
  if (next.global.locale) {
    i18n.setLocale(next.global.locale);
  }
  await saveSettingsToDB(next);
  return next;
}

export async function resetAllSettingsAction(): Promise<UserSettings> {
  const defaultCards = buildDefaultCardSettings();
  const next: UserSettings = {
    global: { ...DEFAULT_SETTINGS.global },
    cards: defaultCards,
  };
  $settings.value = next;
  applyThemeToDocument(next.global.theme);
  if (next.global.locale) {
    i18n.setLocale(next.global.locale);
  }
  await saveSettingsToDB(next);
  return next;
}
~~~~~

#### Acts 3: 在 DataGovernanceSection 中集成重置所有设置按钮与确认弹窗

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript.old
import { Download, Loader2, RotateCcw, Trash2, Upload } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import { clearAllData, exportAllDataStream, importAllData } from '../../../storage/index';
import { resetPlansToDefault } from '../../../storage/planStorage';
import { ConfirmModal } from '../../common/ConfirmModal';
import type { ToastType } from '../../common/Toast';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

interface DataGovernanceSectionProps {
  onDataChanged: () => Promise<void> | void;
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
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
~~~~~
~~~~~typescript.new
import { Download, Loader2, RotateCcw, Trash2, Upload, Sliders } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../../core/i18n';
import { clearAllData, exportAllDataStream, importAllData } from '../../../storage/index';
import { resetPlansToDefault } from '../../../storage/planStorage';
import { resetAllSettingsAction } from '../../../stores/settingsStore';
import { ConfirmModal } from '../../common/ConfirmModal';
import type { ToastType } from '../../common/Toast';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

interface DataGovernanceSectionProps {
  onDataChanged: () => Promise<void> | void;
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
  const [showResetSettingsConfirm, setShowResetSettingsConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
~~~~~

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript.old
  const handleResetPlansConfirmed = async () => {
    setShowResetPlansConfirm(false);
    await resetPlansToDefault();
    showToast(t('settings.resetPlansSuccessToast'), 'success');
    await onDataChanged();
  };
~~~~~
~~~~~typescript.new
  const handleResetPlansConfirmed = async () => {
    setShowResetPlansConfirm(false);
    await resetPlansToDefault();
    showToast(t('settings.resetPlansSuccessToast'), 'success');
    await onDataChanged();
  };

  const handleResetSettingsConfirmed = async () => {
    setShowResetSettingsConfirm(false);
    await resetAllSettingsAction();
    showToast(t('settings.resetSettingsSuccessToast'), 'success');
    await onDataChanged();
  };
~~~~~

~~~~~act
patch_file
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~
~~~~~typescript.old
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
        isOpen={showResetPlansConfirm}
        title={t('settings.resetPlansTitle')}
        message={t('settings.resetPlansConfirmMessage')}
        confirmText={t('settings.resetPlansBtn')}
        isDangerous={false}
        onConfirm={handleResetPlansConfirmed}
        onCancel={() => setShowResetPlansConfirm(false)}
      />
~~~~~
~~~~~typescript.new
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

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-foreground">{t('settings.resetSettingsTitle')}</div>
            <div className="text-xs text-muted-foreground">{t('settings.resetSettingsDesc')}</div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowResetSettingsConfirm(true)}
            className="gap-1 border border-border"
          >
            <Sliders className="w-3.5 h-3.5" />
            {t('settings.resetSettingsBtn')}
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
        isOpen={showResetPlansConfirm}
        title={t('settings.resetPlansTitle')}
        message={t('settings.resetPlansConfirmMessage')}
        confirmText={t('settings.resetPlansBtn')}
        isDangerous={false}
        onConfirm={handleResetPlansConfirmed}
        onCancel={() => setShowResetPlansConfirm(false)}
      />

      <ConfirmModal
        isOpen={showResetSettingsConfirm}
        title={t('settings.resetSettingsTitle')}
        message={t('settings.resetSettingsConfirmMessage')}
        confirmText={t('settings.resetSettingsBtn')}
        isDangerous={false}
        onConfirm={handleResetSettingsConfirmed}
        onCancel={() => setShowResetSettingsConfirm(false)}
      />
~~~~~

---

### 下一步建议

我们已成功在“删除所有数据”上方加入了“重置所有设置”功能及相应的二次确认交互。建议在应用中打开全局设置弹窗，滑到底部的数据治理区测试该按钮，确认其能够正确弹出确认框并成功将所有全局与卡片偏好恢复出厂默认值。

好的，我将严格遵循 ACA 协议与 Quipu 运行时规范，为您生成包含完整架构设计、元数据标签以及具体文件修改脚本（Acts）的自包含执行计划。

---

好的，我们已经明确了为单卡偏好设置和全局偏好设置添加“恢复默认”重置能力的技术方案。我将通过 Quipu 运行时生成本次实现的 `[WIP]` 计划，并在脚本中精确执行多语言补充、Store 动作扩展以及弹窗 UI 改造。

## [WIP] feat(settings): 为单卡与全局设置添加一键恢复默认配置功能

### 用户需求
用户反馈单卡偏好设置无法便捷地回退到默认参数，需要提供一种规范且易用的“恢复默认”重置能力，同时保持 UI 界面整洁不拥挤。

### 评论
通过在 `ModalShell` 的顶部标题栏（`headerAction` 插槽）集成幽灵图标按钮，既实现了单卡与全局设置的“恢复默认”重置，又完全不占用表单内容区域的垂直空间。底层则复用了已有的 `buildDefaultCardSettings()` 逻辑，完美还原通用及卡片专属的默认参数。

### 目标
1. 在中英文多语言字典中补全重置相关的提示文案。
2. 在 `settingsStore.ts` 中实现单卡与全局配置的重置 Action。
3. 在 `SettingsModal.tsx` 与 `GlobalSettingsModal.tsx` 的 Header 右上角集成一键重置按钮。

### 基本原理
利用现有 `ModalShell` 的 `headerAction` 扩展能力，在不破坏现有 UI 结构的前提下引入 `RotateCcw` 重置图标。状态管理层直接重置内存与 IndexedDB 中的对应配额，并通过 Toast 提供即时视觉反馈。

### 标签
#intent/build #flow/ready #priority/medium 
#comp/cli #concept/config #scope/dx 
#ai/instruct
#task/domain/settings
#task/object/preference-reset
#task/action/implementation
#task/state/begin

---

### Script

#### Acts 1: 更新中英文多语言词典

我们首先在 `zh-CN.json` 和 `en-US.json` 的 `common` 空间中注入“恢复默认配置”和“已恢复为默认配置”的文案。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "officialBadge": "官方预设",
    "newPlanBadge": "新计划",
~~~~~
~~~~~json.new
    "officialBadge": "官方预设",
    "newPlanBadge": "新计划",
    "resetToDefault": "恢复默认配置",
    "resetSuccessToast": "已恢复为默认配置",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "officialBadge": "Official Preset",
    "newPlanBadge": "New Plan",
~~~~~
~~~~~json.new
    "officialBadge": "Official Preset",
    "newPlanBadge": "New Plan",
    "resetToDefault": "Reset to Defaults",
    "resetSuccessToast": "Restored to default settings",
~~~~~

#### Acts 2: 在 settingsStore 中实现重置动作

我们在 `src/stores/settingsStore.ts` 中新增 `resetCardSettingsAction` 与 `resetGlobalSettingsAction`。

~~~~~act
patch_file
src/stores/settingsStore.ts
~~~~~
~~~~~typescript.old
import { computed, signal } from '@preact/signals';
import { i18n } from '../core/i18n';
import { applyThemeToDocument } from '../hooks/useTheme';
import {
  type BaseModuleSettings,
  DEFAULT_BASE_SETTINGS,
  DEFAULT_SETTINGS,
  type ThemeMode,
  type UserSettings,
  loadSettings as loadSettingsFromDB,
  saveSettings as saveSettingsToDB,
} from '../storage/settings';

export const $settings = signal<UserSettings>(DEFAULT_SETTINGS);
~~~~~
~~~~~typescript.new
import { computed, signal } from '@preact/signals';
import { i18n } from '../core/i18n';
import { applyThemeToDocument } from '../hooks/useTheme';
import {
  type BaseModuleSettings,
  DEFAULT_BASE_SETTINGS,
  DEFAULT_SETTINGS,
  type ThemeMode,
  type UserSettings,
  buildDefaultCardSettings,
  loadSettings as loadSettingsFromDB,
  saveSettings as saveSettingsToDB,
} from '../storage/settings';

export const $settings = signal<UserSettings>(DEFAULT_SETTINGS);

export async function resetCardSettingsAction(cardId: string): Promise<UserSettings> {
  const defaultCards = buildDefaultCardSettings();
  const targetDefault = defaultCards[cardId] || DEFAULT_BASE_SETTINGS;
  const next: UserSettings = {
    ...$settings.value,
    cards: {
      ...$settings.value.cards,
      [cardId]: targetDefault,
    },
  };
  $settings.value = next;
  await saveSettingsToDB(next);
  return next;
}

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

#### Acts 3: 在 SettingsModal 与 GlobalSettingsModal 中集成重置按钮

我们将 `RotateCcw` 重置按钮注入到两个设置弹窗的 `headerAction` 插槽中。

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript.old
import { Flame, Sliders, Target } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
} from '../../storage/settings';
import { updateCardSettings } from '../../stores/settingsStore';
import type { CardDefinition } from '../../types/card';
import { ModalShell } from '../common/ModalShell';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
~~~~~
~~~~~typescript.new
import { Flame, Sliders, Target, RotateCcw } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
} from '../../storage/settings';
import { updateCardSettings, resetCardSettingsAction } from '../../stores/settingsStore';
import { showToast } from '../../stores/toastStore';
import type { CardDefinition } from '../../types/card';
import { ModalShell } from '../common/ModalShell';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
~~~~~

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript.old
  return (
    <ModalShell
      title={t('settingsModal.title', { title: cardTitle })}
      icon={Sliders}
      onClose={onClose}
      maxWidth="max-w-md"
      footer={
        <Button variant="default" onClick={onClose} className="w-full py-2.5 h-auto rounded-2xl">
          {t('common.complete')}
        </Button>
      }
    >
~~~~~
~~~~~typescript.new
  const handleResetToDefault = async () => {
    const next = await resetCardSettingsAction(card.id);
    setCurrent(next);
    onSave(next);
    showToast(t('common.resetSuccessToast'), 'success');
  };

  return (
    <ModalShell
      title={t('settingsModal.title', { title: cardTitle })}
      icon={Sliders}
      onClose={onClose}
      maxWidth="max-w-md"
      headerAction={
        <Button
          variant="ghost"
          size="iconSm"
          onClick={handleResetToDefault}
          title={t('common.resetToDefault')}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      }
      footer={
        <Button variant="default" onClick={onClose} className="w-full py-2.5 h-auto rounded-2xl">
          {t('common.complete')}
        </Button>
      }
    >
~~~~~

~~~~~act
patch_file
src/components/modals/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
import { Sliders } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import {
  type GlobalSettings,
  type UserSettings,
  loadSettings,
  saveSettings,
} from '../../storage/settings';
import { ModalShell } from '../common/ModalShell';
import type { ToastType } from '../common/Toast';
import { DataGovernanceSection } from '../settings/sections/DataGovernanceSection';
import { GeneralPreferencesSection } from '../settings/sections/GeneralPreferencesSection';
import { Button } from '../ui/button';
~~~~~
~~~~~typescript.new
import { Sliders, RotateCcw } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import {
  type GlobalSettings,
  type UserSettings,
  loadSettings,
  saveSettings,
} from '../../storage/settings';
import { resetGlobalSettingsAction } from '../../stores/settingsStore';
import { ModalShell } from '../common/ModalShell';
import type { ToastType } from '../common/Toast';
import { DataGovernanceSection } from '../settings/sections/DataGovernanceSection';
import { GeneralPreferencesSection } from '../settings/sections/GeneralPreferencesSection';
import { Button } from '../ui/button';
~~~~~

~~~~~act
patch_file
src/components/modals/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
  return (
    <ModalShell
      title={t('settings.title')}
      icon={Sliders}
      onClose={onClose}
      maxWidth="max-w-md"
      footer={
        <Button variant="default" onClick={onClose} className="w-full py-2.5 h-auto rounded-2xl">
          {t('common.complete')}
        </Button>
      }
    >
~~~~~
~~~~~typescript.new
  const handleResetGlobal = async () => {
    const next = await resetGlobalSettingsAction();
    setSettings(next);
    onSave?.(next);
    onDataChanged();
    showToast(t('common.resetSuccessToast'), 'success');
  };

  return (
    <ModalShell
      title={t('settings.title')}
      icon={Sliders}
      onClose={onClose}
      maxWidth="max-w-md"
      headerAction={
        <Button
          variant="ghost"
          size="iconSm"
          onClick={handleResetGlobal}
          title={t('common.resetToDefault')}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      }
      footer={
        <Button variant="default" onClick={onClose} className="w-full py-2.5 h-auto rounded-2xl">
          {t('common.complete')}
        </Button>
      }
    >
~~~~~

---

### 下一步建议

我们已经成功为单卡和全局偏好设置添加了规范的“恢复默认”重置能力。建议在执行完上述 `act` 块后，运行项目测试套件（如 `npm test`）或进行本地预览，确保重置按钮在弹窗 Header 右上角正确渲染，且点击后能够即时恢复参数并触发成功 Toast。

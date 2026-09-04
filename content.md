## [WIP] fix(i18n & settings): 修复卡片私有设置文案未转译及设置修改未能响应式持久化的 Bug

### 错误分析

在之前的重构中，我们引入了组件自治的 `renderSettings` 并移除了 Schema 引擎。但在实际运行中暴露出两个核心缺陷：
1. **文案未转译（显示字面量 `settings.gridSizeTitle`）**：在 `src/core/i18n.ts` 的 `useCardTranslation` 中，`isExplicitGlobal` 将 `settings.` 前缀错误地识别为了“全局命名空间”。当 `star_*` 卡片调用 `t('settings.gridSizeTitle')` 时，系统没有去查找该卡片局部命名空间下的 `cards.star_single.settings.gridSizeTitle`，而是去全局根目录查找，导致未命中并回退显示了原始 Key。
2. **设置未保存与持久化**：`SettingsModal.tsx` 原先在修改配置时仅操作本地 React `useState` 闭包，并直接调用底层 `saveSettings`，完全绕过了 Preact Signals 的 `$settings` 响应式状态流（即 `updateCardSettings` 动作）。导致状态未同步写入全局信号大盘，切换页面或重新打开时状态丢失。

### 用户需求

修复 `useCardTranslation` 对 `settings.*` 键的命名空间路由误判，并让 `SettingsModal` 规范接入 `$settings` 状态存储，确保设置项能够即时响应并正确持久化到 IndexedDB。

### 评论

这两个 Bug 非常典型地反映了在解构“配置即代码”动态引擎时，残留的全局国际化拦截规则和局部状态孤岛问题。通过正确收敛到统一的信号流与局部多语言路由，可以完美解决该问题。

### 目标

1. 修正 `src/core/i18n.ts` 中 `useCardTranslation` 的 `isExplicitGlobal` 逻辑，允许 `settings.*` 正确路由到卡片私有词典。
2. 重构 `SettingsModal.tsx`，使用 `updateCardSettings` 驱动全局响应式状态同步与持久化。

### 基本原理

通过剥离 `useCardTranslation` 对 `settings.` 的硬编码全局干预，卡片内部的 `t('settings.xxx')` 能够自然触发 `cards.<cardId>.settings.xxx` 的递归查找。同时，将模态窗的变更接入 `$settings` 信号流，确保 UI、存储与内存缓存三位一体。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/config #scope/core #scope/dx #ai/refine #task/domain/core #task/object/settings-modal #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复国际化多语言命名空间路由与模态窗响应式持久化

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~typescript.old
  const cardT = <T = string>(key: string, params?: Record<string, string | number>): T => {
    const isExplicitGlobal =
      key.startsWith('cards.') ||
      key.startsWith('common.') ||
      key.startsWith('global.') ||
      key.startsWith('tags.') ||
      key.startsWith('nav.') ||
      key.startsWith('settings.') ||
      key.startsWith('stats.') ||
      key.startsWith('plan.') ||
      key.startsWith('home.');

    if (isExplicitGlobal) {
      return baseT<T>(key, params);
    }
~~~~~
~~~~~typescript.new
  const cardT = <T = string>(key: string, params?: Record<string, string | number>): T => {
    const isExplicitGlobal =
      key.startsWith('cards.') ||
      key.startsWith('common.') ||
      key.startsWith('global.') ||
      key.startsWith('tags.') ||
      key.startsWith('nav.') ||
      key.startsWith('stats.') ||
      key.startsWith('plan.') ||
      key.startsWith('home.');

    if (isExplicitGlobal) {
      return baseT<T>(key, params);
    }
~~~~~

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript.old
import { registry } from '../../core/registry';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  saveSettings,
} from '../../storage/settings';
import type { CardDefinition } from '../../types/card';
import { ModalShell } from '../common/ModalShell';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
~~~~~
~~~~~typescript.new
import { registry } from '../../core/registry';
import { updateCardSettings } from '../../stores/settingsStore';
import type {
  BaseModuleSettings,
  UserSettings,
} from '../../storage/settings';
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
  const updateCardConfig = (patch: Partial<BaseModuleSettings>) => {
    setCurrent((prev) => {
      const updatedCard = {
        ...getCardSettings(prev, card.id),
        ...patch,
      };
      const nextSettings: UserSettings = {
        ...prev,
        cards: {
          ...prev.cards,
          [card.id]: updatedCard,
        },
      };
      saveSettings(nextSettings).catch((err) => console.error(err));
      onSave(nextSettings);
      return nextSettings;
    });
  };
~~~~~
~~~~~typescript.new
  const updateCardConfig = async (patch: Partial<BaseModuleSettings>) => {
    const next = await updateCardSettings(card.id, patch);
    setCurrent(next);
    onSave(next);
  };
~~~~~

### 下一步建议

- 建议在浏览器中刷新页面，打开任意 `star_*` 卡片或带设置项的训练模块，检查网格按钮文案（如 `2x2`、`干扰点网格大小`）是否已正确渲染。
- 尝试修改设置（如网格尺寸或手动指定靶向），关闭模态窗后重新打开，验证持久化是否生效。

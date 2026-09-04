## [WIP] fix(modal): 修复 SettingsModal 因遗漏导入 `getCardSettings` 导致模态窗渲染崩溃的 Bug

### 错误分析

在上一轮修改 `SettingsModal.tsx` 以接入响应式状态流时，清理旧导入项不慎将 `getCardSettings` 从 `../../storage/settings` 的导入列表中删除了。
这导致在渲染模态窗时执行到 `const cardConfig = getCardSettings(current, card.id);` 时抛出 `ReferenceError: getCardSettings is not defined` 异常，从而导致整个 React / Preact 组件树崩溃、模态窗无法弹出。

### 用户需求

恢复 `SettingsModal.tsx` 对 `getCardSettings` 的正确导入，确保模态窗能够正常挂载与渲染。

### 评论

这是一个典型的由于重构时清理导入引起的引用丢失错误。通过补全导入即可恢复正常。

### 目标

在 `src/components/modals/SettingsModal.tsx` 中重新引入 `getCardSettings` 导入。

### 基本原理

`getCardSettings` 是从存储层获取特定卡片配置的安全访问函数，模态窗初始化时必须依赖它来读取当前卡片的设置状态。

### 标签

#intent/fix #flow/ready #priority/critical #comp/cli #concept/ui #scope/core #scope/dx #ai/refine #task/domain/core #task/object/settings-modal #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 补全 SettingsModal 的 getCardSettings 导入

~~~~~act
patch_file
src/components/modals/SettingsModal.tsx
~~~~~
~~~~~typescript.old
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
~~~~~typescript.new
import { registry } from '../../core/registry';
import { updateCardSettings } from '../../stores/settingsStore';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
} from '../../storage/settings';
import type { CardDefinition } from '../../types/card';
import { ModalShell } from '../common/ModalShell';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
~~~~~

### 下一步建议

现在所有卡片的设置模态窗已经可以正常打开并正确显示翻译后的文案和持久化状态。你可以刷新页面测试各项设置交互。

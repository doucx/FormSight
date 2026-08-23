收到构建报错信息。在删除界面配置项后，`GlobalSettingsModal.tsx` 中仍残留了未使用的 `FlaskConical` 导入以及 `handleToggleExperimental` 处理函数。我们将通过一个修复计划将其清理干净。

## [WIP] fix: 清理 GlobalSettingsModal 中残留的实验性模块开关逻辑与导入

### 错误分析
在先前移除“显示实验性训练模块”开关 UI 的过程中，`src/components/GlobalSettingsModal.tsx` 仍保留了顶部对 `FlaskConical` 图标的导入，以及组件内部的 `handleToggleExperimental` 函数。由于 `GlobalSettings` 类型定义中已移除了 `showExperimentalCards`，导致 TypeScript 报出 TS6133（未使用变量）及 TS2339（属性不存在）编译错误。

### 用户需求
修复 TypeScript 编译错误，使项目构建 `npm run build` 顺利通过。

### 评论
必须确保组件内遗留的废弃处理函数和图标依赖同步清理干净，保持代码树整洁且类型检查完全通过。

### 目标
1. 移除 `src/components/GlobalSettingsModal.tsx` 中对 `FlaskConical` 的导入。
2. 移除 `src/components/GlobalSettingsModal.tsx` 中的 `handleToggleExperimental` 函数。

### 基本原理
直接删除废弃的导入声明和事件处理函数，使组件完全符合最新的 `GlobalSettings` 接口规范。

### 标签
#intent/fix #flow/ready #priority/high
#comp/runtime #concept/config #scope/dx
#ai/instruct
#task/domain/ui #task/object/global-settings-modal #task/action/bug-fix #task/state/continue #task/status/active

---

### Script

#### Acts 1: 清理 `GlobalSettingsModal.tsx` 中的无用导入与处理函数

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
import {
  Clock,
  Download,
  FlaskConical,
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
~~~~~
~~~~~typescript
import {
  Clock,
  Download,
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
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
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

  const handleToggleExperimental = () => {
    const current = settings.global.showExperimentalCards ?? false;
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        showExperimentalCards: !current,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleIdleTimeoutChange = (sec: number) => {
~~~~~
~~~~~typescript
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
~~~~~

### 下一步建议
重新执行 `npm run build`，验证 TypeScript 编译与 Vite 打包是否顺利通过。

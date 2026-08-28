你的分析完全正确。

在最近的代码更新或类型重构后，TypeScript 编译检查暴露出 4 处类型错误与未使用导入警告：
1. `src/components/GlobalStatsModal.tsx`: `Eye` 图标导入但未被使用。
2. `src/components/discovery/FilterEngine.tsx`: `Crosshair` 与 `ShieldAlert` 图标导入但未被使用。
3. `src/utils/settings.ts`: 字符串 `'continuous_slider'` 不符合 `InteractionTag` 定义（正确的标签应为 `continuous_mod`）。

我将生成一个计划来修复这些 TypeScript 编译错误。

---

## [WIP] fix(build): 修复 TypeScript 编译错误与未使用的图标导入

### 错误分析

1. **未使用导入 (`TS6133`)**:
   - `src/components/GlobalStatsModal.tsx` 中导入了 `Eye`，但在组件内未渲染。
   - `src/components/discovery/FilterEngine.tsx` 中导入了 `Crosshair` 和 `ShieldAlert`，但在组件内未渲染。
   - 解决方案：直接从各自文件的 `lucide-preact` 导入列表中移除这些未使用的图标变量。

2. **类型不匹配 (`TS2345`)**:
   - 在 `src/utils/settings.ts` 第 79 行，代码检查 `card.tags?.interaction?.includes('continuous_slider')`。
   - 根据 `src/types/card.ts`（或 `FilterEngine.tsx` 中的定义），交互形态标签为 `continuous_mod`（连续调制 (滑块)），并不存在 `'continuous_slider'`。
   - 解决方案：将 `'continuous_slider'` 纠正为 `__1__` (或 `continuous_mod`)。

### 用户需求
修复 4 处 TypeScript 编译错误，确保 `npm run build` 能够干净、顺利地通过。

### 评论
这是一个典型的由于重构引起的类型飘移和未引用清理问题。及时修复这些编译错误可以保障项目的持续交付质量。

### 目标
1. 移除 `src/components/GlobalStatsModal.tsx` 中未使用的 `Eye` 导入。
2. 移除 `src/components/discovery/FilterEngine.tsx` 中未使用的 `Crosshair` 和 `ShieldAlert` 导入。
3. 修正 `src/utils/settings.ts` 中错误的交互标签常量 `continuous_slider` 为 `continuous_mod`。

### 基本原理
通过精确的 `patch_file` 操作，清理无用的 Lucide 图标以消除 `TS6133` 警告，并将设置初始化逻辑中的标签键名对齐到正确的联合类型定义上，从而使 `tsc` 编译通过。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #concept/config #scope/core #ai/instruct #task/domain/testing #task/object/typescript-errors #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 清理 GlobalStatsModal.tsx 中未使用的 Eye 导入

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript.old
import {
  Activity,
  BarChart2,
  Brain,
  Calendar,
  ChevronDown,
  Compass,
  Eye,
  Filter,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
~~~~~
~~~~~typescript.new
import {
  Activity,
  BarChart2,
  Brain,
  Calendar,
  ChevronDown,
  Compass,
  Filter,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
~~~~~

#### Acts 2: 清理 FilterEngine.tsx 中未使用的图标导入

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript.old
import {
  Boxes,
  Brain,
  Check,
  Compass,
  Crosshair,
  Eye,
  Filter,
  FlaskConical,
  MousePointer,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-preact';
~~~~~
~~~~~typescript.new
import {
  Boxes,
  Brain,
  Check,
  Compass,
  Eye,
  Filter,
  FlaskConical,
  MousePointer,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-preact';
~~~~~

#### Acts 3: 修正 settings.ts 中的交互标签类型错误

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
    // 如果卡片包含滑块交互，配置默认容错与外延感应
    if (card.tags?.interaction?.includes('continuous_slider')) {
      cardConfig.sliderHitMargin = 12;
      cardConfig.showToleranceBand = true;
    }
~~~~~
~~~~~typescript.new
    // 如果卡片包含滑块交互，配置默认容错与外延感应
    if (card.tags?.interaction?.includes('continuous_mod')) {
      cardConfig.sliderHitMargin = 12;
      cardConfig.showToleranceBand = true;
    }
~~~~~

### 下一步建议
应用此计划后，建议执行 `npm run build` 命令验证所有 TypeScript 编译错误是否已完全解决。

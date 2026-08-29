我将修复 `src/utils/canvas/drawHeatmap.ts` 和 `src/utils/canvas/drawHueBiasChart.ts` 中的导入语句，将 `setupHiDpiCanvas` 替换为新封装的 `initSquareHiDpiCanvas`。

## [WIP] fix(canvas): 修复 drawHeatmap 与 drawHueBiasChart 中的导入引用

### 错误分析
在上一轮对 Canvas 图表初始化样板代码的重构中，`drawHeatmap.ts` 与 `drawHueBiasChart.ts` 内部改用了 `initSquareHiDpiCanvas`，但文件顶部的 import 语句仍保留为旧的 `setupHiDpiCanvas`，导致 TypeScript 报 `TS6133` (未使用的变量) 和 `TS2304` (未找到 `initSquareHiDpiCanvas` 名称) 错误。

### 用户需求
修复 TypeScript 类型检查错误，更新 `drawHeatmap.ts` 和 `drawHueBiasChart.ts` 的导入。

### 评论
这是一个简单的未更新导入问题，修正 import 语句后即可顺利通过 `tsc --noEmit`。

### 目标
1. 将 `src/utils/canvas/drawHeatmap.ts` 的导入更新为 `import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi'`。
2. 将 `src/utils/canvas/drawHueBiasChart.ts` 的导入更新为 `import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi'`。

### 基本原理
直接修正模块的具名导入，确保编译期符号解析正常。

### 标签
#intent/fix #flow/ready #priority/high
#comp/runtime #concept/ui #scope/core
#ai/instruct
#task/domain/canvas #task/object/import-resolution #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `drawHeatmap.ts` 与 `drawHueBiasChart.ts` 的导入语句

~~~~~act
patch_file
src/utils/canvas/drawHeatmap.ts
~~~~~
~~~~~typescript.old
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import type { UnifiedTrialRecord } from '../db/index';
~~~~~
~~~~~typescript.new
import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi';
import type { UnifiedTrialRecord } from '../db/index';
~~~~~

~~~~~act
patch_file
src/utils/canvas/drawHueBiasChart.ts
~~~~~
~~~~~typescript.old
import { setupHiDpiCanvas } from '../../core/canvas/hidpi';
import { i18n } from '../../core/i18n';
import type { UnifiedTrialRecord } from '../db/index';
~~~~~
~~~~~typescript.new
import { initSquareHiDpiCanvas } from '../../core/canvas/hidpi';
import { i18n } from '../../core/i18n';
import type { UnifiedTrialRecord } from '../db/index';
~~~~~

### 下一步建议

1. **重新执行检查**：运行 `npm run checkf`，确认 TypeScript 类型检查全部通过。
2. **复验 DRY 报告**：运行 `python scripts/check_dry.py` 查看最新的克隆与异味统计。

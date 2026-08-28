修复 `universalViews.tsx` 中未使用的导入报错。

## [WIP] fix(analytics): 移除 universalViews.tsx 中未使用的导入

### 用户需求
修复 TypeScript 检测到的 `TS6133: 'Activity' is declared but its value is never read` 以及 `'TrendingUp' is declared but its value is never read` 错误。

### 评论
由于未在文件中使用 `Activity` 和 `TrendingUp` 图标，TypeScript 抛出了未使用变量的错误，需要将其从 `lucide-preact` 导入中移除。

### 目标
1. 修改 `./src/core/analytics/universalViews.tsx` 文件。
2. 从顶部的 `lucide-preact` 导入中移除 `Activity` 和 `TrendingUp`。

### 基本原理
精简导入列表，去除多余的未引用符号，使 `tsc --noEmit` 编译通过。

### 标签
#intent/fix #flow/ready #priority/high #comp/engine #concept/config #scope/core #ai/instruct #task/domain/analytics #task/object/universal-views #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 移除未使用的导入

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
import { Activity, Gauge, TrendingUp, Zap } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
~~~~~
~~~~~typescript.new
import { Gauge, Zap } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
~~~~~

### 下一步建议

修改完成后，建议再次运行 `npm run checkf` 以确保所有类型检查和代码风格检查全部通过。

错误很清晰：在之前的批量替换过程中，`AbsTdGesture2afcView.tsx`、`PerspPropMigrationView.tsx` 和 `persp_prop_migration/utils/generator.ts` 这 3 个文件原本存在多行折叠的 `import {\n ... }`，导致新的 SDK 导入语句被插在展开了一半的未闭合 import 语句内部，引发了语法解析错误。同时，项目根目录遗留了 `scripts/migrate_card_imports.cjs` 触发了 Biome 代码检查。

我将生成一个修复计划，精准恢复这 3 个文件的合法 import 语法，并清理临时脚本。

## [WIP] fix: 修复卡片导入语法冲突并清理迁移临时脚本

### 错误分析
多行 `import {\n ... \n} from '...'` 在被匹配或分割时，由于插值索引定位到了未闭合的大括号中间，导致生成了嵌套的 `import { import { ... } from '...'; ... }` 语句，直接破坏了 TypeScript AST 结构，进而导致 `npm run build` 和 Biome 报出语法解析错误。

### 用户需求
1. 手动修正 `src/cards/abs_td_gesture_2afc/AbsTdGesture2afcView.tsx` 顶部的冲突 import。
2. 手动修正 `src/cards/persp_prop_migration/PerspPropMigrationView.tsx` 顶部的冲突 import。
3. 手动修正 `src/cards/persp_prop_migration/utils/generator.ts` 顶部的冲突 import。
4. 移除残留的 `scripts/migrate_card_imports.cjs`。

### 评论
这类由于字符串行号错位导致的语法错误属于局部的偶发格式冲突，使用精确的 `patch_file` 锚点替换即可完全消除。

### 目标
1. 消除 3 个卡片文件内部的 import 嵌套语法错误。
2. 删除触发 Biome 警告的残留脚本。
3. 确保项目通过 TypeScript 语法检查。

### 基本原理
将插错位置的 `@formsight/card-sdk` 语句剥离出来单独作为独立合法的顶部 import 语句，还原其他本地模块（`./utils/generator`、`../types`）各自独立的 import 块。

### 标签
#intent/fix #flow/ready #priority/critical #comp/interfaces #concept/ui #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/card-sdk #task/action/bug-fix #task/state/continue #task/status/active

---

### Script

#### Acts 1: 修复 `abs_td_gesture_2afc` 视图的 Import 嵌套

我们将把插在中间的 SDK 导入提取并独立置于顶部。

~~~~~act
patch_file
src/cards/abs_td_gesture_2afc/AbsTdGesture2afcView.tsx
~~~~~
~~~~~typescript
import type { HitResult, QuestionData } from './types';
import {
import { CanvasView, Standard2AfcView, useCardTranslation } from '@formsight/card-sdk';
  OPTION_SIZE,
  THUMB_SIZE,
  drawParticlesCanvas,
  drawSpinePromptCanvas,
} from './utils/generator';
~~~~~
~~~~~typescript
import { CanvasView, Standard2AfcView, useCardTranslation } from '@formsight/card-sdk';
import type { HitResult, QuestionData } from './types';
import {
  OPTION_SIZE,
  THUMB_SIZE,
  drawParticlesCanvas,
  drawSpinePromptCanvas,
} from './utils/generator';
~~~~~

#### Acts 2: 修复 `persp_prop_migration` 视图与生成器的 Import 嵌套

修复 `PerspPropMigrationView.tsx` 与 `generator.ts` 顶部的折叠语法冲突。

~~~~~act
patch_file
src/cards/persp_prop_migration/PerspPropMigrationView.tsx
~~~~~
~~~~~typescript
import type { PerspPropMigrationHitResult, PerspPropMigrationQuestion } from './types';
import {
import {
  Badge,
  CanvasView,
  Point,
  QuestionCardShell,
  useCardTranslation
} from '@formsight/card-sdk';
  PERSPECTIVE_CANVAS_SIZE,
  drawHorizontalReferenceCanvas,
  drawProportionCanvas,
} from './utils/generator';
~~~~~
~~~~~typescript
import {
  Badge,
  CanvasView,
  type Point,
  QuestionCardShell,
  useCardTranslation,
} from '@formsight/card-sdk';
import type { PerspPropMigrationHitResult, PerspPropMigrationQuestion } from './types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  drawHorizontalReferenceCanvas,
  drawProportionCanvas,
} from './utils/generator';
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_migration/utils/generator.ts
~~~~~
~~~~~typescript
import type {
import {
  CANVAS_THEME,
  expDecayInterpolate,
  hexToRgba,
  Point,
  setup2DCanvas
} from '@formsight/card-sdk';
  LineSegment,
  PerspPropMigrationHitResult,
  PerspPropMigrationQuestion,
} from '../types';
~~~~~
~~~~~typescript
import {
  CANVAS_THEME,
  type Point,
  expDecayInterpolate,
  hexToRgba,
  setup2DCanvas,
} from '@formsight/card-sdk';
import type {
  LineSegment,
  PerspPropMigrationHitResult,
  PerspPropMigrationQuestion,
} from '../types';
~~~~~

#### Acts 3: 删除残留的迁移脚本文件

删除引发 Biome 报错的临时 `.cjs` 脚本。

~~~~~act
run_command
~~~~~
~~~~~
rm -f scripts/migrate_card_imports.cjs scripts/migrate_card_imports.js
~~~~~

### 下一步建议
1. 执行 `npm run build` 验证所有 20+ 个训练卡片是否全部通过 TypeScript 编译与打包。
2. 若构建通过，可执行 `npm run lint` 验证代码规范，完成“别名与 Card SDK 基础设施”的全部改造任务。

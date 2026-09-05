## [WIP] fix(card): 修复 drawAxisCanvas 中引用不存在的主题属性导致构建失败

### 错误分析
在 TypeScript 编译检查中发现错误：
`src/cards/abs_gesture_axis/utils/generator.ts:98:38 - error TS2339: Property 'border' does not exist on type '{ fill: string; stroke: string; highlight: string; }'.`
**根本原因**: 在新增的 `drawAxisCanvas` 辅助函数中，中心基准锚点的 `ctx.fillStyle` 错误地引用了 `CANVAS_THEME.shape.border`，而全局的主题 `CANVAS_THEME.shape` 仅包含 `fill`、`stroke` 和 `highlight` 三个属性，并没有定义 `border` 属性，导致 TypeScript 报属性不存在错误。
**解决方案**: 将 `CANVAS_THEME.shape.border` 替换为合法的 `CANVAS_THEME.shape.stroke`。

### 用户需求
修复 `abs_gesture_axis` 卡片势线绘制辅助函数中的 TypeScript 类型编译报错。

### 评论
这是一个在代码解耦和重构过程中由于拼写或属性记忆偏差导致的微小类型错误。通过严格的编译检查及时拦截，可以确保主分支类型安全。

### 目标
1. 定位 `src/cards/abs_gesture_axis/utils/generator.ts` 第 98 行。
2. 将 `CANVAS_THEME.shape.border` 修改为 `CANVAS_THEME.shape.stroke`。

### 基本原理
利用 `CANVAS_THEME.shape.stroke` 作为基准圆点的填充色，既符合图形系统的色彩规范，又严格遵守 TypeScript 类型契约。

### 标签
#intent/fix #flow/ready #priority/critical #comp/cards #concept/ui #scope/dx #ai/instruct #task/domain/ui #task/object/gesture-axis-generator #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修正 generator.ts 中的主题属性引用

使用 `patch_file` 修复 `drawAxisCanvas` 中的属性拼写/类型错误。

~~~~~act
patch_file
src/cards/abs_gesture_axis/utils/generator.ts
~~~~~
~~~~~typescript.old
  // 绘制中心基准弱锚点
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = CANVAS_THEME.shape.border;
  ctx.fill();
~~~~~
~~~~~typescript.new
  // 绘制中心基准弱锚点
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = CANVAS_THEME.shape.stroke;
  ctx.fill();
~~~~~

### 下一步建议
1. 运行 `pnpm build` 或类型检查命令验证错误是否已完全解决。
2. 确认无误后，可以继续进行交互或单元测试的回归。

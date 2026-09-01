收到。这是由于 Biome Linter 规则 `lint/suspicious/noAssignInExpressions` 限制了在 `return` 表达式中进行赋值操作（`t = t ^ (t >>> 15)`）。我们将其拆分为独立的赋值语句，使语法结构清晰且符合 Linter 规范。

## [WIP] fix: 修复 generator.ts 中 splitmix32 表达式内赋值的 linter 错误

### 错误分析
在 `src/cards/fractal_edge_roughness/utils/generator.ts` 的第 19 行中，`return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;` 在返回表达式内部直接给变量 `t` 赋值。Biome 代码规范禁止在带有副作用的表达式中进行内联赋值（`noAssignInExpressions`），以避免产生歧义和潜在的副作用问题。

### 用户需求
修复 `src/cards/fractal_edge_roughness/utils/generator.ts` 中的 Linter 报错，使其顺利通过工程代码检查。

### 评论
修复方式非常直接且无破坏性，将位运算操作提取为独立语句不仅能够满足 Linter 的规范要求，还能提升算法代码的可读性。

### 目标
1. 在 `splitmix32` 函数中，将 `t = t ^ (t >>> 15)` 提取为单独的行。
2. 确保 `return (t >>> 0) / 4294967296;` 保持纯粹的返回值计算，消除 Linter 报错。

### 基本原理
将赋值与返回表达式分离，避免表达式内赋值（Assignment in expression），同时保持 PRNG 生成器的数学计算逻辑完全等价。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/parser #scope/dx #ai/instruct #task/domain/card #task/object/fractal-edge-roughness #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `splitmix32` 中的内联赋值语句

~~~~~act
patch_file
src/cards/fractal_edge_roughness/utils/generator.ts
~~~~~
~~~~~ts.old
function splitmix32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x9e3779b9) | 0;
    let t = s ^ (s >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}
~~~~~
~~~~~ts.new
function splitmix32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x9e3779b9) | 0;
    let t = s ^ (s >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    t = t ^ (t >>> 15);
    return (t >>> 0) / 4294967296;
  };
}
~~~~~

### 下一步建议
1. **重新执行代码检查**: 运行工程检查命令确认所有错误均已清除。
2. **注册卡片**: 确认卡片已导入并挂载到应用路由/卡片注册中心。

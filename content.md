你的分析完全正确。

在执行 `npm run build` 时，TypeScript 检查到 `TopDownPatternView.tsx` 中定义了未被使用的回调参数 `pat`，同时 Biome 检查中也有一个关于 `PointClickCanvas.tsx` 中 `useEffect` 依赖项冗余的提示。为了确保项目能够通过严格的类型检查与代码检查，我们首先需要修复这两个小问题。

我将生成一个草案计划来修复这两个编译及检查错误。

# [WIP] fix(build): 修复 TypeScript 编译错误和 Biome 依赖警告

### 错误分析

1. **TypeScript 错误**: 在 `src/components/abstraction/TopDownPatternView.tsx` 的第 61 行，`nafcOptions` 映射函数中声明了 `pat` 参数但未在闭包中使用，触发了 TypeScript 的 `noUnusedParameters` 严格校验。
2. **Biome 警告/错误**: 在 `src/components/common/PointClickCanvas.tsx` 的 `useEffect` 中包含了不必要的 `gridPoints` 依赖项。

### 用户需求
修复 TypeScript 编译错误和 Biome 检查错误，确保 `npm run build` 和 `npm run check` 能够 100% 通过。

### 评论
这是一个保持代码库健康、确保 CI/CD 顺利通过的必要重构。

### 目标
1. 修复 `TopDownPatternView.tsx` 中未使用的参数 `pat`。
2. 修复 `PointClickCanvas.tsx` 中 `useEffect` 的不必要依赖项。

### 基本原理
通过将 `TopDownPatternView.tsx` 中的 `pat` 参数加上下划线前缀 (`_pat`) 显式标记为未使用参数，并调整 `PointClickCanvas.tsx` 的 `useEffect` 依赖，以完美符合 Biome 与 TypeScript 严格模式的规范。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #scope/core #ai/instruct #task/domain/testing #task/object/build-fixes #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `TopDownPatternView.tsx` 与 `PointClickCanvas.tsx` 中的类型和 Lint 问题

~~~~~act
patch_file
src/components/abstraction/TopDownPatternView.tsx
~~~~~
~~~~~typescript.old
  const nafcOptions = (question.palettePatternOptions || []).map((pat, idx) => {
    const isTarget = idx === targetIdx;
~~~~~
~~~~~typescript.new
  const nafcOptions = (question.palettePatternOptions || []).map((_pat, idx) => {
    const isTarget = idx === targetIdx;
~~~~~

~~~~~act
patch_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~typescript.old
  useEffect(() => {
    setHoverPoint(null);
  }, [gridPoints]);
~~~~~
~~~~~typescript.new
  useEffect(() => {
    setHoverPoint(null);
  }, []);
~~~~~

### 下一步建议
修复完成后，建议执行 `npm run build` 和 `npm run check` 验证所有错误与警告是否已完全消除。

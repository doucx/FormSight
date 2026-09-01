你的分析完全正确。Biome 静态检查报错 `useExhaustiveDependencies` 是因为 `dataVersion` 作为触发器被列在了 `useEffect` 的依赖数组中，但在回调函数内部并未被直接读取。在当前代码库的其他组件中，已经广泛采用 `// biome-ignore lint/correctness/useExhaustiveDependencies:` 注释来优雅地处理这类“作为触发器的外部依赖”场景。

我将生成一个计划来为 `src/hooks/useGlobalStatsData.ts` 中的 `useEffect` 补充对应的 Biome 忽略注释。

---

## [WIP] fix(hooks): 通过添加 biome-ignore 解决 useGlobalStatsData 依赖警告

### 错误分析

Biome 规则 `useExhaustiveDependencies` 要求 `useEffect` 内部所有引用的外部变量都必须列入依赖项，反之，如果将某个变量（如用于触发重新加载的 `dataVersion`）列入依赖项但未在内部读取，则会触发此报错。为了在保留 `dataVersion` 触发语义的同时满足静态检查，最佳实践是添加专属的 `biome-ignore` 注释。

### 用户需求
修复 `src/hooks/useGlobalStatsData.ts` 中由 Biome 检查出的 `useExhaustiveDependencies` 错误。

### 评论
此项修改保证了代码库能够干净地通过 Biome 静态检查，且与项目中其他地方处理同类依赖的做法保持高度一致。

### 目标
1. 定位 `src/hooks/useGlobalStatsData.ts` 中的 `useEffect` 钩子。
2. 在其上方添加 `// biome-ignore lint/correctness/useExhaustiveDependencies: dataVersion triggers data reload` 注释。

### 基本原理
直接引用或读取 `dataVersion` 变量会导致不必要的冗余逻辑，而使用 `biome-ignore` 能够明确向静态检查器说明设计意图，是目前最稳健的处理方式。

### 标签
#intent/fix #flow/ready #priority/medium #comp/runtime #concept/state #scope/core #ai/instruct #task/domain/hooks #task/object/use-global-stats-data #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修补 `useGlobalStatsData.ts` 添加 Biome 忽略注释

~~~~~act
patch_file
src/hooks/useGlobalStatsData.ts
~~~~~
~~~~~typescript.old
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
~~~~~
~~~~~
  // biome-ignore lint/correctness/useExhaustiveDependencies: dataVersion triggers data reload
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
~~~~~

### 下一步建议
建议在执行上述修改后，运行 `npx @biomejs/biome check` 以验证该错误已被彻底消除。

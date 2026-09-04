## [WIP] 修复 TypeScript 报错及不合规非空断言

### 评论
通过在运行时检查必需的实例属性并抛出异常（或者提供默认空实现），而不是使用会被 Linter 阻止的非空断言符 `!`，我们可以使得 TypeScript 更安全地收窄类型，从而修复类型编译和代码风格的双重错误。

### 目标
1. 移除 `src/views/GenericTrainingView.tsx` 和 `src/core/registry.ts` 中的 `!` 非空断言。
2. 在 `GenericTrainingView` 中，前置检查 `engine` 和 `renderCanvas` 是否存在，若不存在抛出初始化异常，从而令后续调用安全无虞。
3. 在 `registry` 构建 `CardDefinition` 时，若未寻获 `icon`，则提供一个 `() => null` 的默认回调充当占位，满足类型接口。

### 基本原理
避免由于直接对可能 `undefined` 的变量进行调用（如 `renderCanvas({...})`）所带来的 TS 报错，同时规避了粗暴的类型强转，通过运行时的防御性检测来收敛类型，不仅保证了类型严谨，还提早暴露了配置错误的模块。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #scope/core #human/lead #task/domain/core #task/object/type-safety #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 修复 GenericTrainingView 类型收窄
加入防御性的存在性检查，当未找到对应的实现时抛出异常。这能帮助 TypeScript 将后面的类型推断为绝对非空，从而消除 TS2722 与 style/noNonNullAssertion 错误。

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
  const domain = card.domain;
  const engine = manifest.engine ?? manifest.training!;
  const renderCanvas = manifest.ui?.renderCanvas ?? manifest.training?.renderCanvas;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
~~~~~
~~~~~typescript.new
  const domain = card.domain;
  const engine = manifest.engine ?? manifest.training;
  const renderCanvas = manifest.ui?.renderCanvas ?? manifest.training?.renderCanvas;

  if (!engine || !renderCanvas) {
    throw new Error(`Card [${card.id}] is missing engine or renderCanvas implementation`);
  }

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
~~~~~

#### Acts 2: 修复 Registry 默认图元处理
在卡片装载注册时，如果未配置任何 `icon` 实现，则回退提供一个什么也不渲染的安全函数 `() => null`，避免非空断言。

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
    // 2. 构建标准 CardDefinition
    const icon = card.ui?.icon ?? card.icon!;
    const cardDef: CardDefinition = {
      id: card.id,
~~~~~
~~~~~typescript.new
    // 2. 构建标准 CardDefinition
    const icon = card.ui?.icon ?? card.icon ?? (() => null);
    const cardDef: CardDefinition = {
      id: card.id,
~~~~~

### 下一步建议
运行构建与类型检查（例如 `npx tsc --noEmit` 与 Linter），以验证现在项目已经 100% 通过了校验。如果无其他问题即可提交代码。

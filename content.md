我将生成一个修复计划，全面修补所有卡片中由于未接收或未透传 `settings.showCanvasHints` 而导致任务指引无法被全局隐藏的问题。

## [WIP] fix: 修复多张卡片中任务文字指引无法被全局隐藏的问题

### 错误分析

当用户在全局设置中关闭“显示任务文字指引”后，包含 `neg_area_comparison_2afc`、`neg_shape_match_2afc`、`fractal_edge_roughness`、`persp_vp_convergence` 等卡片依然显示顶部的提示胶囊条。

**根本原因**：
1. **链路断裂 (未接/未传 settings)**：卡片入口 `index.tsx` 的 `renderCanvas` 函数未解构宿主环境传入的 `settings` 参数，或者虽然解构了 `settings` 但未提取 `settings.showCanvasHints` 透传至 View 组件。
2. **默认值覆盖**：View 组件 Props 的 `showCanvasHints` 默认值为 `true`。当父级未显式传入该布尔值时，View 自动回退至 `true`，导致提示常驻。
3. **接口声明缺失**：`fractal_edge_roughness` 的 View 组件中完全未声明 `showCanvasHints` 属性，也未将该属性传递给底层的 `QuestionCardShell`。

### 用户需求

当在全局偏好选项中关闭“显示任务文字指引”时，所有卡片均应受控隐藏顶部的文字指引条。

### 评论

这是一个涉及多卡片表现一致性的关键修复。任务文字指引主要用于初学者认知辅助，对于熟练训练者或需要进行无干扰纯净视觉测试的场景，保证“关闭提示”能够精准贯穿到每一张卡片是体验一致性的重要基础。

### 目标

1. 在 `fractal_edge_roughness` 的 View 组件中增加 `showCanvasHints` 属性支持并传递给 `QuestionCardShell`。
2. 为所有漏传 `showCanvasHints` 的卡片 `index.tsx` 补齐参数解构与 View 属性透传。

### 基本原理

在卡片的 `renderCanvas` 入口解构 `settings` 参数，将 `settings.showCanvasHints as boolean` 显式透传给对应的 View 组件。View 组件将接收到的布尔值传递给 `@formsight/card-sdk` 的 `QuestionCardShell` 的 `showCanvasHints` prop，使各卡片受全局状态精确控制。

### 标签

#intent/fix #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/task-hints-visibility #task/action/bug-fix #task/state/begin #task/status/active

---

### Script

#### Acts 1: 补齐 `fractal_edge_roughness` View 组件的 `showCanvasHints` 支持

~~~~~act
patch_file
src/cards/fractal_edge_roughness/FractalEdgeRoughnessView.tsx
~~~~~
~~~~~typescript
export interface FractalEdgeRoughnessViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
}

export function FractalEdgeRoughnessView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: FractalEdgeRoughnessViewProps) {
~~~~~
~~~~~typescript
export interface FractalEdgeRoughnessViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function FractalEdgeRoughnessView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: FractalEdgeRoughnessViewProps) {
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/FractalEdgeRoughnessView.tsx
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell hintText={t('instruction')} maxWidth="max-w-2xl">
      {/* 边缘对比视口 */}
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell
      hintText={t('instruction')}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
      {/* 边缘对比视口 */}
~~~~~

#### Acts 2: 修复负形与分形类卡片的 `index.tsx`

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegAreaComparison2AfcView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <NegAreaComparison2AfcView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <NegShapeMatch2AfcView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <NegShapeMatch2AfcView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

~~~~~act
patch_file
src/cards/neg_ratio_estimation/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <NegRatioEstimationView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings.sliderHitMargin ?? 12}
        showToleranceBand={settings.showToleranceBand ?? true}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <NegRatioEstimationView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings.sliderHitMargin ?? 12}
        showToleranceBand={settings.showToleranceBand ?? true}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <FractalEdgeRoughnessView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <FractalEdgeRoughnessView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

#### Acts 3: 修复透视与空间类卡片的 `index.tsx`

~~~~~act
patch_file
src/cards/persp_vp_convergence/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <PerspVpConvergenceView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings?.sliderHitMargin ?? 12}
        showToleranceBand={settings?.showToleranceBand ?? true}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <PerspVpConvergenceView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings?.sliderHitMargin ?? 12}
        showToleranceBand={settings?.showToleranceBand ?? true}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

~~~~~act
patch_file
src/cards/persp_gestalt_continuation/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspGestaltContinuationView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <PerspGestaltContinuationView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_division/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspPropDivisionView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <PerspPropDivisionView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

~~~~~act
patch_file
src/cards/persp_prop_migration/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspPropMigrationView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <PerspPropMigrationView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

~~~~~act
patch_file
src/cards/persp_structure_3d/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <PerspStructure3DView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <PerspStructure3DView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

#### Acts 4: 修复角度类卡片的 `index.tsx`

~~~~~act
patch_file
src/cards/angle_comparison_2afc/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <AngleComparison2AfcView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AngleComparison2AfcView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

~~~~~act
patch_file
src/cards/angle_parallel_2afc/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled }) => (
      <AngleParallel2AfcView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AngleParallel2AfcView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

~~~~~act
patch_file
src/cards/angle_estimation/index.tsx
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AngleEstimationView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings?.sliderHitMargin ?? 12}
        showToleranceBand={settings?.showToleranceBand ?? true}
      />
    ),
~~~~~
~~~~~typescript
    renderCanvas: ({ question, showAnswer, userAnswer, onAnswer, disabled, settings }) => (
      <AngleEstimationView
        key={question.id}
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        disabled={disabled}
        hitMargin={settings?.sliderHitMargin ?? 12}
        showToleranceBand={settings?.showToleranceBand ?? true}
        showCanvasHints={settings.showCanvasHints as boolean}
      />
    ),
~~~~~

### 下一步建议

- **功能验证**: 在前端运行环境中切换“显示任务文字指引”开关，测试各修改卡片顶部提示是否能正常显隐。
- **单元测试**: 建议运行 `pnpm test` 确认各卡片的题目生成与评分逻辑未受改动影响。
- **Git 提交**: 在验证无误后，通知我生成对应的 `[COMMIT]` 计划。

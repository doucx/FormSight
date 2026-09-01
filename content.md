我们将修复 `star_single`、`star_double_h` 和 `star_double_r` 中视图组件（`Star*View.tsx`）对 `userAnswer` 属性结构的解构错误。

## [WIP] fix: 修复寻星卡片视图中 userAnswer 属性解构导致的空指针异常

### 错误分析
在训练会话执行流中，`GenericTrainingView` 将 `session.userAnswer`（类型为 `THitResult | null`，即 `HitResult | null`）传入 `renderCanvas` 的 props。
而 `StarSingleView`、`StarDoubleHView` 与 `StarDoubleRView` 误将 `userAnswer` 声明为 `{ clickPoint: Point; hitResult: HitResult } | null`，并在模板中以 `userAnswer?.hitResult.nearestGridPoint` 的方式访问。当揭晓答案时，`userAnswer.hitResult` 为 `undefined`，访问 `.nearestGridPoint` 导致运行时抛出 `TypeError: Cannot read properties of undefined (reading 'nearestGridPoint')`。

### 用户需求
修复 `star_single`、`star_double_h`、`star_double_r` 中的视图组件，将 `userAnswer` 的类型直接对齐为 `HitResult | null`，并在画布中直接读取 `userAnswer?.nearestGridPoint` 与 `userAnswer?.isHit`。

### 评论
将卡片视图的输入 props 精确对齐 `CardCanvasProps` 中泛型 `THitResult`，消除了中间层不必要的嵌套包装，使视图与训练状态机的数据流完全自洽、类型安全。

### 目标
1. 修改 `src/cards/star_single/StarSingleView.tsx`。
2. 修改 `src/cards/star_double_h/StarDoubleHView.tsx`。
3. 修改 `src/cards/star_double_r/StarDoubleRView.tsx`。

### 基本原理
`THitResult` 在寻星系列卡片中即为 `HitResult`（包含 `nearestGridPoint` 与 `isHit`）。视图直接消费 `HitResult | null` 即可完整渲染用户点击吸附点与对错状态。

### 标签
#intent/fix #flow/ready #priority/critical #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/architecture #task/object/star-views #task/action/bug-fix #task/state/continue #task/status/active

---

### Script

#### Acts 1: 修复 `src/cards/star_single/StarSingleView.tsx`

~~~~~act
patch_file
src/cards/star_single/StarSingleView.tsx
~~~~~
~~~~~typescript.old
export interface StarSingleViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (userVal: { clickPoint: Point; hitResult: HitResult }) => void;
  disabled?: boolean;
}

export function StarSingleView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarSingleViewProps) {
~~~~~
~~~~~typescript.new
export interface StarSingleViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: { clickPoint: Point; hitResult: HitResult }) => void;
  disabled?: boolean;
}

export function StarSingleView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarSingleViewProps) {
~~~~~

~~~~~act
patch_file
src/cards/star_single/StarSingleView.tsx
~~~~~
~~~~~typescript.old
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
~~~~~
~~~~~typescript.new
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.nearestGridPoint}
          anchors={[question.anchorA]}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
~~~~~

#### Acts 2: 修复 `src/cards/star_double_h/StarDoubleHView.tsx`

~~~~~act
patch_file
src/cards/star_double_h/StarDoubleHView.tsx
~~~~~
~~~~~typescript.old
export interface StarDoubleHViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (userVal: { clickPoint: Point; hitResult: HitResult }) => void;
  disabled?: boolean;
}

export function StarDoubleHView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarDoubleHViewProps) {
~~~~~
~~~~~typescript.new
export interface StarDoubleHViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: { clickPoint: Point; hitResult: HitResult }) => void;
  disabled?: boolean;
}

export function StarDoubleHView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarDoubleHViewProps) {
~~~~~

~~~~~act
patch_file
src/cards/star_double_h/StarDoubleHView.tsx
~~~~~
~~~~~typescript.old
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
~~~~~
~~~~~typescript.new
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
~~~~~

#### Acts 3: 修复 `src/cards/star_double_r/StarDoubleRView.tsx`

~~~~~act
patch_file
src/cards/star_double_r/StarDoubleRView.tsx
~~~~~
~~~~~typescript.old
export interface StarDoubleRViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: { clickPoint: Point; hitResult: HitResult } | null;
  onAnswer: (userVal: { clickPoint: Point; hitResult: HitResult }) => void;
  disabled?: boolean;
}

export function StarDoubleRView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarDoubleRViewProps) {
~~~~~
~~~~~typescript.new
export interface StarDoubleRViewProps {
  question: QuestionData;
  showAnswer: boolean;
  userAnswer: HitResult | null;
  onAnswer: (userVal: { clickPoint: Point; hitResult: HitResult }) => void;
  disabled?: boolean;
}

export function StarDoubleRView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
}: StarDoubleRViewProps) {
~~~~~

~~~~~act
patch_file
src/cards/star_double_r/StarDoubleRView.tsx
~~~~~
~~~~~typescript.old
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.hitResult.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.hitResult.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
~~~~~
~~~~~typescript.new
        <PointClickCanvas
          canvasSize={CANVAS_SIZE}
          gridPoints={question.distractorPoints}
          targetPoint={question.targetB}
          userNearestPoint={userAnswer?.nearestGridPoint}
          anchors={[question.anchorA, question.anchorC]}
          showAnswer={showAnswer}
          isHit={userAnswer?.isHit}
          disabled={disabled}
          maxDisplayWidth="w-full h-full aspect-square"
          onCommitPoint={handleCommitPoint}
        />
~~~~~

### 下一步建议
已修正寻星三张卡片中全部 `userAnswer` 的属性读取方式。在浏览器中验证自适应练习、作答与答案反馈均正常后，可继续推进**阶段 2: 几何与结构域迁移 (Angle 3 张 & Perspective 5 张)**。

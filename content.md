修复了 `useTrainingSession.ts` 中函数入参解构遗漏 `targetLimitTrials` 和 `onTargetLimitReached` 导致的变量未定义错误，以及 `PlanHeroCard.tsx` 中遗留的未读导入。

## [WIP] fix: 补全 useTrainingSession 参数解构并清理未读导入

### 错误分析

1. `src/hooks/useTrainingSession.ts`:
   - `UseTrainingSessionOptions` 接口中定义了 `targetLimitTrials` 和 `onTargetLimitReached`，但在 `useTrainingSession` 函数参数解构时遗漏了解构这两个属性。
   - 这导致内部 `handleAnswer` 函数及依赖项无法访问这两个变量，在运行时报 `ReferenceError: targetLimitTrials is not defined`，并在编译时报 `TS2304: Cannot find name 'targetLimitTrials'`。

2. `src/components/plan/PlanHeroCard.tsx`:
   - 移除了卡片循环内部未使用的 `meta` 变量后，文件顶部的 `import { DOMAINS_CONFIG } from '../../config/domains';` 变为未读导入，触发 `TS6133`。

### 用户需求

彻底消除 `useTrainingSession` 运行时的未定义变量错误和编译/Linter 检查中的所有未读依赖与导入。

### 评论

在直接对函数形参进行对象解构的模式下，所有需要使用的选项都必须在形参声明中显式解构。补齐解构后，`targetLimitTrials` 和 `onTargetLimitReached` 将在 Hook 作用域内正常可用，计划流训练（PlanTrainingView）的分阶段限题结算逻辑即可顺畅执行。

### 目标

1. 在 `useTrainingSession` 的入参解构中显式添加 `targetLimitTrials` 与 `onTargetLimitReached`。
2. 从 `PlanHeroCard.tsx` 中移除无用的 `DOMAINS_CONFIG` 导入。

### 基本原理

通过向 `useTrainingSession` 解构参数列表注入字段，使 `targetLimitTrials` 和 `onTargetLimitReached` 成为合法的局部变量，同时满足 `useCallback` 的依赖检查和 TypeScript 编译要求。

### 标签

#intent/fix #flow/ready #priority/critical #scope/core #scope/dx #ai/instruct #task/domain/build #task/object/training-session-params #task/action/fix #task/state/continue

---

### Script

#### Acts 1: 在 `useTrainingSession` 中补全参数解构

在 Hook 的入参对象中解构 `targetLimitTrials` 和 `onTargetLimitReached`。

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
export function useTrainingSession<TQuestion, THitResult, TAnswerVal>({
  domain,
  mode,
  sessionType,
  initialLevel,
  autoNext,
  autoNextDelay,
  stepGranularity = 'standard',
  adaptiveMode = 'block',
  targetAccuracy = 0.8,
  blockSize = 10,
  idleTimeoutSec: optionsIdleTimeout,
  generateQuestion,
  evaluateAnswer,
  isHit,
  getQuestionLevel,
  saveTrialRecord,
  saveSession,
  onExit,
}: UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal>) {
~~~~~
~~~~~typescript.new
export function useTrainingSession<TQuestion, THitResult, TAnswerVal>({
  domain,
  mode,
  sessionType,
  initialLevel,
  autoNext,
  autoNextDelay,
  stepGranularity = 'standard',
  adaptiveMode = 'block',
  targetAccuracy = 0.8,
  blockSize = 10,
  idleTimeoutSec: optionsIdleTimeout,
  targetLimitTrials,
  onTargetLimitReached,
  generateQuestion,
  evaluateAnswer,
  isHit,
  getQuestionLevel,
  saveTrialRecord,
  saveSession,
  onExit,
}: UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal>) {
~~~~~

#### Acts 2: 清理 `PlanHeroCard.tsx` 中的未读导入

移除不再被使用的 `DOMAINS_CONFIG`。

~~~~~act
patch_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~typescript.old
import { ArrowRight, ChevronRight, Clock, Play, Plus, Sliders, Sparkles, Zap } from 'lucide-preact';
import { getCardById } from '../../config/cards';
import { DOMAINS_CONFIG } from '../../config/domains';
import type { TrainingPlan } from '../../types/plan';
~~~~~
~~~~~typescript.new
import { ArrowRight, ChevronRight, Clock, Play, Plus, Sliders, Sparkles, Zap } from 'lucide-preact';
import { getCardById } from '../../config/cards';
import type { TrainingPlan } from '../../types/plan';
~~~~~

### 下一步建议

1. 运行 `npm run checkf` 与 `npm run build`，确认已无任何 Linter 或 TS 报错。
2. 运行 `npm run test` 确保现有单元测试通过。

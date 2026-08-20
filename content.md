已定位所有报错原因。主要包含两项 Biome Lint 的 Array Index 作为 Key 警告，以及 4 处 TypeScript 编译错误（类型缺失、未使用的变量与未使用导入）。我已准备好修复补丁计划。

## [WIP] fix: 修复 TypeScript 编译类型错误与 Biome 语法校验

### 错误分析

1. **`AbstractionCanvas.tsx`**:
   - `showToleranceBand` 在组件参数解构中声明但未被使用，触发 TS6133 错误。
   - `promptPaletteBand.map` 与 `paletteOptions.map` 直接使用循环索引 `i` / `idx` 作为 JSX `key`，触发 Biome 的 `lint/suspicious/noArrayIndexKey` 警告。
2. **`DynamicDomainSettings.tsx`**:
   - `DOMAIN_SETTING_SCHEMAS` 显式类型注解为 `Record<TrainingDomain, SettingFieldSchema[]>`，但字典缺少新增的 `abstraction` 与 `concretization` 两个域的映射定义，触发 TS2739 错误。
3. **`trainingPlugins.tsx`**:
   - 引用了 `BaseModuleSettings` 作为类型参数，但未在顶部 `import` 中导入，触发 TS2304 错误。
   - `extractRecordDetails` 中的参数 `q` 未被使用，触发 TS6133 错误。
4. **`abstractionUtils.ts`**:
   - 导入了 `hsvToHex`、`calcDeltaEOk`、`getTargetDeltaEForLevel` 和 `hsvToOkLab` 但未在该模块中被使用，触发 TS6133 与 TS6192 错误。

### 用户需求

修复 `npm run checkf` 与 `npm run build` 报出的所有类型错误与 Lint 规则违规，确保项目能够顺利通过类型检查与生产构建。

### 评论

这是模块扩展与严格类型检查环境下的常规清理工作。修正类型导入、字典补全及精细化 Key 设置有助于提升系统的稳定性与代码规范性。

### 目标

1. 清理 `src/utils/abstractionUtils.ts` 中无用的 import。
2. 补全 `src/config/trainingPlugins.tsx` 缺失的类型导入，并将未使用参数重命名为 `_q`。
3. 在 `src/components/settings/DynamicDomainSettings.tsx` 中补全所有 `TrainingDomain` 键。
4. 修复 `src/components/AbstractionCanvas.tsx` 中的 JSX Key 结构并移除未引用的解构变量。

### 基本原理

通过为 JSX 元素生成复合语义 Key（结合索引与色值参数）避免单纯索引作为 Key 的潜在重排问题；补全全局 Domain 字典以满足 TypeScript 强类型约束；清理未使用的变量与声明以满足 `noUnusedLocals` 和 `noUnusedParameters`。

### 标签

#intent/fix #flow/ready #priority/high #comp/build #concept/parser #scope/core #ai/instruct #task/domain/build #task/object/type-and-lint-errors #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复 `abstractionUtils.ts` 未使用的模块导入

移除冗余的 `colorUtils` 与 `oklchUtils` 导入。

~~~~~act
patch_file
src/utils/abstractionUtils.ts
~~~~~
~~~~~typescript
import type { Point } from '../types';
import { hsvToHex } from './colorUtils';
import { calcDeltaEOk, getTargetDeltaEForLevel, hsvToOkLab } from './oklchUtils';

export type AbstractionMode =
~~~~~
~~~~~typescript
import type { Point } from '../types';

export type AbstractionMode =
~~~~~

#### Acts 2: 修复 `DynamicDomainSettings.tsx` 缺失的 Domain 配置字段

在 `DOMAIN_SETTING_SCHEMAS` 中补充 `abstraction` 与 `concretization` 键。

~~~~~act
patch_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~
~~~~~typescript
export const DOMAIN_SETTING_SCHEMAS: Record<TrainingDomain, SettingFieldSchema[]> = {
  star: [
~~~~~
~~~~~typescript
export const DOMAIN_SETTING_SCHEMAS: Record<TrainingDomain, SettingFieldSchema[]> = {
  abstraction: [],
  concretization: [],
  star: [
~~~~~

#### Acts 3: 修复 `trainingPlugins.tsx` 类型导入与未使用参数

导入 `BaseModuleSettings` 并将未使用参数重命名为 `_q`。

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript
import type {
  ColorSenseSettings,
  NegativeSpaceSettings,
  RelativeColorSettings,
  StarSettings,
} from '../utils/settings';
~~~~~
~~~~~typescript
import type {
  BaseModuleSettings,
  ColorSenseSettings,
  NegativeSpaceSettings,
  RelativeColorSettings,
  StarSettings,
} from '../utils/settings';
~~~~~

~~~~~act
patch_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript
  extractRecordDetails: (q, hitResult, userVal, mode) => ({
    mode,
    userAnswer: userVal,
    errorValue: hitResult.errorValue,
  }),
~~~~~
~~~~~typescript
  extractRecordDetails: (_q, hitResult, userVal, mode) => ({
    mode,
    userAnswer: userVal,
    errorValue: hitResult.errorValue,
  }),
~~~~~

#### Acts 4: 修复 `AbstractionCanvas.tsx` 的 Key 绑定与未使用属性

清理未使用的 `showToleranceBand` 解构变量，并优化列表渲染的 Key。

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
export function AbstractionCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: AbstractionCanvasProps) {
~~~~~
~~~~~typescript
export function AbstractionCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
}: AbstractionCanvasProps) {
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
            {mode === 'TD_PALETTE_2AFC' && question.promptPaletteBand ? (
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                {question.promptPaletteBand.map((c, i) => (
                  <div
                    key={i}
                    className="w-12 h-12 rounded-lg border border-slate-300 shadow-inner"
                    style={{ backgroundColor: hsvToHex(...c) }}
                  />
                ))}
              </div>
~~~~~
~~~~~typescript
            {mode === 'TD_PALETTE_2AFC' && question.promptPaletteBand ? (
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                {question.promptPaletteBand.map((c, i) => (
                  <div
                    key={`prompt-band-${i}-${c.join('-')}`}
                    className="w-12 h-12 rounded-lg border border-slate-300 shadow-inner"
                    style={{ backgroundColor: hsvToHex(...c) }}
                  />
                ))}
              </div>
~~~~~

~~~~~act
patch_file
src/components/AbstractionCanvas.tsx
~~~~~
~~~~~typescript
        {/* 4 候选色块 */}
        <div className="grid grid-cols-4 gap-3 w-full">
          {question.paletteOptions?.map((hsv, idx) => {
            const isSelected = selected4AfcIdx === idx;
            const isTarget = idx === question.correctPaletteIndex;
            const hex = hsvToHex(...hsv);

            let border = 'border-slate-200';
            if (showAnswer) {
              border = isTarget
                ? 'border-emerald-500 ring-2 ring-emerald-500/40'
                : isSelected
                  ? 'border-rose-400 opacity-60'
                  : 'border-slate-200 opacity-40';
            } else if (isSelected) {
              border = 'border-indigo-600 ring-2 ring-indigo-500/30';
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={disabled || showAnswer}
~~~~~
~~~~~typescript
        {/* 4 候选色块 */}
        <div className="grid grid-cols-4 gap-3 w-full">
          {question.paletteOptions?.map((hsv, idx) => {
            const isSelected = selected4AfcIdx === idx;
            const isTarget = idx === question.correctPaletteIndex;
            const hex = hsvToHex(...hsv);

            let border = 'border-slate-200';
            if (showAnswer) {
              border = isTarget
                ? 'border-emerald-500 ring-2 ring-emerald-500/40'
                : isSelected
                  ? 'border-rose-400 opacity-60'
                  : 'border-slate-200 opacity-40';
            } else if (isSelected) {
              border = 'border-indigo-600 ring-2 ring-indigo-500/30';
            }

            return (
              <button
                key={`palette-option-${idx}-${hex}`}
                type="button"
                disabled={disabled || showAnswer}
~~~~~

### 下一步建议

1. 在执行完本次计划的变更后，重新运行 `npm run checkf` 和 `npm run build` 进行验证，确保 0 错误 0 警告通过。
2. 运行 `npm run test` 确保所有单元测试保持绿色通过。

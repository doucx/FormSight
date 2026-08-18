这是因为 Biome 开启了 `noNonNullAssertion` 校验规则，禁止直接使用 `!` 非空断言操作符。我们将使用空值合并操作符 (`?? 0`) 来替代 `!`，以同时满足 TypeScript 编译器和 Biome 的代码规范。

## [WIP] fix: 替换非空断言为默认值合并以遵循 Biome 校验规则

### 错误分析

Biome 的 `lint/style/noNonNullAssertion` 规则禁止在 TypeScript 代码中使用 `!` 操作符（Non-null Assertion），以规避潜在的未定义空指针风险。在 `negativeSpaceUtils.test.ts:69` 中使用了 `q.positiveArea!` 和 `q.negativeArea!`，触发了该规则。

### 用户需求

修复 `src/utils/__tests__/negativeSpaceUtils.test.ts` 中的 `noNonNullAssertion` Lint 错误，使代码完全符合 Biome 的严格检查。

### 评论

使用空值合并运算符（`?? 0`）是处理类型系统中可选数值字段的标准实践，既保证了数值计算时的类型收敛为 `number`，也完全避免了直接强制断言。

### 目标

将 `src/utils/__tests__/negativeSpaceUtils.test.ts` 中的 `q.positiveArea! + q.negativeArea!` 改为 `(q.positiveArea ?? 0) + (q.negativeArea ?? 0)`。

### 基本原理

通过 `?? 0` 为可选数值提供默认回退，使 TypeScript 类型检查器将两项都安全推断为 `number`，同时移除 `!` 满足 Biome `lint/style/noNonNullAssertion` 规则。

### 标签

#intent/fix #flow/ready #priority/high #comp/tests #scope/core #ai/instruct #task/domain/testing #task/object/lint-and-typecheck #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 优化测试用例断言的空值处理

使用 `?? 0` 替代 `!` 非空断言。

~~~~~act
patch_file
src/utils/__tests__/negativeSpaceUtils.test.ts
~~~~~
~~~~~typescript.old
    expect(q.positiveArea! + q.negativeArea!).toBeCloseTo(q.canvasArea, -1);
~~~~~
~~~~~typescript.new
    expect((q.positiveArea ?? 0) + (q.negativeArea ?? 0)).toBeCloseTo(q.canvasArea, -1);
~~~~~

### 下一步建议

1. 重新执行 `npm run checkf` 与 `npm run build`，确认所有校验与编译顺利通过。
2. 运行 `npm run test` 进行全量测试回归。

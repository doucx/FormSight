# ADR 0007：会话决策抽纯函数，不引入 hook 测试运行时

- 状态：已采纳（2026-11-24）
- 证据：`src/hooks/session/sessionDecisions.ts`；`viska/ledger.md` G1-16
- 相关决策：[`0002-four-generics.md`](./0002-four-generics.md)

## 背景

近 90 天的 8 条真实回归里，有 3 条只存在于 `useTrainingSession` 及其视图：

| 提交 | 故障 | 现有测试为何抓不到 |
|---|---|---|
| `0d2d6d0` | 计划训练中点返回，误弹单卡总结 | 决策分支写在 hook 的 `handleRequestFinish` 里 |
| `a909848` | 跳过阶段后总结层阶回落为 `Lvl 5` | 层阶计算写在视图与总结弹窗里 |
| `751b186` | `Escape` 与退出按钮行为不一致 | 键位映射写在 hook 的 keybinding 中 |

当前测试环境是 `environment: 'node'`，没有 `jsdom` / `@testing-library/preact`。
为这 3 条引入 hook 运行时，会改变公共测试配置，且容易把套件引向组件快照与实现细节。

## 决策

1. **把这些决策抽成无副作用纯函数**，放在 `src/hooks/session/sessionDecisions.ts`：
   - `decideFinishBranch(input)`：返回 `target-limit | early-exit | summary | exit`；
   - `computeSummaryLevels(history)`：返回 `levelBefore | levelAfter | displayLevel`；
   - `mapKeyToAction(key, state)`：返回 `next | finish | regenerate | adjust | inspector | resume | none`。
2. `useTrainingSession` 退化为**薄适配层**：只负责调用纯函数、绑定 Preact 状态与副作用
   （计时器、声音、存储）。
3. **不新增测试依赖**：3 条回归在 node 环境用纯函数直接断言；hook 本身不做渲染测试。
4. 抽取属于零行为变更重构：既有 154 条用例保持零改动；若必须改测试，说明外部行为
   已变化，立刻停止并报备（AGENTS 重构底线）。

## 代价

- 纯函数需要显式传入 hook 内的状态（`sessionType`、`targetLimitTrials`、
  `showSummaryModal`、`sessionHistory` 等），调用点会多一层参数组装。
- 偏好「测试决策、不测试副作用」意味着计时器、声音、存储写入仍无直接覆盖；
  它们由存储层与 `sound.test.ts` 分层覆盖，接受这一缺口。

## 复核条件

- `event:hook_test_runtime_adopted`：未来引入 `@testing-library/preact` 时，
  纯函数保持为唯一决策源，hook 测试只做接线冒烟；
- 或 `event:session_state_machine_rewrite`：会话状态机重写时重新评估抽取边界。

## 后果

- 3 条历史回归可以在 `pnpm verify` 的 60 s 预算内稳定运行，无需浏览器。
- 新的会话分支（如新的退出路径）必须先加到 `sessionDecisions.ts` 并配断言，
  禁止只在 hook 里加 `if`。

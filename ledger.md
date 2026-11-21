# 门账登记表 (Verification Ledger)

> 本文件是 FormSight 验证门禁生命周期的唯一信源。
> 结构规范见 viska 规范附录 B；每次新增/退役检查必须同步更新本表。

## 1. 物理基线（W1 实测，2026-11-21）

| 项目 | 实测值 | 采集方式 |
|---|---|---|
| 仓库路径 | `/home/doucx/Documents/Projects/FormSight` | `pwd` |
| 当前分支 / HEAD | `develop` / `14ad8fc` | `git branch`、`git log` |
| 近 90 天提交数 | 101 | `git log --since='90 days ago' --oneline \| wc -l` |
| 测试文件 / 用例数 | 14 / 149（W1 新增 3 条回归断言） | `vitest run` 汇总 |
| 校验入口 | `pnpm verify` = `biome check .` + `tsc --noEmit` + `vitest run` | `package.json` |
| 本地耗时（3 次，含新增用例） | 4872 ms / 4615 ms / 4458 ms（p50 ≈ 4615 ms） | `date +%s%3N` 包裹 |
| 耗时硬上限 | 60 s（红线 90 s） | 规范 §3 Gate 1 |
| 工具链 | Node v24.9.0 / pnpm 11.28.5 / Vitest 1.6.1 | `node -v`、`pnpm -v` |

基线修正记录：

- 首次执行 `pnpm check` 时 `piconfig.json` 缺失行尾换行导致 Biome 报错（代码逻辑无问题）。
  已用 `biome check --write piconfig.json` 做纯格式修复，使 `verify` 基线为绿。
- `alasa` 靶场按规范 §2 单线程规则在本周期内**不并行介入**，W1 仅挂载 FormSight。

## 2. 门账

| ID | 靶场 | 真实失败根因 | 关联守护检查 | 能力级 | 状态 | 最近运行 | 最近拦截 | 责任归属 | 退役倒计时 |
|---|---|---|---|---|---|---|---|---|---|
| G1-00 | FormSight | 无统一入口，lint / 类型 / 测试分散执行，格式漂移与类型错误可在未跑测试时漏过 | `pnpm verify`（CI: `.github/workflows/ci.yml`） | L3 | open | 2026-11-21 | - | agent | 核心入口（永驻） |
| G1-01 | FormSight | 训练计划加载时残留已删除卡片的 `cardId`，悬空阶段导致训练页崩溃（修复提交 `fb1931b`） | `src/storage/__tests__/planStorage.test.ts::#plan_storage_sanitize` | L2 | open | 2026-11-21 | - | agent | 核心契约（永驻） |

> 状态定义：`open` = 检查已就绪、尚未在真实开发中拦截过违规改动；
> `closed` = 已至少成功拦截一次；`retired` = 已安全移除并记录原因。

## 3. W1 启动记录

### 3.1 极速入口（`pnpm verify`）

- `package.json` 新增脚本：
  `"verify": "biome check . && tsc --noEmit && vitest run"`。
- 保留原 `check` / `test` 脚本不变，避免破坏既有本地习惯。
- 连续 3 次执行全部 `exit 0`，用例数稳定为 149，无 Flake（4.46 s–4.87 s，p50 ≈ 4.62 s）。

### 3.2 远端 CI

- 新增 `.github/workflows/ci.yml`：`push`（main/develop）与 `pull_request` 触发；
  固定 pnpm 9 + Node 20；执行 `pnpm install --frozen-lockfile` 后运行 `pnpm verify`。
- 与既有 `deploy.yml`（tag 触发部署）职责分离，互不覆盖。

### 3.3 代理协作规范

- 新增根目录 `AGENTS.md`：完工必跑 `pnpm verify`、严禁改测试变绿 / `skip` /
  `--no-verify`、Bug 修复先红后绿、重构零测试改动、60 s 时延保护、
  四层归因漏斗、门账同步。

### 3.4 第一条真实回归（G1-01）

- 来源提交：`fb1931b fix: 实现训练计划加载时的失效卡片自愈清洗机制`。
- 父提交：`fb1931b^`（清洗逻辑尚未存在）。
- 验证步骤与结果：

| 步骤 | 代码版本 | 命令 | 结果 |
|---|---|---|---|
| 1 | 修复提交 `fb1931b`（当前 HEAD） | `pnpm exec vitest run src/storage/__tests__/planStorage.test.ts` | ✅ 3 passed |
| 2 | 父提交 `fb1931b^` 的 `src/storage/planStorage.ts` | 同上 | ❌ 2 failed / 1 passed，退出码 1 |
| 3 | 恢复修复版本 | 同上 | ✅ 3 passed |

父提交上的失败输出（摘录）：

```text
AssertionError: expected [ 'star_single', …(2) ] to deeply equal [ 'star_single', 'color_hue' ]

- Expected
+ Received

  Array [
    "star_single",
+   "card_removed_in_future_release",
    "color_hue",
  ]
 ❯ src/storage/__tests__/planStorage.test.ts:64:52
```

断言覆盖三条边界：

1. 加载计划时过滤未注册卡片的阶段（核心回归）；
2. 清洗结果回写 IndexedDB，避免每次加载重复清洗；
3. 全部卡片有效时保持计划原样（不误清洗、不篡改 `updatedAt`）。

## 4. 变更清单（W1）

| 文件 | 类型 | 说明 |
|---|---|---|
| `package.json` | 修改 | 新增 `verify` 脚本 |
| `piconfig.json` | 格式修复 | 补行尾换行，使 Biome 基线为绿 |
| `.github/workflows/ci.yml` | 新增 | Push / PR 阻断式 CI |
| `AGENTS.md` | 新增 | 代理执行军规 |
| `src/storage/__tests__/planStorage.test.ts` | 新增 | 3 条回归断言（来源 `fb1931b`） |
| `ledger.md` | 新增 | 本门账 |

## 5. 待办（进入 W2 前）

- [ ] 将上述改动作为独立提交合入 `develop`，并在远端确认 CI 首次运行结果。
- [ ] W2：从近 90 天 `fix:` 提交中提取 8 个故障场景，按“父提交报红 → 修复提交变绿”补齐回归。
- [ ] 累计测试数达到 Gate 1 准出要求（新增 ≥ 13 条：8 回归 + 5 契约）。
- [ ] 真实开发中至少 1 次 Agent 改动被 `pnpm verify` 或 CI 拦截（G1-00 / G1-01 转 `closed`）。

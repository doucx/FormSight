# 门账登记表 (Verification Ledger)

> 本文件是 FormSight 验证门禁生命周期的唯一信源。
> 门账结构、状态机与观测点规则见 [viska/README.md](./README.md#5-门账规范)；
> 本文件只记录状态，不存放本机路径、精确耗时或工具版本。

## 1. W1 实测摘要（公开安全）

| 项目 | 值 |
|---|---|
| 靶场 | FormSight（单线程，本周期只挂载此仓库） |
| 观测点 | `n1 / 2026-11-21 / 本地` |
| 测试文件 / 用例数 | 14 / 149（W1 新增 3 条回归断言） |
| 校验入口 | `pnpm verify` = `biome check .` + `tsc --noEmit` + `vitest run` |
| 本地耗时 | 连续 3 次 `exit 0`，p50 < 5 s，无 Flake |
| 时延上限 | 60 s（硬红线 90 s） |

> 本机绝对路径、精确耗时与工具链版本见 `viska/local/baseline.md`（gitignore，不进入公开仓库）。

## 2. 门账

| ID | 靶场 | 真实失败根因 | 关联守护检查 | 能力级 | 状态 | 最近运行 | 最近拦截 | 责任归属 | 退役倒计时 |
|---|---|---|---|---|---|---|---|---|---|
| G1-00 | FormSight | 无统一入口，lint / 类型 / 测试分散执行，格式漂移与类型错误可在未跑测试时漏过 | `pnpm verify`（CI: `.github/workflows/ci.yml`） | L3 | open | 2026-11-21 | - | agent | 核心入口（永驻） |
| G1-01 | FormSight | 训练计划加载时残留已删除卡片的 `cardId`，悬空阶段导致训练页崩溃（修复提交 `fb1931b`） | `src/storage/__tests__/planStorage.test.ts::#plan_storage_sanitize` | L2 | open | 2026-11-21 | - | agent | 核心契约（永驻） |
| G1-02 | FormSight | 架构坏味道脚本对任意告警硬编码 `hasError = true`，30 处咨询级告警与真实类型欺骗同为退出码 1，无法接门禁；测试代码中的断言还会逼迫改既有用例 | `pnpm verify`（`scripts/check-ts-smells.mjs` 阻断子集，生产代码双重断言已清零）+ `scripts/__tests__/check-ts-smells.test.ts` | L2 | open | 2026-11-24 | - | agent | 90天无红 |
| G1-03 | FormSight | 备份导入只校验 `appName` 与数组形状：非法元素的同步 `DataError` 不会中止已排队的 `clear()`，导入返回失败但 7 张表已被清空（ADR 0005） | `src/storage/__tests__/importExport.test.ts`（校验器 + 失败零副作用） | L2 | open | 2026-11-24 | - | agent | 核心契约（永驻） |

> 状态定义：`open` = 检查已就绪、尚未在真实开发中拦截过违规改动；
> `closed` = 已至少成功拦截一次；`retired` = 已安全移除并记录原因。

## 3. W1 启动记录

### 3.1 极速入口（`pnpm verify`）

- `package.json` 新增脚本：
  `"verify": "biome check . && tsc --noEmit && vitest run"`。
- 保留原 `check` / `test` 脚本不变，避免破坏既有本地习惯。
- 连续 3 次执行全部 `exit 0`，用例数稳定为 149，无 Flake。

### 3.2 远端 CI

- 新增 `.github/workflows/ci.yml`：`push`（main/develop）与 `pull_request` 触发；
  固定 pnpm 9 + Node 20；执行 `pnpm install --frozen-lockfile` 后运行 `pnpm verify`。
- 与既有 `deploy.yml`（tag 触发部署）职责分离，互不覆盖。

### 3.3 代理协作规范

- 新增根目录 `AGENTS.md`：完工必跑 `pnpm verify`、严禁改测试变绿 / `skip` /
  `--no-verify`、Bug 修复先红后绿、重构零测试改动、60 s 时延保护、
  四层归因漏斗、门账同步、公开仓库隐私规则。

### 3.4 第一条真实回归（G1-01）

- 来源提交：`fb1931b fix: 实现训练计划加载时的失效卡片自愈清洗机制`。
- 父提交：`fb1931b^`（清洗逻辑尚未存在）。
- 验证步骤与结果：

| 步骤 | 代码版本 | 命令 | 结果 |
|---|---|---|---|
| 1 | 修复提交 `fb1931b` | `pnpm exec vitest run src/storage/__tests__/planStorage.test.ts` | ✅ 3 passed |
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

## 4. W1.1 验证资产迁移

- 门账从仓库根目录迁入 [`viska/ledger.md`](./ledger.md)，根目录不再保留验证资产。
- 新增 [`viska/README.md`](./README.md)：自洽的门模型、门账规范、红绿协议与隐私规则。
- 新增 [`viska/baseline.example.md`](./baseline.example.md)：机器基线模板；
  本机实测写入 `viska/local/baseline.md`（gitignore）。
- 根 `.gitignore` 增加 `.quipu/`、`o.md`、`viska/local/`、`viska/packets/`，
  防止本机会话数据与生成物误提交。
- `AGENTS.md` 保留在根目录，门账引用更新为 `viska/ledger.md`。

## 5. 变更清单（W1 / W1.1）

| 文件 | 类型 | 说明 |
|---|---|---|
| `package.json` | 修改 | 新增 `verify` 脚本 |
| `piconfig.json` | 格式修复 | 补行尾换行，使 Biome 基线为绿 |
| `.github/workflows/ci.yml` | 新增 | Push / PR 阻断式 CI |
| `AGENTS.md` | 新增 | 代理执行军规 |
| `src/storage/__tests__/planStorage.test.ts` | 新增 | 3 条回归断言（来源 `fb1931b`） |
| `viska/README.md` | 新增 | 自洽验证系统说明 |
| `viska/ledger.md` | 迁移 | 本门账（公开安全版本） |
| `viska/baseline.example.md` | 新增 | 本机基线模板 |
| `viska/.gitignore` | 新增 | 忽略 `local/`、`packets/` |
| `.gitignore` | 修改 | 忽略 `.quipu/`、`o.md`、`viska/local/`、`viska/packets/` |

## 6. 待办（进入 W2 前）

- [x] 推送 W1 / W1.1 提交，并在远端确认 `Verify` workflow 首次运行结果。
- [ ] W2：从近 90 天 `fix:` 提交中提取 8 个故障场景，按“父提交报红 → 修复提交变绿”补齐回归。
- [ ] 累计测试数达到 Gate 1 准出要求（新增 ≥ 13 条：8 回归 + 5 契约）。
- [ ] 真实开发中至少 1 次 Agent 改动被 `pnpm verify` 或 CI 拦截（G1-00 / G1-01 转 `closed`）。

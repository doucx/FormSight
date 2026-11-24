# 脱敏规范

本目录是 **tracked** 的（公开仓库）。原始 trial、绝对路径、个人日程不进这里。
本文件是提交前的检查依据。

## 1. 允许进入 tracked 计划

- 决策、理由、重审触发条件；
- 路线图、gate、会话 ID（`S00`、`G1`）；
- 卡片状态、计数、覆盖率、族分类；
- 聚合指标（Brier、MAE、通过率）；
- 每卡 JND / Level 估计（若你接受公开个人训练表现；否则只放区间/状态，精确值放本地）；
- 数据集 hash、schema、版本号；
- 占位符：`<DATASET_JSON>`、`<WORKSPACE>`。

## 2. 只能放 `viska/local/calibration/`（gitignored）

- 原始 JSON、逐题记录、误差分布明细；
- 绝对路径、主机名、用户名；
- 个人日程、疲劳/健康备注；
- 含个人信息的截图；
- 中间产物、临时脚本输出。

## 3. 永远不要进仓库

- 邮箱、Token、API Key、私钥、SSH 别名、IP；
- `formsight_data_*.json`（`.gitignore` 已覆盖，但不要依赖它兜底）；
- 任何能直接定位到个人的机器信息。

## 4. 提交前检查

```bash
# 1. 绝对路径 / 用户目录
grep -RInE '(^|[/ ])/(home|Users)/|[A-Z]:\\\\' docs/plan || true

# 2. 常见密钥/邮箱形态
grep -RInE --exclude=PRIVACY.md 'sk-|ghp_|@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' docs/plan || true

# 3. 确认没有把数据集/大文件带进来
git status --short
git diff --cached --stat
```

后续可加 `scripts/check-plan-privacy.mjs` 到 `pnpm verify`；脚本本身也是 tracked 代码，需单独评审。

## 5. 占位符约定

| 占位符 | 含义 |
|---|---|
| `<DATASET_JSON>` | 2026-11-24 导出的原始 JSON（仓库外） |
| `<WORKSPACE>` | 本地仓库根 |
| `<CALIB_DIR>` | 本地原始校准区 |

不要用真实路径替换占位符后再提交。

## 6. 如果误提交

1. 不要只在新 commit 里删除；历史仍可见；
2. 立刻停止 push；
3. 评估泄露范围（Token 立即轮换）；
4. 用 `git filter-repo` 或重写历史清除；
5. 在 `01_decisions.md` 追加一条事故记录（不含敏感值）。

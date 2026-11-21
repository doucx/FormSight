---
# 复制本文件为 viska/local/baseline.md 后填写。
# local/ 已被 .gitignore 忽略，不会进入公开仓库。
node: n1                       # 公开假名；真实机器名只写在 local
machine: <hostname>            # 仅本地
observed_at: 2026-11-21T16:46:23+08:00
repo_path: /path/to/FormSight  # 仅本地
toolchain:
  node: <node-version>
  pnpm: <pnpm-version>
  vitest: <vitest-version>
---

# 本机验证基线（模板）

## 1. 身份与观测点

| 项目 | 值 |
|---|---|
| 公开节点假名 | `n1` |
| 真实机器 | `<hostname>` |
| 观测时间 | `2026-11-21T16:46:23+08:00` |
| 仓库绝对路径 | `/path/to/FormSight` |

## 2. verify 实测

| 运行 | 退出码 | 耗时 |
|---|---:|---:|
| 1 | 0 | `___ ms` |
| 2 | 0 | `___ ms` |
| 3 | 0 | `___ ms` |

- p50：`___ ms`
- 用例：`___ passed`
- Flake：`0`

## 3. 工具链

```text
Node    <version>
pnpm    <version>
Vitest  <version>
OS      <os>
```

## 4. 本机特有事实

> 只写会影响判断的内容：路径、缓存、时区、资源限制、CI 本地差异。
> 不抄 `lscpu` 全文，不写密码、Token、SSH 私钥。

- 时区：`Asia/Shanghai (+08:00)`
- `<其他>`

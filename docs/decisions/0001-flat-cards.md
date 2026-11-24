# ADR 0001：卡片平铺为一等公民，废除 Pack / 域分组层

- 状态：已采纳（2026-09-01）
- 取代：2026-08-22 的 v0.4.0 Pack 本体、2026-08-31 的 `src/modules/<domain>/<Card>/ + _shared/` 方案
- 证据：提交 `8fcd79d`（migrate from pack architecture to self-contained flat card manifests）；现行目录 `src/cards/*/`

## 背景

早期架构有三层：Domain（4 类）→ Mode（每类 3~4 个）→ Plugin（单体 `switch`）。卡片数量增长后暴露出三个问题：

1. 一张卡只能属于一个 Domain，但实际卡片天然跨域（负形记忆同时属于负形、记忆、2AFC）。
2. `PackManifest` 混合了三种职责：产品分类、架构插件、物理目录。
3. 每加一张卡要改路由、生成器、判定器多个中心文件，形成上帝对象。

## 决策

**卡片是唯一一等公民，目录平铺在 `src/cards/<card_id>/`。**

- 一张卡的全部声明（元数据、多语言、出题、判定、渲染、分析）落在一个目录。
- 注册表用 `import.meta.glob` 自动发现，无需中心清单。
- 允许卡片之间出现重复代码与重复文案；**自洽性优先于 DRY**。

## 备选与被否决

| 备选 | 否决理由 |
|---|---|
| 保留 `src/packs/`，只做局部清理 | pack 仍是强制的唯一父节点，与多标签冲突 |
| `src/modules/<domain>/<Card>/` + `_shared/` | 试点后判定"保留了类似 packs 的层级"：`_shared` 重新承担共享职责，删卡/移卡要同步改共享代码 |
| 一个 `cards.ts` 中心注册表 | 仍要手改中心文件，且与自动发现重复 |

## 代价

- `src/cards/` 下 33 个目录平铺，IDE 里靠搜索与标签而非目录树导航。
- 跨卡重复的数学与文案需要人工同步（接受）。
- "零核心改动"只对**加卡**成立；加标签值、加域仍要改内核（见 `architecture.md` §6）。

## 复核条件

满足任一条即重新评估：

- `src/cards/` 下出现分组目录，或有人提交 `_shared` / `packs` 结构；
- 同一 helper 被复制进 3 张以上卡片且需要同步修改；
- 卡片数超过 60，`eager` glob 的启动成本可见（例如首屏明显变慢）。

## 后果

- `src/types/card.ts`、`src/core/cardContract.ts`、`src/config/tags.ts` 成为稳定契约面。
- 新增卡片的人只需要读 `docs/card-design-spec.md` 与一个相邻卡片目录。

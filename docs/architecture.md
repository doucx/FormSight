# 卡片架构：一等公民、平铺目录与边界

> 状态：现行（对应 v0.6.x）
> 读者：新增卡片的贡献者、编码代理、架构评审
> 相关决策记录：[`decisions/0001-flat-cards.md`](./decisions/0001-flat-cards.md)、[`decisions/0002-four-generics.md`](./decisions/0002-four-generics.md)

本文描述 FormSight 的宿主—卡片关系。**结论以代码为准**；本文解释代码为什么长这样，以及哪些看起来"可以优化"的地方其实是刻意保留的。

## 1. 卡片是一等公民

一张卡片的全部声明落在一个目录里：

```
src/cards/<card_id>/
├── index.tsx          CardManifest：id / domain / tags / locales / engine / ui / analytics
├── <Name>View.tsx     该卡片专属画布与交互
├── analytics.tsx      该卡片专属分析视图（可选）
├── types.ts           QuestionData / HitResult / AnswerValue（可选）
├── utils/
│   ├── generator.ts   出题与判定，纯函数
│   └── ...
├── locales/
│   ├── zh-CN.json
│   └── en-US.json
└── __tests__/
```

约定：

- 目录名即 `card.id`，全局唯一。
- 含 JSX 的文件必须是 `.tsx`。
- 卡片之间**允许重复**：同一段数学、同一份文案可以各存一份。**重复优于错误的共享抽象**，这是 2026-09-01 的明确取舍。
- 删除一张卡 = 删除目录；新增一张卡 = 新建目录。**不需要改任何卡片之外的文件**（新增"域"或"标签值"除外，见 §6）。

为什么不是"按域分组"：见 [`decisions/0001-flat-cards.md`](./decisions/0001-flat-cards.md)。两轮分组尝试（`src/packs/`、`src/modules/<domain>/<Card>/ + _shared/`）都让"删一张卡要动共享目录"，等于把 pack 的所有权倒置搬了回来。实际工作流是一张一张新建，不是批量发包。

## 2. CardManifest：五段契约，四个泛型

```ts
export interface CardManifest<TQuestion, THitResult, TAnswerVal, TSettings> {
  id: string;
  domain: VisualDomainTag;
  tags: CardTags;
  defaultSettings?: Partial<TSettings>;
  locales?: { 'zh-CN': ...; 'en-US': ... };
  engine: CardEngineContract<...>;   // 纯计算：出题 / 判分 / 提取记录
  ui: CardUIContract<...>;           // 表现：icon / renderCanvas / renderSettings
  analytics?: { views: CardAnalyticsView[]; fetchRecords?: ... };
}
```

- `engine` 只做计算，不 import Preact；`ui` 只做渲染。两者同居一个 manifest，不是两个物理层。
- **不做 `domain.ts` / `view.ts` 物理拆分，不做 headless 纯化**。收益（Worker 批量预生成、无头单测）是假想敌：生成器本来就是 `utils/` 下的纯函数，单题毫秒级。代价是 core 允许依赖 Preact（`core/i18n.ts` 的 `useEffect`、`core/analytics/*.tsx`），这是**已知且接受**的瑕疵。
- **只有 4 个泛型**，不设第 5 个 `TDetails`。每张卡的 `details` 形状由该卡 `analytics.tsx` 的私有接口 + 入口断言收窄，因为内核（自适应、存储、备份）从不消费 details。详见 [`decisions/0002-four-generics.md`](./decisions/0002-four-generics.md)。

## 3. 注册、发现与检索

- `src/core/registry.ts` 用 `import.meta.glob('../cards/*/index.tsx', { eager: true })` 自动发现，按 `card.id` 注册。
- 注册时自动推导能力标签：`ui.renderSettings` 是否存在 → `has_settings` / `no_settings`；`analytics.views` 是否非空 → `has_analytics` / `no_analytics`。**这两类标签禁止手写**，手写必漂移。
- 倒排索引服务于筛选与检索；同一维度多值取并集，跨维度取交集。
- 卡片词典以相对 key 存放，注册时由 `qualifyCardKey` 补全 `cards.<id>.` 前缀；`useCardTranslation` 对 `cards.` / `common.` 前缀短路，卡片不需要第二个翻译实例。

## 4. 标签是封闭的四维分类

`tag` 不是自由字符串，而是 `src/types/card.ts` 中的封闭联合：

| 维度 | 作用 | 示例 |
|---|---|---|
| `domain` | 看的是什么介质 | `form_and_proportion`、`color_and_value` |
| `path` | 大脑按什么方向处理 | `extraction`、`concretization`、`absolute_estimation`、`relational_mapping` |
| `challenge` | 在对抗哪种本能 | `illusion_piercing`、`figure_ground_reversal`、`working_memory` |
| `interaction` | 怎么作答 | `continuous_mod`、`spatial_locate`、`binary_choice`、`multi_choice` |

外加 `status`（stable / experimental / …）与自动推导的 `feature`。

封闭集合的代价是刻意的摩擦：**新标签值要改 `src/types/card.ts`、`src/config/tags.ts`、两份 locale**，筛选矩阵与 i18n 才能穷举。反例：旧的 `target` / `skill` 双轴把 `abstraction` 同时标成目标和技能，筛选器无法互斥。

现状：少数卡片在 `path` 上是多值（如 `fractal_edge_roughness`、`star_double_h/r`）。渲染与筛选按并集处理；如果"认知路径"筛选因此出现歧义，那是重新设计分类法的信号，不是加一个 `path` 特例的理由。

## 5. 边界：宿主与卡片之间的防腐层

- 卡片只能通过 `@formsight/card-sdk` 引用宿主能力，禁止 `../../../` 越出 `src/cards`。SDK 是门面，别名是防腐层：卡片目录可整体移动、生成、外包。
- `core` 依赖 Preact 是**单向的**；卡片不得反向依赖另一个卡片的内部文件。
- 新增卡片不应修改 `src/core/`、`src/storage/`、`src/views/`。

**这条边界目前没有 CI 守卫**：`scripts/check_imports.py` 只检查相对导入能否解析，不检查是否越界；`pnpm verify` 不运行它。见 §7。

## 6. 改动成本矩阵

| 改动 | 需要修改 | 是否零核心改动 |
|---|---|---|
| 新增一张卡 | `src/cards/<new>/` | ✅ |
| 删除一张卡 | 删除该目录 | ✅ |
| 新增一个标签值 | `types/card.ts` + `config/tags.ts` + 两份 locale | ❌ |
| 新增一个视觉域 | 上述 + `DiscoveryView` 的 `DOMAIN_ORDER` / 图标映射 | ❌ |
| 新增一个官方计划 | `src/config/plans/` 下新增预设 | ✅ |
| 新增一个通用分析视图 | `src/core/analytics/universalViews.tsx` | ❌ |

"卡片可无限扩展、域保持克制"是这个架构的隐含契约。如果你发现自己在为"新域"设计通用机制，先确认不是又在造 pack。

## 7. 已否决的方案（不要重提）

| 方案 | 结局 | 否决理由 |
|---|---|---|
| `src/packs/` + `PackManifest` | 2026-09-01 删除（`8fcd79d`） | 一张卡被强制归属一个 pack，与多标签冲突；pack 过滤条与标签过滤语义重复 |
| `src/modules/<domain>/<Card>/ + _shared/` | 试点后回退 | `_shared` 重新承担 pack 职责；删卡/移卡仍需改共享代码 |
| Schema 驱动动态设置表单 | 废弃 | 卡片专属字段污染通用 schema；动态 key 绕开 i18n 静态扫描 |
| `Standard*View` 通用布局包装器 | 删除 | 抽象漏水（`preview` / `gridClassName`），真实能力只有键盘绑定，已下沉为 Hook |
| `key={dataVersion}` 强制重挂刷新 | 替换为 signals | 整屏重挂，滚动与表单态丢失 |
| Nx / Turborepo monorepo | 未采用 | 构建配置成本高于收益；单包 + 别名已能隔离 |
| 90 天冷数据修剪（prune） | 删除 | 把分析主数据当可丢弃负载，导致图表白屏 |

完整论证见 `decisions/` 与 `data-engine.md`。

## 8. 已知债务与关闭条件

| 债务 | 现状 | 关闭条件 |
|---|---|---|
| `UnifiedTrialRecord.details` 类型黑洞 | `details?: Record<string, unknown>` + `[key: string]: unknown`，下游靠 `as` 断言 | 判别联合或每卡 `RecordDetails` 校验器落地；`rg "as \[" src/core/canvas/charts` 无输出 |
| 架构检查脚本未全部门禁 | `check-ts-smells` 已接入 `pnpm verify`：阻断子集（生产代码双重断言）为 0，31 处咨询（类型黑洞 / 巨型联合 / 测试代码中的 ERROR）仅报告；`audit-card-i18n` 当前崩溃；`check_imports` 只查可解析性 | `audit-card-i18n` 与 `check_imports` 完成分流并接入 `pnpm verify` |
| 斜线投影逻辑重复 | `persp_prop_division` / `persp_prop_migration` 各写一份 | 抽共享纯函数且有测试 |
| 颜色生成仍是拒绝采样 | 触顶时可能输出越界或低彩度题 | 改为参数区间解析采样，附种子化断言 |
| 画布图表文案残留硬编码 | 多数已改参数注入 | 绘制函数不再读取词典单例 |

## 9. 检查方式

```bash
pnpm verify      # biome check . && tsc --noEmit && node scripts/check-ts-smells.mjs && vitest run
pnpm check:arch  # 单独查看架构坏味道阻断 / 咨询子集
```

`pnpm verify` 运行 `scripts/check-ts-smells.mjs`，但只有生产代码中的双重断言（阻断子集）会让它返回非 0；类型黑洞、巨型联合与测试代码中的断言属于咨询子集，只报告不阻断。`scripts/` 下的其余架构脚本（`audit-card-i18n`、`check_imports`）尚未接入，本文对应的边界约束仍属于"约定"，评审时按本文人工检查；写入 HAP 的约束记录用 anchor 指向本文与对应代码面。

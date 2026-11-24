# 卡片设计规范

> 状态：现行（对应 v0.6.x）
> 读者：新卡作者、编码代理
> 前置阅读：[`architecture.md`](./architecture.md)、[`training-methodology.md`](./training-methodology.md)

本文是"写一张新卡"的检查表。它只写代码里看不出来的部分；接口签名以 `src/core/cardContract.ts` 与 `@formsight/card-sdk` 为准。

## 1. 新建一张卡

```
src/cards/<card_id>/
├── index.tsx        # CardManifest
├── <Name>View.tsx   # 画布与交互
├── analytics.tsx    # 可选：专属分析
├── types.ts         # QuestionData / HitResult / AnswerValue
├── utils/generator.ts
├── locales/{zh-CN,en-US}.json
└── __tests__/generator.test.ts
```

验收：

```bash
pnpm verify
pnpm exec vitest run src/cards/<card_id>
```

不需要改 `src/core/`、`src/storage/`、`src/views/`。如果必须改，说明你要么发现了真实的内核缺口，要么在造 pack——先停下来确认是哪一种。

## 2. manifest 五段

```ts
export const myCard: CardManifest<QuestionData, HitResult, AnswerValue, MySettings> = {
  id: 'my_card',
  domain: 'color_and_value',
  tags: { path: ['absolute_estimation'], challenge: ['illusion_piercing'], interaction: ['continuous_mod'] },
  defaultSettings: { ... },
  locales: { 'zh-CN': zhCN, 'en-US': enUS },
  engine: { generateQuestion, evaluateAnswer, isHit, getQuestionLevel, extractRecordDetails },
  ui: { icon, renderCanvas, renderSettings },
  analytics: { views: [...] },   // 可选
};
```

- `engine` 必须是纯函数，**不得 import Preact / lucide / 任何 UI**。
- `ui.renderCanvas` 只负责渲染与事件上抛，不做出题决策。
- `details` 的形状由本卡 `analytics.tsx` 私有接口定义；`extractRecordDetails` 返回的对象要能被该接口消费。

## 3. i18n 契约

- 每卡自带 `locales/zh-CN.json` 与 `en-US.json`，键是**相对的**，注册时自动补 `cards.<id>.`。
- 允许的键：`title`、`desc`、`instruction`、`hint`、`hint_<stage>`、`promptTitle`、`label*`、`option*` 等卡片自有语义。
- 禁止同义键堆叠（例如同时有 `hint` 和 `tip`、`prompt` 和 `instruction`）；`src/cards/__tests__/locales-schema.test.ts` 与 `scripts/audit-card-i18n.mjs` 会检查别名与对称性。
- 跨卡重复文案是允许的。**不要**为了 DRY 抽公共词典——翻译交付与"复制目录即新卡"的收益更大。
- 绘制函数（Canvas）不得自己查词典；文案由调用方以参数注入。

## 4. 确定性真值

每张卡的正确答案必须可程序化计算，且可复现：

| 卡片类型 | 真值来源 |
|---|---|
| 几何 / 比例 / 角度 | 构造参数直接算 |
| 势线 / 折线概括 | PCA 主轴、RDP 简化 |
| 黑白归组 | Otsu 阈值 |
| 主调色群 | OKLab 空间面积加权质心 |
| 色差类 | OKLab ΔE |

禁止"随机生成题目再人工标注真值"。禁止用 `Math.random()` 拼 `id`；需要唯一 id 时走统一工具。

## 5. 干扰项生成

干扰项决定题目能不能被"作弊策略"刷掉。已记录的两条死路：

1. **轴对齐 L 偏移**：干扰项与目标同色相、只是更暗 → 用户学会"选更暗的那个"即可 100% 命中。
2. **独立球面采样**：以目标为球心采样 → 目标成为几何重心/平均色 → 用户学会"选平均色"。

现行方案（相对色感类）：**正四面体等距顶点 + 随机旋转**，无中心点；配合色域边距检测：

- 每个顶点先用 `hasGamutMargin(lab, R)` 检查是否在 sRGB 内且有余量，不合格就沿 6 个正负轴重采样。
- 直接 `clamp` 越界顶点会把四面体拍扁成薄片：高彩度目标下四个选项 S≈100%，题目退化为瞎猜。

验收断言（建议补进生成器测试）：

- 任意两选项的 ΔE 与 R 的偏差在容差内；
- 不存在同色相对；
- 高彩度目标（如 HSV 329,97,78）下最小两两 ΔE ≥ 0.7R。

## 6. 难度参数

- 难度只通过 **Level 1–35** 表达，禁止在题目接口里传像素、HSV 原值或"百分比容差"。
- 每卡最多缩放 4 个参数（容差、曝光时长、噪声、结构相似度）。禁止逐级写死 35 套配置。
- 感知有效性优先：低饱和/低明度不能出色相题；贴色域边界的题不出；负形比例落在合法区间内。

## 7. 反馈与提示

- 提示文字只能由 `QuestionCardShell` 渲染。`showCanvasHints = false` 时，任何卡片都不得出现引导文字；历史上多张卡在这里泄漏过。
- 答题后的反馈必须：单行、在约 0.5s 内可读、**不得销毁触发它的控件**（按钮消失会造成 layout shift）。
- 正确/错误不能只靠声音传达，必须有视觉通道。
- 答题后不再展示用户不会读的中间数值。
- 触控目标与放大镜（`usePointLoupe`）必须覆盖移动端；桌面快捷键提示在触屏上不要显示。

## 8. 分析视图

- 有专属图表 → 在 `analytics.views` 注册；没有 → 自动获得 `no_analytics` 能力标签，这是可查询的待办清单，不是缺陷。
- 通用指标（SAT、难度瓶颈等）由 `src/core/analytics/universalViews.tsx` 统一追加，**不要在单卡里重复实现**。
- 分析层读取 `details` 时必须容忍历史数据缺失（旧记录可能没有新字段），缺失时降级而非抛错。

## 9. 提交流程

1. 先写一条能精准报错的最小复现测试（若修 Bug）。
2. `pnpm verify` 全绿。
3. 若本次引入了一个**后续不能撤销的设计取舍**，同步写 `docs/decisions/` 与一条 HAP 记录（见 `AGENTS.md`）。
4. 若本次只是一次性打磨，不写记录。

# 数据字典

只描述校准会用到的字段与单位；完整 DB schema 见 `src/storage/db/schema.ts`。
原始导出在仓库外，占位符 `<DATASET_JSON>`。

## 1. 顶层结构

| 字段 | 类型 | 说明 |
|---|---|---|
| `appName` | string | `FormSight` |
| `version` | number | 导出格式版本；当前 4 |
| `exportAt` | string | ISO 时间 |
| `settings` | object | 全局/每卡设置 |
| `trainingPlan` | object | 当前计划 |
| `planStorageState` | object | 计划持久化状态 |
| `sessions` | array | 训练/基准 session |
| `profiles` | array | 每卡当前/最佳 level |
| `dailySummaries` | array | 日聚合 |
| `records` | array | 逐题记录 |

## 2. `records[]`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 记录 ID |
| `sessionId` | string | 所属 session |
| `cardId` | string | 当前或旧 cardId |
| `domain` | string | 旧 domain 可能是 `abstraction` / `perspective` / `negative_space` / `color` |
| `timestamp` | number | epoch ms |
| `difficultyLevel` | number | 1–35 的整数；**不是物理强度** |
| `isHit` | boolean | 该卡自己的判定 |
| `responseTimeMs` | number | 反应时 |
| `details` | object? | 物理细节；旧记录可能缺失 |

## 3. `sessions[]` / `profiles[]` / `dailySummaries[]`

| 类型 | 关键字段 |
|---|---|
| session | `id`, `cardId`, `domain`, `type` (`training`/`benchmark`), `startTimestamp`, `endTimestamp`, `totalTrials`, `hitTrials`, `startLevel`, `endLevel` |
| profile | `cardId`, `domain`, `currentLevel`, `bestLevel`, `totalTrials`, `totalHits`, `updatedAt` |
| dailySummary | `id`, `date`, `cardId`, `domain`, `totalCount`, `hitCount`, `totalTimeMs`, `maxLevel`, `minLevel`, `lastLevel` |

注意：`profiles[].currentLevel` 是算子平衡点，不是 80% JND（D-001）。

## 4. `details` 字段（当前 33 张卡）

| 卡 | `details` 键 |
|---|---|
| color_hue | `targetHSV`, `userHSV`, `errorValue` |
| color_val | `targetHSV`, `userHSV`, `errorValue` |
| color_sat | `targetHSV`, `userHSV`, `errorValue` |
| color_all | `targetHSV`, `userHSV`, `errorValue`, `deltaEError` |
| color_lightness | `targetHSV`, `targetL`, `truthPercentage`, `userValue`, `errorValue` |
| rel_vector_shift | `colorA`, `colorB`, `colorC`, `targetD`, `userD`, `deltaEError`, `mode` |
| rel_hue_induction | `bgLeft`, `bgRight`, `targetLeftCenter`, `idealRightCenter`, `userRightColor`, `deltaEError`, `options`, `correctIndex`, `mode` |
| rel_lightness_induction | 同上（不含 `options` 时为一维滑块） |
| rel_decontextual_2afc | `userChoice`, `correctChoice`, `physicalValueDiff`, `mode` |
| abs_palette_clustering | `userAnswer`, `errorValue`, `correctIndex`, `mode` |
| abs_td_palette_4afc | `userAnswer`, `correctIndex`, `errorValue` |
| abs_notan_threshold | `userAnswer`, `errorValue`, `targetValue`, `mode` |
| abs_gesture_axis | `userAnswer`, `errorValue`, `targetValue`, `mode` |
| abs_polygon_decimation | `userAnswer`, `errorValue`, `correctChoice`, `mode` |
| abs_td_gesture_2afc | `userAnswer`, `errorValue`, `correctChoice`, `mode` |
| abs_td_hull_2afc | `userAnswer`, `errorValue`, `correctChoice`, `mode` |
| abs_td_notan_2afc | `userAnswer`, `errorValue`, `correctChoice`, `mode` |
| fractal_edge_roughness | `targetH`, `userH`, `errorValue`, `signedBias` |
| neg_area_comparison_2afc | `userChoice`, `correctChoice`, `negRatioA`, `negRatioB`, `areaDeltaPercent`, `errorValue`, `mode` |
| neg_ratio_estimation | `targetNegativeRatio`, `userRatio`, `errorValue`, `positiveArea`, `negativeArea` |
| neg_shape_match_2afc | `userChoice`, `correctChoice`, `displayTimeMs`, `errorValue`, `mode` |
| neg_vertex_fitting | `targetVertexIndex`, `targetPoint`, `userClick`, `errorPixelDistance`, `mode` |
| angle_parallel_2afc | `userAnswer`/`userChoice`, `correctChoice`, `errorValue`, `tolerance`, `angularDeviation`, `mode` |
| angle_comparison_2afc | `userAnswer`/`userChoice`, `correctChoice`, `errorValue`, `tolerance`, `angleA`, `angleB`, `mode` |
| angle_estimation | `userAnswer`, `errorValue`, `tolerance`, `targetValue`, `mode` |
| star_single | `anchorA`, `targetB`, `userClick`, `angleDegree`, `distanceRatio`, `errorPixelDistance`, `mode` |
| star_double_r | `anchorA`, `anchorC`, `targetB`, `userClick`, `angleDegree`, `distanceRatio`, `errorPixelDistance` |
| star_double_h | 同 `star_double_r` |
| persp_vp_convergence | `userAnswer`, `targetValue`, `errorValue`, `tolerance` |
| persp_prop_division | `userAnswer`, `targetValue`, `targetRatio`, `ratioProgress`, `errorValue`, `tolerance` |
| persp_prop_migration | 同 `persp_prop_division` |
| persp_gestalt_continuation | `userChoice`, `correctChoice`, `parallelOffset`, `tolerance` |
| spatial_fractal | 无 `details` |

旧 card（`perspective_*`、`negative_space_*`、`abs_td_palette_2afc`、`color_COMPENSATION`）不参与校准（D-014）。

## 5. 单位

| 字段 | 单位 | 备注 |
|---|---|---|
| `difficultyLevel` | 1–35 序号 | 不是 ΔE/度/px |
| `errorValue` | 卡特定 | 色相为度，比例为 %，定位为 px；**不可跨卡比较** |
| `deltaEError` | ΔE_OK | 颜色卡；与 `errorValue` 不同 |
| `errorPixelDistance` | px | 星卡/顶点拟合 |
| `angleDegree` / `angularDeviation` | 度 | 星卡/角度卡 |
| `areaDeltaPercent` | % | 负形面积 |
| `tolerance` | 卡特定 | 与 `errorValue` 同单位 |
| `displayTimeMs` / `displayDurationMs` | ms | 记忆类 |
| `mode` | string/number | 交互变体；不要假设枚举稳定 |

## 6. 版本分界

- `details` 在 2026-08-16 前后逐步覆盖；更早记录多数没有 `details`。
- 10 个旧 cardId、约 860 条记录；旧 domain 词表：`abstraction`、`perspective`、`negative_space`、`color`。
- 导出格式 `version = 4`；DB `DB_VERSION = 4`。
- 校准只使用 `details` 存在 + 当前 cardId + `timestamp ≥ 2026-08-16`。

## 7. 使用注意

- `isHit` 是卡自己的规则；不同卡的容差语义不同。
- `errorValue` 不能直接跨卡平均；先换成卡内单位或归一化。
- `details` 的字段可能随版本改名；跑校准前先做键存在性检查。
- `level` 是离散序号；拟合时不要把 level 当连续物理量外推太远。

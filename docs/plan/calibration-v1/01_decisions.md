# 决策日志

追加式：只新增，不改写。改主意时新增一条并标 `supersedes: D-xxx`。
每条保持 5 行以内；论证在 `docs/` 或对应 artifact 里，不在这里复述。

---

## D-001 — Level 定义为 80% JND

- 日期：2026-11-24
- 状态：accepted
- 决定：`Level` = 该卡 `p(success | intensity) = 0.8` 处的难度序号；物理阈值记为 JND。旧 Level 标 `legacy`，不跨版本比较。
- 理由：实际在用的 block 模式稳态正确率约 0.60，不是 0.80；Level 不能继续当作 80% 能力。
- 影响：现有 Level 会下降 5–15 级；所有校准、基线、锚点以 JND 为准。
- 重审触发：`event:level_semantics_change`

## D-002 — 维度 = 1 全局 + 4 物理族 + 标签作 facet

- 日期：2026-11-24
- 状态：accepted
- 决定：`JND_card = exp(theta + f_family + c_card)`；族为颜色 ΔE / 角度 / 比例 / 空间定位。视觉域、认知路径、心智抗性只作先验分组/调节，不单独估 16 格。
- 理由：4 个视觉域是内容分类，不是共同标尺；16 格在 20 题下不可识别。
- 影响：全局基准只更新 θ 与族偏移；未校准卡不强承诺 per-card 基线。
- 重审触发：`event:family_transfer_failed`

## D-003 — 只做单用户自标定

- 日期：2026-11-24
- 状态：accepted
- 决定：不引入人群常模、不做跨用户比较；校准 artifact 是个人状态，换用户需重来。
- 理由：当前只有一名用户，且人群数据不足。
- 影响：所有结论只对本用户有效；文档不得暗示人群外推。
- 重审触发：`event:multi_user_scope`

## D-004 — 不做数据迁移；JSON 保留；只清 IDB

- 日期：2026-11-24
- 状态：accepted
- 决定：旧导出保留为冻结校准语料（仓库外）；不导入新 IDB；校准完成后只清 IDB 中的旧记录。
- 理由：迁移成本无收益；原始 JSON 是唯一可复核证据。
- 影响：新应用从空 IDB 开始；校准 artifact 是运行时唯一旧状态。
- 重审触发：`event:dataset_retention_change`

## D-005 — 先做 8 张试点，再全量

- 日期：2026-11-24
- 状态：accepted
- 决定：试点 = 4 族 × 2 张 + 1 张 out-of-range 控制（8 张校准 + 1 张控制）。通过 G1 后才全量。
- 理由：试点的核心不是“校准 8 张”，而是验证 family transfer 是否成立；6 张不足以覆盖 4 族。
- 影响：试点补测约 60 题；G1 失败则按 `03_roadmap` 的降级树回退。
- 重审触发：`event:pilot_scope_change`

## D-006 — 接受 300–400 题补测

- 日期：2026-11-24
- 状态：accepted
- 决定：全量补测分 3–4 次完成，单次 20–30 题；不追求一次做完。
- 理由：约 13 张卡在 80% 阈值附近缺数据，纯离线校准不可行。
- 影响：项目周期以补测节奏为准；预留 20% 缓冲。
- 重审触发：`event:targeted_trial_budget_change`

## D-007 — out-of-range 先排除、标 experimental、排队改生成器

- 日期：2026-11-24
- 状态：accepted
- 决定：最简单等级仍到不了 80% 的卡，先从基线表排除，标 `experimental`，进入 redesign 队列；borderline 卡（`rel_lightness_induction`、`neg_ratio_estimation`）先用 95% CI 确认。
- 理由：强行赋 JND 会制造假精度；这类问题是难度范围设计，不是校准。
- 影响：7 张候选暂不进入基线；重设计后旧数据作废并重新标定。
- 重审触发：`event:out_of_range_list_confirmed`

## D-008 — 测量层完成前不加新题型

- 日期：2026-11-24
- 状态：accepted
- 决定：G4 之前不新增 card 类型；新卡必须带 `intensity` / `levelToIntensity` / 初始标定元数据才允许进入测量体系。
- 理由：新题型只增加未标定 item，不解决等值。
- 影响：内容补齐需求单独立项，不阻塞主线。
- 重审触发：`event:new_card_type_requested`

## D-009 — block 不作为测量算子

- 日期：2026-11-24
- 状态：accepted
- 决定：测量/JND 场景不用 block；临时对照用 3U1D 细步。block 只保留为训练模式，并明确其 Level 不是 80% 阈值。
- 理由：block 的 10 题三段规则稳态约 60%，且无法通过调下阈值钉到 80%。
- 影响：切换后 Level 语义变化已在 D-001 记录。
- 重审触发：`event:block_rule_redesign`

## D-010 — 清 IDB 前必须通过 G1/G2 验证

- 日期：2026-11-24
- 状态：accepted
- 决定：至少通过试点验证（G1）与全量验证（G2）后，才允许清 IDB 旧记录；清之前保留 JSON、充分统计量、验证报告。
- 理由：校准是否“正确”只能靠样本外预测与新鲜重测，不能靠内部拟合。
- 影响：删数据是不可逆动作，必须过 gate。
- 重审触发：`event:validation_gate_bypass`

## D-011 — 计划 tracked + 脱敏；原始数据放本地

- 日期：2026-11-24
- 状态：accepted
- 决定：计划放 `docs/plan/calibration-v1/` 并纳入 git；原始 trial、绝对路径、个人日程放 `viska/local/calibration/`（gitignored）。提交前按 `PRIVACY.md` 检查。
- 理由：计划是项目记忆，需要历史、diff、gate tag 与可审查性；自由度通过本地 raw 区保留。
- 影响：本目录不得出现 `/home/...`、Token、数据集路径、逐题记录。
- 重审触发：`event:privacy_policy_change`

## D-012 — 20 题锚点只更新 θ / family，不承诺未校准卡

- 日期：2026-11-24
- 状态：accepted
- 决定：锚点测试输出 θ 与族偏移；已校准卡用 `θ + f + c_card` 更新，未校准卡只给族先验 + 宽 CI。
- 理由：20 题无法重估 33 张卡的 per-card 偏移。
- 影响：全局基准的 UI 必须显示“估计中/未校准”，不能伪造精度。
- 重审触发：`event:anchor_model_change`

## D-013 — 计划用短分支，常驻 develop

- 日期：2026-11-24
- 状态：accepted
- 决定：从 `develop` 开 `plan/calibration-v1` 起草 S00，合并后计划常驻 `develop`；后续每个 gate 用短分支 `calib/sNN-*`。
- 理由：新会话默认从 `develop` 开始；长期分支会让计划不可见、数字过期。
- 影响：计划文档在 `develop` 上持续更新；代码用 feature 分支。
- 重审触发：`event:branch_strategy_change`

## D-014 — 校准过滤：排除无 details 与旧 cardId

- 日期：2026-11-24
- 状态：accepted
- 决定：只使用 `details` 存在、当前 cardId、时间 ≥ 2026-08-16 的记录；旧 cardId（10 个、860 条）与旧 domain 词表不参与校准。
- 理由：8/16 前无物理细节；旧 id 无法可靠映射，且用户接受放弃。
- 影响：可用记录约 24.9k；`spatial_fractal` 无 details，单独处理。
- 重审触发：`event:details_backfill`

## D-015 — 重测用 CI 判定，不用点估计

- 日期：2026-11-24
- 状态：accepted
- 决定：20 题重测的观察正确率用 95% 二项 CI 判断是否覆盖 0.8；JND 偏移同时看 ±5 级与 CI。
- 理由：20 题下 0.8 的点估计噪声很大，按点估计会误杀/误放。
- 影响：`05_acceptance` 的通过线按 CI 写。
- 重审触发：`event:retest_protocol_change`

---

## D-016 — 校准采用固定平衡序列，不用 staircase

- 日期：2026-11-24
- 状态：accepted
- 决定：每个 run 使用固定 levels × trialsPerLevel 的平衡序列；每个 block 内随机打乱 level；记录 seed 与完整 sequence。不使用自适应升降级。
- 理由：固定序列保证窗口覆盖、题数确定、无起始 level 不可控问题，也避免自适应选点偏差。
- 影响：S02/S02b 变成“只做题”；`06` 的 staircase 段落作废。
- 重审触发：`event:calibration_design_change`

## D-017 — 校准数据写主 DB 的独立 stores

- 日期：2026-11-24
- 状态：accepted
- 决定：在主 DB 增加 `calibration_runs` / `calibration_trials`，参与导入/导出/清空；不写 `records` / `sessions` / `profiles` / `daily_summaries`。
- 理由：遵守 ADR 0003 的单 IDB 与全量备份语义；同时把校准数据与训练统计隔离。
- 影响：DB_VERSION 5；旧导出仍可导入；`clearAllData` 会清校准数据。
- 重审触发：`event:calibration_storage_split`

## D-018 — 校准视口复用 sandbox 语义

- 日期：2026-11-24
- 状态：accepted
- 决定：新增 `#/calibrate` 调试视口；内部用 `sessionType='sandbox'` + `GenericTrainingView`，不新增 `sessionType='calibration'`。
- 理由：sandbox 已经“不写训练统计、不跑自适应”；只需加固定序列、落库、导出、续做。
- 影响：`sessionDecisions`/`SessionSummaryModal`/session type 校验不改；完成页由校准模块自绘。
- 重审触发：`event:calibration_becomes_product_mode`

## D-019 — 校准导出只走 JSON，不手填表

- 日期：2026-11-24
- 状态：accepted
- 决定：每个 run 自动落库；导出 `formsight-calibration-runs` JSON（含 sequence、byLevel summary、逐题 details）；`11_experiment_log` 由导出摘要生成，不手填。
- 理由：减少人工错误；S03 直接消费 JSON。
- 影响：导出格式变更需升 `version`。
- 重审触发：`event:calibration_export_format_change`

---

## D-020 — pilot v1 判 G1 未通过，不进入全量校准

- 日期：2026-11-25
- 状态：accepted
- 决定：5/8 run、4/5 无有效 80% 穿越、0 族强 family transfer；G1 不通过，S04 暂停。
- 理由：窗口失效时做全量校准只会把错误放大到 300–400 题。
- 影响：新增 S03b（生成器/协议）与 S02c（pilot v2）。
- 重审触发：`event:pilot_v2_complete`

## D-021 — star_single / star_double_r 标 confounded

- 日期：2026-11-25
- 状态：accepted
- 决定：两张 star 卡先修生成器，使间距按角度或 R 比例缩放；修好前不参与 JND/Level 校准。
- 理由：`S(level)` 是像素间距，角间距 `S/R` 随随机 R 变 3–4 倍；Level 与真实难度脱钩。
- 影响：两张卡标 `confounded/experimental`；旧 Level 作废；pilot v2 用新窗口。
- 重审触发：`event:star_spacing_fixed`

## D-022 — pilot v2 用更宽的 8 卡窗口

- 日期：2026-11-25
- 状态：accepted
- 决定：pilot v2 覆盖 8 张卡、约 184 题；angle 上移到 16–32，persp 扩到 5–25，star 修后 1–21，color 5–17。
- 理由：v1 的 5 级窗口对指数难度映射太窄，只覆盖 1.3–1.5 倍容差变化。
- 影响：`src/calibration/protocols.ts` 更新；S02c 重跑。
- 重审触发：`event:pilot_v2_protocol_change`

## D-023 — 校准 run 必须在一次坐下完成

- 日期：2026-11-25
- 状态：accepted
- 决定：单 run 中断超过 2 小时，标 `split` 并重做；不把跨天数据当同一阈值。
- 理由：star_single v1 跨 24 小时；顺序/状态会污染阈值。
- 影响：`06` 增加 split 规则；`07` 记录异常。
- 重审触发：`event:calibration_run_duration_rule`

---

## D-024 — star_double_h 一并修复并标 experimental

- 日期：2026-11-25
- 状态：accepted
- 决定：`star_double_h` 与 `star_single` / `star_double_r` 共用角间距修复；三张 star 卡统一标 `experimental`。
- 理由：H 与 R 的双极网格实现相同，只修 R 会留下同一 R 混淆。
- 影响：三张 star 卡旧 Level 作废；pilot v2 只跑单/双 R，H 待后续排期。
- 重审触发：`event:star_family_calibrated`

---

## D-025 — pilot v2 仍未过 G1，进入 pilot v3

- 日期：2026-11-25
- 状态：accepted
- 决定：8/8 卡已跑，但只有 angle_parallel 干净、persp_migration 可用、persp_division 噪声大；1/4 族弱证据；G1 不通过，S04 继续暂停。
- 理由：4 题/级太吵，20–24 题 CI ±0.2；非单调无法判定。
- 影响：pilot v3 聚焦 5 张、每级 6 题、约 156 题。
- 重审触发：`event:pilot_v3_complete`

## D-026 — 无效 run 与节奏规则

- 日期：2026-11-25
- 状态：accepted
- 决定：中位 RT <300ms 的 run 直接判无效；每次会话最多 2–3 个 run，中间休息；star 卡安排在会话开始。
- 理由：v2 有一次 angle_comparison 133ms/题；19 分钟 254 题，后半段可能疲劳。
- 影响：`06` 增加规则；S03e 先过滤无效 run 再分析。
- 重审触发：`event:valid_run_rule_change`

## D-027 — star_single L1 仍 .60，先人工检查

- 日期：2026-11-25
- 状态：accepted
- 决定：两次 v2 run 的 L1 都 .60、L4 .40；先做 5 题人工检查（是否看懂任务/几何是否可点）。仍 <0.8 则标 out-of-range/redesign。
- 理由：不是单调难度，可能是任务理解或新几何问题；不能直接归因于能力。
- 影响：pilot v3 先跑 5 题检查，再决定是否跑 36 题。
- 重审触发：`event:star_single_manual_check`

## D-028 — pilot v3 窗口

- 日期：2026-11-25
- 状态：accepted
- 决定：color_val 1–9、color_hue 9–17、angle_comparison 14–30、star_single 1–16、star_double 17–35；每级 6 题（star_double 5 题/级）。
- 理由：v2 显示 color_val 偏难、star_double 天花板、angle_comparison 噪声大。
- 影响：`protocols.ts` v3；可选确认 angle/ratio +60 题。
- 重审触发：`event:pilot_v3_protocol_change`

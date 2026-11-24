# 术语

| 术语 | 含义 |
|---|---|
| JND | just noticeable difference；这里指该卡 `p(success)=0.8` 处的物理阈值 |
| Level | 该卡难度序号 1–35；D-001 后定义为 JND 对应的序号 |
| intensity | 单题的实际物理强度（ΔE、度、%、px 等），不是 Level |
| threshold | 心理测量函数上的判定点；本计划固定为 80% |
| guess / `g` | 猜中率；2AFC=0.5，连续滑块约 0.05–0.1，多选约 1/选项数 |
| lapse | 失误率；与 guess 分开建模 |
| slope / `b` | 心理测量函数的陡峭度（logit/level 或 logit/log 单位） |
| family | 共享物理单位的卡组：颜色 ΔE、角度、比例、空间定位 |
| facet | 视觉域/认知路径/心智抗性等标签分组，只作先验/调节，不单独估 |
| `theta` | 全局能力 |
| `f_family` | 族偏移 |
| `c_card` | 族内卡偏移 |
| block | 10 题一段、`acc≥0.8` 升、`acc<0.5` 降的旧算子；稳态约 0.60 |
| 3U1D | 连续 3 次命中升、1 次未命中降；稳态约 0.794 |
| staircase fine | 3U1D + step=1；本计划的临时测量算子 |
| out-of-range | 最简单等级仍到不了 80%；不赋 JND，进 redesign |
| below-range | 80% 穿越点低于当前观测范围；先验只作下界占位 |
| prior | 从历史数据得到的补测起点，不是最终 JND |
| LOCO | leave-one-card-out；藏一张卡，用同族其余卡预测它 |
| Brier | `mean((p_pred - y)^2)` |
| log-loss | `-mean(y log p + (1-y) log(1-p))` |
| PAVA / isotonic | 保序回归；用于单调的 level→accuracy 曲线 |
| CI | 置信/可信区间；本计划用 90%/95% |
| calibrated | 有 JND + CI + 通过验证，可进基线表 |
| low-confidence | 估计存在但 CI 太宽或敏感性大；只给族先验 |
| no-details | 无物理细节，无法按强度拟合 |
| anchor | 锚卡/锚题；用于 20 题全局漂移检查 |
| family transfer | 同族卡之间能否互相预测 JND；G1 的核心问题 |
| artifact | 校准产物（`calib-v1`），含每卡 JND/CI/状态 |
| IDB | IndexedDB；app 的运行时数据库 |
| legacy | 旧 Level / 旧 cardId / 旧 domain；不参与比较或校准 |

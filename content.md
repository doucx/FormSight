好的，我将按照阶段 1 与阶段 2 的规划，对目标卡片的私有词典及视图调用进行规范化收敛，消除同义词与领域前缀冗余，建立一致的 `hint` 契约体系。

## [WIP] refactor: 统一卡片私有词典指引字段并消除同义词冗余

### 用户需求
针对 6 个典型卡片（`fractal_edge_roughness`、`rel_vector_shift`、`neg_area_comparison_2afc`、`neg_ratio_estimation`、`neg_shape_match_2afc`、`neg_vertex_fitting`），将分散且冗余的界面操作指引键名（如 `instruction`、`prompt`、`areaHint`、`ratioHint`、`vertexHint`、`memoryStimulusHint`/`memoryRecallHint`）收敛为统一的 `hint` 及阶段性子结构 `hint_{stage}`，并同步更新视图组件中的多语言调用。

### 评论
当前多张卡片因历史自由命名，在词典已具备独立命名空间的前提下引入了重复的卡片名前缀或使用了含义重叠的键名。统一收敛为标准 `hint` 契约，能大幅降低多语言翻译与维护成本，并为后续 SDK 自动化提示注入打下规范基础。

### 目标
1. 将 `fractal_edge_roughness` 中的 `instruction` 统一为 `hint`。
2. 将 `rel_vector_shift` 中的 `prompt` 统一为 `hint`。
3. 将 `neg_area_comparison_2afc` 中的 `areaHint` 统一为 `hint`。
4. 将 `neg_ratio_estimation` 中的 `ratioHint` 统一为 `hint`。
5. 将 `neg_shape_match_2afc` 中的 `memoryStimulusHint` 与 `memoryRecallHint` 规范化为 `hint_stimulus` 与 `hint_recall`。
6. 将 `neg_vertex_fitting` 中的 `vertexHint` 统一为 `hint`。
7. 同步更新对应卡片中 View 组件的 `t(...)` 调用。

### 基本原理
卡片局部翻译通过 `useCardTranslation(cardId)` 自动加挂 `cards.<cardId>` 命名空间。词典内的特定领域前缀（如 `areaHint`、`ratioHint`）在局部作用域下属于命名冗余；而 `instruction`、`prompt` 与 `hint` 在 UI 语义上完全一致（均作为 `QuestionCardShell` 的 `hintText` 渲染）。因此直接收敛至 `hint` 既保持了语义精炼，又实现了与大多数卡片规范对齐。

### 标签
#intent/refine #flow/ready #priority/medium #comp/cards #concept/config #scope/core #ai/instruct #task/domain/i18n #task/object/card-locales-schema #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 收敛 `fractal_edge_roughness` 语言包与视图中的指引键

~~~~~act
patch_file
src/cards/fractal_edge_roughness/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Fractal Edge Roughness",
  "desc": "Judge contour roughness and high-frequency noise variance by matching the Hurst exponent (H).",
  "instruction": "Adjust the lower curve's roughness (Hurst H) to match the upper target edge texture.",
  "analytics": {
~~~~~
~~~~~json
{
  "title": "Fractal Edge Roughness",
  "desc": "Judge contour roughness and high-frequency noise variance by matching the Hurst exponent (H).",
  "hint": "Adjust the lower curve's roughness (Hurst H) to match the upper target edge texture.",
  "analytics": {
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "分形边缘粗糙度",
  "desc": "通过调节 Hurst 指数 (H) 匹配边缘分形维数，锻炼对轮廓微观高频噪波与粗糙质感的量化直觉。",
  "instruction": "拖拽滑块调节下方线条的高频噪波感（Hurst 指数），使其粗糙度与上方目标线完全一致",
  "analytics": {
~~~~~
~~~~~json
{
  "title": "分形边缘粗糙度",
  "desc": "通过调节 Hurst 指数 (H) 匹配边缘分形维数，锻炼对轮廓微观高频噪波与粗糙质感的量化直觉。",
  "hint": "拖拽滑块调节下方线条的高频噪波感（Hurst 指数），使其粗糙度与上方目标线完全一致",
  "analytics": {
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/FractalEdgeRoughnessView.tsx
~~~~~
~~~~~tsx
  return (
    <QuestionCardShell
      hintText={t('instruction')}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
~~~~~
~~~~~tsx
  return (
    <QuestionCardShell
      hintText={t('hint')}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
~~~~~

#### Acts 2: 收敛 `rel_vector_shift` 语言包与视图中的指引键

~~~~~act
patch_file
src/cards/rel_vector_shift/locales/en-US.json
~~~~~
~~~~~json
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Indicator Band",
    "showToleranceBandDesc": "Display tolerance reference on swatches"
  },
  "prompt": "Observe vector shift A➔B and pick the matching C➔D shift below"
}
~~~~~
~~~~~json
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Indicator Band",
    "showToleranceBandDesc": "Display tolerance reference on swatches"
  },
  "hint": "Observe vector shift A➔B and pick the matching C➔D shift below"
}
~~~~~

~~~~~act
patch_file
src/cards/rel_vector_shift/locales/zh-CN.json
~~~~~
~~~~~json
  "settings": {
    "showToleranceBandTitle": "显示容错感应区",
    "showToleranceBandDesc": "在候选色块上标示容错参考"
  },
  "prompt": "观察上方 A➔B 色彩推移，在候选区选出符合 C➔D 的同向推移色"
}
~~~~~
~~~~~json
  "settings": {
    "showToleranceBandTitle": "显示容错感应区",
    "showToleranceBandDesc": "在候选色块上标示容错参考"
  },
  "hint": "观察上方 A➔B 色彩推移，在候选区选出符合 C➔D 的同向推移色"
}
~~~~~

~~~~~act
patch_file
src/cards/rel_vector_shift/RelVectorShiftView.tsx
~~~~~
~~~~~tsx
  return (
    <QuestionCardShell
      hintText={t('prompt')}
      hintIcon={Shuffle}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
~~~~~
~~~~~tsx
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Shuffle}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
~~~~~

#### Acts 3: 收敛 `neg_area_comparison_2afc` 语言包与视图中的指引键

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Negative Area 2AFC",
  "desc": "Compare two silhouettes and identify which one has greater negative space area.",
  "instruction": "Identify which side contains more negative white space (Keys 1 / 2).",
  "areaHint": "Identify which side contains larger negative white space area (Keys 1 / 2)",
  "whiteSpace": "White Space {{ratio}}%"
}
~~~~~
~~~~~json
{
  "title": "Negative Area 2AFC",
  "desc": "Compare two silhouettes and identify which one has greater negative space area.",
  "instruction": "Identify which side contains more negative white space (Keys 1 / 2).",
  "hint": "Identify which side contains larger negative white space area (Keys 1 / 2)",
  "whiteSpace": "White Space {{ratio}}%"
}
~~~~~

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "负形面积二分判别",
  "desc": "快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。",
  "instruction": "二选一判别哪一侧画面的白色留白（负形）面积更大",
  "areaHint": "判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)",
  "whiteSpace": "留白 {{ratio}}%"
}
~~~~~
~~~~~json
{
  "title": "负形面积二分判别",
  "desc": "快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。",
  "instruction": "二选一判别哪一侧画面的白色留白（负形）面积更大",
  "hint": "判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)",
  "whiteSpace": "留白 {{ratio}}%"
}
~~~~~

~~~~~act
patch_file
src/cards/neg_area_comparison_2afc/NegAreaComparison2AfcView.tsx
~~~~~
~~~~~tsx
  return (
    <QuestionCardShell
      hintText={t('areaHint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
~~~~~
~~~~~tsx
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
    >
~~~~~

#### Acts 4: 收敛 `neg_ratio_estimation` 语言包与视图中的指引键

~~~~~act
patch_file
src/cards/neg_ratio_estimation/locales/en-US.json
~~~~~
~~~~~json
      "desc": "The closer points lie to the diagonal, the sharper your spatial area intuition."
    }
  },
  "ratioHint": "Estimate the area percentage of white negative space relative to the whole scene",
  "ratioLabel": "Negative Space Ratio Estimation:"
}
~~~~~
~~~~~json
      "desc": "The closer points lie to the diagonal, the sharper your spatial area intuition."
    }
  },
  "hint": "Estimate the area percentage of white negative space relative to the whole scene",
  "ratioLabel": "Negative Space Ratio Estimation:"
}
~~~~~

~~~~~act
patch_file
src/cards/neg_ratio_estimation/locales/zh-CN.json
~~~~~
~~~~~json
      "desc": "散点越紧贴对角线，代表对负形几何空隙的面积直觉越敏锐精准。"
    }
  },
  "ratioHint": "估计白色留白 (负形) 占整幅画面的面积百分比",
  "ratioLabel": "负形空间占比估计:"
}
~~~~~
~~~~~json
      "desc": "散点越紧贴对角线，代表对负形几何空隙的面积直觉越敏锐精准。"
    }
  },
  "hint": "估计白色留白 (负形) 占整幅画面的面积百分比",
  "ratioLabel": "负形空间占比估计:"
}
~~~~~

~~~~~act
patch_file
src/cards/neg_ratio_estimation/NegRatioEstimationView.tsx
~~~~~
~~~~~tsx
  return (
    <QuestionCardShell
      hintText={t('ratioHint')}
      hintIcon={Maximize2}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
~~~~~
~~~~~tsx
  return (
    <QuestionCardShell
      hintText={t('hint')}
      hintIcon={Maximize2}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
    >
~~~~~

#### Acts 5: 规范化 `neg_shape_match_2afc` 多阶段动态指引键

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Negative Shape Match",
  "desc": "Memorize negative space contours and match the identical silhouette (2AFC).",
  "instruction": "Memorize the shape and select the identical one (Keys 1 / 2).",
  "memoryStimulusHint": "Memorize the negative space contour ({{ms}}ms)",
  "memoryRecallHint": "Recall Match: Which side matches the shape just shown? (Keys 1 / 2)"
}
~~~~~
~~~~~json
{
  "title": "Negative Shape Match",
  "desc": "Memorize negative space contours and match the identical silhouette (2AFC).",
  "instruction": "Memorize the shape and select the identical one (Keys 1 / 2).",
  "hint_stimulus": "Memorize the negative space contour ({{ms}}ms)",
  "hint_recall": "Recall Match: Which side matches the shape just shown? (Keys 1 / 2)"
}
~~~~~

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "负形轮廓记忆匹配",
  "desc": "瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。",
  "instruction": "瞬时记忆负形空隙轮廓特征，在候选区二选一选出完全相同的形状",
  "memoryStimulusHint": "瞬时记忆负形轮廓特征 ({{ms}}ms)",
  "memoryRecallHint": "匹配回忆：哪一侧与刚才展示完全相同？(键 1 / 2)"
}
~~~~~
~~~~~json
{
  "title": "负形轮廓记忆匹配",
  "desc": "瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。",
  "instruction": "瞬时记忆负形空隙轮廓特征，在候选区二选一选出完全相同的形状",
  "hint_stimulus": "瞬时记忆负形轮廓特征 ({{ms}}ms)",
  "hint_recall": "匹配回忆：哪一侧与刚才展示完全相同？(键 1 / 2)"
}
~~~~~

~~~~~act
patch_file
src/cards/neg_shape_match_2afc/NegShapeMatch2AfcView.tsx
~~~~~
~~~~~tsx
    <QuestionCardShell
      hintText={
        matchPhase === 'stimulus' && !showAnswer
          ? t('memoryStimulusHint', {
              ms: question.displayTimeMs ?? 1500,
            })
          : t('memoryRecallHint')
      }
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
~~~~~
~~~~~tsx
    <QuestionCardShell
      hintText={
        matchPhase === 'stimulus' && !showAnswer
          ? t('hint_stimulus', {
              ms: question.displayTimeMs ?? 1500,
            })
          : t('hint_recall')
      }
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
~~~~~

#### Acts 6: 收敛 `neg_vertex_fitting` 语言包与视图中的指引键

~~~~~act
patch_file
src/cards/neg_vertex_fitting/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Negative Vertex Fitting",
  "desc": "Observe the negative space contours and locate the truncated vertex on the grid.",
  "instruction": "Click to locate the truncated vertex based on negative space contours.",
  "vertexHint": "Compare negative space and click to locate the truncated vertex on the right"
}
~~~~~
~~~~~json
{
  "title": "Negative Vertex Fitting",
  "desc": "Observe the negative space contours and locate the truncated vertex on the grid.",
  "instruction": "Click to locate the truncated vertex based on negative space contours.",
  "hint": "Compare negative space and click to locate the truncated vertex on the right"
}
~~~~~

~~~~~act
patch_file
src/cards/neg_vertex_fitting/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "负形边界反切定点",
  "desc": "观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。",
  "instruction": "观察左侧完整参考的负形挤压轮廓，在右侧点阵中点击定位被截断的正形顶点",
  "vertexHint": "对比左侧负形空间，在右侧点阵中点击定位被截断的顶点"
}
~~~~~
~~~~~json
{
  "title": "负形边界反切定点",
  "desc": "观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。",
  "instruction": "观察左侧完整参考的负形挤压轮廓，在右侧点阵中点击定位被截断的正形顶点",
  "hint": "对比左侧负形空间，在右侧点阵中点击定位被截断的顶点"
}
~~~~~

~~~~~act
patch_file
src/cards/neg_vertex_fitting/NegVertexFittingView.tsx
~~~~~
~~~~~tsx
          tabIndex={0}
          role="button"
          aria-label={t('vertexHint')}
          className={`w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner touch-none transition-all block ${
~~~~~
~~~~~tsx
          tabIndex={0}
          role="button"
          aria-label={t('hint')}
          className={`w-full h-full aspect-square rounded-xl border border-border bg-card shadow-inner touch-none transition-all block ${
~~~~~

---

### 下一步建议

1. **执行单元测试与构建验证**：运行 `pnpm test` 与 `pnpm build`，确保所有卡片的渲染与多语言翻译均正常加载且无未定义 key 警告。
2. **实施阶段三与防劣化单测守卫**：
   - 编写一个自动化测试用例（如 `src/cards/__tests__/locales-schema.test.ts`），遍历各卡片下的 `locales/*.json`，校验是否存在被废弃的别名键（如 `areaHint`, `ratioHint`, `vertexHint`, `prompt` 等），确保后续开发遵循一致的 i18n Schema。
   - 考虑在 `@formsight/card-sdk` 的 `QuestionCardShell` 中引入自动回退到卡片命名空间 `hint` 的便利属性。

我们将对全局以及各训练卡片的中文语言包进行修正，彻底消除“真理值”、“绝对真理点”等机械直译与生硬用词。

## [WIP] fix(i18n): 修正中文语言包中“真理值”等生硬表述

### 错误分析

在之前的本地化文本中，将英文中的 `Ground Truth`、`True Value`、`Strictly Parallel` 等词汇直接字面直译为了“真理值”、“绝对真理值”、“真理色彩”、“绝对平行”，脱离了视觉感知训练、美术构图及几何度量的实际语境，导致界面文案显得生硬晦涩，严重影响交互可读性与专业性。

### 用户需求

消除界面中所有“真理值”、“绝对真理”等别扭、生硬的表达，将翻译腔和不规范的中文表述替换为符合美术、几何与认知训练常规用法的自然词汇。

### 评论

这是一项关乎系统可用性与专业度的重要文本优化。通过以行业通行的专业术语（如“真实值”、“标准基准点”、“严格平行”）替代直译腔，大幅提升了产品的质感与用户体验。

### 目标

1. 修复全局语言包 `src/locales/zh-CN.json` 中通用与壳层组件中的“真理值”与“绝对真理值”。
2. 修复各训练卡片中文语言包中的“绝对真理值”、“真理色彩”、“客观物理明度真理”、“理论真理色”以及“绝对真理点”。
3. 优化“绝对平行”、“精准中立”、“压榨出最坚固的”等语感生硬的表述。

### 基本原理

采用 `patch_file` 原子化替换各卡片及全局 `zh-CN.json` 中的具体键值，不改动 JSON 结构与层级，确保 i18n key 的一一映射保持完好。

### 标签

#intent/fix #flow/ready #priority/medium #comp/interfaces #concept/config #scope/ux #ai/instruct #task/domain/i18n #task/object/locales-wording #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 修正全局语言包 `src/locales/zh-CN.json`

将通用反馈及训练壳层中的“真理值”替换为规范的“真实值”与“标准真实值”。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
    "candidateN": "候选 {{num}}",
    "screenN": "画面 {{num}}",
    "submitSpace": "确认提交 (Space)",
    "trueValue": "真理值",
    "error": "误差",
~~~~~
~~~~~json
    "candidateN": "候选 {{num}}",
    "screenN": "画面 {{num}}",
    "submitSpace": "确认提交 (Space)",
    "trueValue": "真实值",
    "error": "误差",
~~~~~

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
    "clickToResume": "点击继续训练 (或按任意键)",
    "confirmSubmit": "确认提交 (Space)",
    "trueValue": "绝对真理值",
    "error": "误差",
    "tolerance": "容错",
~~~~~
~~~~~json
    "clickToResume": "点击继续训练 (或按任意键)",
    "confirmSubmit": "确认提交 (Space)",
    "trueValue": "标准真实值",
    "error": "误差",
    "tolerance": "容错",
~~~~~

#### Acts 2: 修正角度相关模块的语言包

将夹角估算卡片中的“绝对真理值:”替换为“真实角度:”，将平行线卡片中的“绝对平行”替换为更规范的“严格平行”。

~~~~~act
patch_file
src/cards/angle_estimation/locales/zh-CN.json
~~~~~
~~~~~json
  "hint": "观察两射线夹角，调制滑块逼近精准度数",
  "label": "夹角估算值:",
  "trueAngle": "绝对真理值:",
  "errorInfo": "误差: {{error}}° (容错: ±{{tolerance}}°)"
~~~~~
~~~~~json
  "hint": "观察两射线夹角，调制滑块逼近精准度数",
  "label": "夹角估算值:",
  "trueAngle": "真实角度:",
  "errorInfo": "误差: {{error}}° (容错: ±{{tolerance}}°)"
~~~~~

~~~~~act
patch_file
src/cards/angle_parallel_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "平行线基准辨识",
  "desc": "观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。",
  "hint": "观察上方基准线，选出下方与它严格平行的线 (键 1 / 2)",
  "promptTitle": "平行基准线",
  "optionA": "选项 A",
  "optionB": "选项 B",
  "absoluteParallel": "绝对平行",
  "deviationBadge": "偏转 {{deg}}°"
}
~~~~~
~~~~~json
{
  "title": "平行线基准辨识",
  "desc": "观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其严格平行的线段 (2AFC)。",
  "hint": "观察上方基准线，选出下方与它严格平行的线 (键 1 / 2)",
  "promptTitle": "平行基准线",
  "optionA": "选项 A",
  "optionB": "选项 B",
  "absoluteParallel": "严格平行",
  "deviationBadge": "偏转 {{deg}}°"
}
~~~~~

#### Acts 3: 修正色彩类模块的语言包

修正综合拾色中的“逼近真理色彩”、环境穿透中的“物理明度真理”以及补色残像中的“理论真理色”。

~~~~~act
patch_file
src/cards/color_all/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "综合拾色 (Match)",
  "desc": "同时调整色相、饱和度与明度，逼近真理色彩",
  "hint": "同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色",
~~~~~
~~~~~json
{
  "title": "综合拾色 (Match)",
  "desc": "同时调整色相、饱和度与明度，逼近目标真实色彩",
  "hint": "同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色",
~~~~~

~~~~~act
patch_file
src/cards/rel_decontextual_2afc/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "环境穿透判别",
  "desc": "穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理",
  "hint": "穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」",
~~~~~
~~~~~json
{
  "title": "环境穿透判别",
  "desc": "穿透强对比背景的视错觉陷阱，快速二选一判别色块的真实物理明度",
  "hint": "穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」",
~~~~~

~~~~~act
patch_file
src/cards/rel_hue_induction/locales/zh-CN.json
~~~~~
~~~~~json
  "leftBase": "左侧固定基准",
  "rightPreview": "右侧环境补偿区 (实时预览)",
  "splitComparisonTooltip": "上半部为您的选择，下半部为理论真理色"
}
~~~~~
~~~~~json
  "leftBase": "左侧固定基准",
  "rightPreview": "右侧环境补偿区 (实时预览)",
  "splitComparisonTooltip": "上半部为您的选择，下半部为理论标准色"
}
~~~~~

#### Acts 4: 修正三类锚点散点图分析中的“绝对真理点”

将单锚点、水平双锚点与旋转双锚点中的散点图诊断文案由“绝对真理点”调整为“标准基准点”与“目标基准点”。

~~~~~act
patch_file
src/cards/star_single/locales/zh-CN.json
~~~~~
~~~~~json
    "spatialBias": {
      "tabLabel": "空间偏置散点",
      "title": "{{title}} · 空间偏置分析",
      "subTitle": "中心绿点为绝对真理点，散点分布揭示手眼定位偏移",
      "cardTitle": "系统空间偏置 (Systematic Bias)",
      "desc": "中心为绝对真理点。散点越收敛代表空间直觉越敏锐。",
~~~~~
~~~~~json
    "spatialBias": {
      "tabLabel": "空间偏置散点",
      "title": "{{title}} · 空间偏置分析",
      "subTitle": "中心绿点为标准基准点，散点分布揭示手眼定位偏移",
      "cardTitle": "系统空间偏置 (Systematic Bias)",
      "desc": "中心为目标基准点。散点越收敛代表空间直觉越敏锐。",
~~~~~

~~~~~act
patch_file
src/cards/star_double_h/locales/zh-CN.json
~~~~~
~~~~~json
    "spatialBias": {
      "tabLabel": "空间偏置散点",
      "title": "{{title}} · 空间偏置分析",
      "subTitle": "中心绿点为绝对真理点，散点分布揭示手眼定位偏移",
      "cardTitle": "系统空间偏置 (Systematic Bias)",
      "desc": "中心为绝对真理点。散点越收敛代表空间直觉越敏锐。",
~~~~~
~~~~~json
    "spatialBias": {
      "tabLabel": "空间偏置散点",
      "title": "{{title}} · 空间偏置分析",
      "subTitle": "中心绿点为标准基准点，散点分布揭示手眼定位偏移",
      "cardTitle": "系统空间偏置 (Systematic Bias)",
      "desc": "中心为目标基准点。散点越收敛代表空间直觉越敏锐。",
~~~~~

~~~~~act
patch_file
src/cards/star_double_r/locales/zh-CN.json
~~~~~
~~~~~json
    "spatialBias": {
      "tabLabel": "空间偏置散点",
      "title": "{{title}} · 空间偏置分析",
      "subTitle": "中心绿点为绝对真理点，散点分布揭示手眼定位偏移",
      "cardTitle": "系统空间偏置 (Systematic Bias)",
      "desc": "中心为绝对真理点。散点越收敛代表空间直觉越敏锐。",
~~~~~
~~~~~json
    "spatialBias": {
      "tabLabel": "空间偏置散点",
      "title": "{{title}} · 空间偏置分析",
      "subTitle": "中心绿点为标准基准点，散点分布揭示手眼定位偏移",
      "cardTitle": "系统空间偏置 (Systematic Bias)",
      "desc": "中心为目标基准点。散点越收敛代表空间直觉越敏锐。",
~~~~~

#### Acts 5: 修正素描归组、边缘粗糙度与完形连续性文案

~~~~~act
patch_file
src/cards/abs_notan_threshold/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "黑白素描归组",
  "desc": "调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。",
  "badge": "黑白素描归组",
~~~~~
~~~~~json
{
  "title": "黑白素描归组",
  "desc": "调节二值化明度剪切阈值，过滤杂乱中间调，提炼出清晰坚实的 Notan 黑白大关系。",
  "badge": "黑白素描归组",
~~~~~

~~~~~act
patch_file
src/cards/fractal_edge_roughness/locales/zh-CN.json
~~~~~
~~~~~json
      "overestimateRoughness": "-{{val}} (感知偏粗糙/对毛刺过度敏感)",
      "underestimateRoughness": "+{{val}} (感知偏平滑/低估高频噪波)",
      "neutral": "0 (精准中立)",
      "avgAbsError": "平均绝对误差 (ΔH):",
~~~~~
~~~~~json
      "overestimateRoughness": "-{{val}} (感知偏粗糙/对毛刺过度敏感)",
      "underestimateRoughness": "+{{val}} (感知偏平滑/低估高频噪波)",
      "neutral": "0 (精准无偏差)",
      "avgAbsError": "平均绝对误差 (ΔH):",
~~~~~

~~~~~act
patch_file
src/cards/persp_gestalt_continuation/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "断线完形连续性辨识",
  "desc": "基于格式塔完形心理学，二选一快速辨识穿透中间障碍物的真实延续线段 (2AFC)。",
  "hint": "观察穿入线段，二选一辨识哪一侧保持了绝对真实的贯穿延伸 (键 1 / 2)",
  "optionA": "延伸 A",
~~~~~
~~~~~json
{
  "title": "断线完形连续性辨识",
  "desc": "基于格式塔完形心理学，二选一快速辨识穿透中间障碍物的真实延续线段 (2AFC)。",
  "hint": "观察穿入线段，二选一辨识哪一侧保持了真实的贯穿延伸 (键 1 / 2)",
  "optionA": "延伸 A",
~~~~~

### 下一步建议

1. **运行现有国际化测试**：执行 `npm test -- src/cards/__tests__/locales-schema.test.ts`，验证所有卡片中英语言包 schema 的键值对应完整性未受破坏。
2. **界面走查确认**：在浏览器中启动训练，重点查看夹角估算（反馈面板）、锚点认知分析弹窗（散点图）及综合拾色等界面，确认新文案展现自然流畅。
3. **提交变更**：待本地验证通过后，可发起独立的 Git 提交计划。

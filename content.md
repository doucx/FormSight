好的，我将生成一个计划来清理 `spatial_fractal` 卡片中因移除定向说明而变得不再使用的国际化键值。

## [WIP] refactor(spatial_fractal): 清理 en-US.json 与 zh-CN.json 中未使用的本地化键

### 错误分析

（本次任务为常规代码与资源精简，无错误修复需求）

### 用户需求
由于此前已在 `SpatialFractalView.tsx` 中移除了选项标题及红蓝定向说明，相关的国际化键值 (`optionsLabel`, `topOrientation`, `leftOrientation`) 已经处于闲置状态，需要从语言包中彻底清理。

### 评论
及时清理未使用的 i18n 键值能够避免技术债，保持代码库和资源文件的整洁。

### 目标
更新 `src/cards/spatial_fractal/locales/en-US.json` 和 `src/cards/spatial_fractal/locales/zh-CN.json`，移除已废弃的三个本地化字段。

### 基本原理
直接使用 `write_file` 覆盖更新两个 JSON 语言文件，保留必要的 `title`、`desc` 和 `hint` 键。

### 标签
#intent/refine #flow/ready #priority/medium #scope/dx #ai/instruct #task/domain/ui #task/object/i18n-locales #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 清理英文语言包 en-US.json 中的废弃键

~~~~~act
write_file
src/cards/spatial_fractal/locales/en-US.json
~~~~~
~~~~~json
{
  "title": "Fractal Cross-Section",
  "desc": "Observe evolving 3D morphologies and identify their cross-sectional topology.",
  "hint": "Observe the transparent cutting plane on the 3D model, and select the matching 2D cross-section."
}
~~~~~

#### Acts 2: 清理中文语言包 zh-CN.json 中的废弃键

~~~~~act
write_file
src/cards/spatial_fractal/locales/zh-CN.json
~~~~~
~~~~~json
{
  "title": "3D分形截面",
  "desc": "观察随难度进化的三维分形形态，并准确识别其截面拓扑",
  "hint": "观察左侧3D模型上的透明切面，选出与之对应的正确2D剖面。"
}
~~~~~

### 下一步建议

国际化资源文件清理完毕。建议执行构建或类型检查，确保所有国际化调用与语言包定义完全对齐且无任何遗漏。

# [WIP] 在 `star_double_h`、`star_double_r` 和 `star_single` 三个卡片的英文 (`en-US.json`) 与中文 (`zh-CN.json`) 词典中补全 `2x2`、`3x3`、`4x4`、`5x5` 的映射条目

## 计划说明

在 `registry.ts` 中，`qualifySchemas` 会自动将 `buttonGroup` 选项中的 `label`（如 `'3x3'`）加上卡片命名空间前缀，转为查询 `cards.<cardId>.3x3`。由于这些字面量标签未在各卡片的私有词典（locales）中定义，系统在多语言查表时未命中，从而直接回退显示了原始键名。

根据您的指示，我将在 `star_double_h`、`star_double_r` 和 `star_single` 三个卡片的英文 (`en-US.json`) 与中文 (`zh-CN.json`) 词典中补全 `2x2`、`3x3`、`4x4`、`5x5` 的映射条目。

---

### Script

~~~~~act
patch_file
src/cards/star_double_h/locales/en-US.json
~~~~~
~~~~~json.old
{
  "title": "Horizontal Double Anchors",
  "desc": "Horizontal dual anchors to train proportion and orthogonal projection intuition.",
~~~~~
~~~~~json.new
{
  "title": "Horizontal Double Anchors",
  "2x2": "2x2",
  "3x3": "3x3",
  "4x4": "4x4",
  "5x5": "5x5",
  "desc": "Horizontal dual anchors to train proportion and orthogonal projection intuition.",
~~~~~

~~~~~act
patch_file
src/cards/star_double_h/locales/zh-CN.json
~~~~~
~~~~~json.old
{
  "title": "水平双锚点",
  "desc": "水平线段两端锚点，评估两点比例与正交投影判定力",
~~~~~
~~~~~json.new
{
  "title": "水平双锚点",
  "2x2": "2x2",
  "3x3": "3x3",
  "4x4": "4x4",
  "5x5": "5x5",
  "desc": "水平线段两端锚点，评估两点比例与正交投影判定力",
~~~~~

~~~~~act
patch_file
src/cards/star_double_r/locales/en-US.json
~~~~~
~~~~~json.old
{
  "title": "Rotated Double Anchors",
  "desc": "Tilted dual anchors to master complex rotated coordinate mapping.",
~~~~~
~~~~~json.new
{
  "title": "Rotated Double Anchors",
  "2x2": "2x2",
  "3x3": "3x3",
  "4x4": "4x4",
  "5x5": "5x5",
  "desc": "Tilted dual anchors to master complex rotated coordinate mapping.",
~~~~~

~~~~~act
patch_file
src/cards/star_double_r/locales/zh-CN.json
~~~~~
~~~~~json.old
{
  "title": "旋转双锚点",
  "desc": "带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力",
~~~~~
~~~~~json.new
{
  "title": "旋转双锚点",
  "2x2": "2x2",
  "3x3": "3x3",
  "4x4": "4x4",
  "5x5": "5x5",
  "desc": "带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力",
~~~~~

~~~~~act
patch_file
src/cards/star_single/locales/en-US.json
~~~~~
~~~~~json.old
{
  "title": "Single Anchor",
  "desc": "Single central anchor to evaluate polar angle and distance estimation.",
~~~~~
~~~~~json.new
{
  "title": "Single Anchor",
  "2x2": "2x2",
  "3x3": "3x3",
  "4x4": "4x4",
  "5x5": "5x5",
  "desc": "Single central anchor to evaluate polar angle and distance estimation.",
~~~~~

~~~~~act
patch_file
src/cards/star_single/locales/zh-CN.json
~~~~~
~~~~~json.old
{
  "title": "单锚点模式",
  "desc": "单一中心锚点，评估基本极坐标方位与距离感知力",
~~~~~
~~~~~json.new
{
  "title": "单锚点模式",
  "2x2": "2x2",
  "3x3": "3x3",
  "4x4": "4x4",
  "5x5": "5x5",
  "desc": "单一中心锚点，评估基本极坐标方位与距离感知力",
~~~~~

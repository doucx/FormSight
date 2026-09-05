## [COMMIT] feat(angle_estimation): add customizable angle range selector with multi-select union support

### 用户需求
用户要求为夹角大小估算卡片（`angle_estimation`）增加可配置的角度生成范围，支持将训练目标细化到特定的区间（如 0°~45°、45°~90°、90°~135°、135°~180°）并进行多选并集组合。

### 评论
该功能极大地丰富了夹角估算卡片的专项训练维度。通过提供 4 个象限区间的多选开关以及“全角度”、“纯锐角”、“纯钝角”等一键快捷预设，用户可以精准针对锐角或钝角薄弱区间进行高强度针对性训练，提升了空间直觉训练的科学性与灵活性。

### 目标
1. 扩展 `types.ts`，引入 `AngleRangePreset` 类型及生成选项参数接口。
2. 完善 `generator.ts`，让题目生成器依据所选区间并集均匀采样并生成限定区间内的目标角度。
3. 扩展中英文国际化语言包 (`zh-CN.json` / `en-US.json`)，补全区间与预设的翻译词条。
4. 更新 `index.tsx` 的 `AngleEstimationSettings` 与设置面板渲染逻辑 (`renderSettings`)，提供直观的区间勾选网格及快捷预设按钮。

### 基本原理
按照 Quipu 协议规范，所有文件系统变更（`patch_file`）已在上一个独立的 WIP 计划中完成并通过验证。本计划专职用于将这些改动作为一个高质量的逻辑原子单元提交到 Git 仓库中。

### 标签
#intent/build #flow/ready #priority/high #comp/cards #concept/ui #concept/config #scope/ux #ai/instruct #task/domain/card #task/object/angle-estimation-range #task/action/feature-addition #task/state/end

---

### Script

#### Acts 1: 将改动加入暂存区并创建 Git 提交

~~~~~act
git_add
src/cards/angle_estimation/types.ts
src/cards/angle_estimation/locales/zh-CN.json
src/cards/angle_estimation/locales/en-US.json
src/cards/angle_estimation/utils/generator.ts
src/cards/angle_estimation/index.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(angle_estimation): add customizable angle range selector with multi-select union support

- Added AngleRangePreset ('0_45' | '45_90' | '90_135' | '135_180') and generator options in types.ts.
- Updated generator.ts to sample target angles uniformly from the union of user-selected angle ranges.
- Added localization strings for angle ranges and quick presets in zh-CN.json and en-US.json.
- Enhanced card settings and UI panel in index.tsx with interactive multi-select grid and quick presets (All, Acute 0°-90°, Obtuse 90°-180°).
~~~~~

### 下一步建议
- **运行构建检查**：执行 `pnpm build` 确认 TypeScript 类型检查和所有模块打包完全正常。
- **开展训练体验**：在 UI 中切换至“纯锐角”或“0°~45°”区间，验证生成的夹角是否准确落入所选范围。

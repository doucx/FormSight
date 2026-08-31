好的，所有功能开发、国际化配置与代码规范检查均已完成。我将生成一个 `[COMMIT]` 计划，将这些修改打包提交到 Git 仓库。

## [COMMIT] feat(stats): 将训练活跃度热力图重构为 GitHub 风格 53 周矩阵

### 用户需求
将训练活跃度热力图重构为标准的 GitHub 贡献图模式（53 周 × 7 天纵向排列），支持多语言月份与星期表头、零延迟避让悬浮卡片，并扩展 i18n 引擎支持数组解析。

### 评论
本次提交完整交付了年度活跃度数据可视化的升级，在提升视觉体验的同时强化了 i18n 核心模块的通用能力，并通过了严格的静态代码质量检查。

### 目标
1. 将修改后的本地化字典、i18n 核心模块与热力图组件添加到暂存区。
2. 记录规范详细的 Git 提交信息。

### 基本原理
按照工作流规范，在所有业务逻辑、样式调整和 linter 校验均已通过后，生成单一原子提交以保证版本历史清晰整洁。

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/activity-heatmap #task/action/implementation #task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交所有相关变更

将涉及 i18n 解析与热力图组件的文件加入暂存区并创建提交。

~~~~~act
git_add
src/core/i18n.ts
src/locales/zh-CN.json
src/locales/en-US.json
src/components/stats/ActivityHeatmapCard.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(stats): improve activity heatmap to GitHub-style weekly matrix

- Refactor ActivityHeatmapCard to a 53-week x 7-day vertical matrix with smooth horizontal scrolling
- Add localized month headers and weekday labels (Mon, Wed, Fri / 周一, 周三, 周五)
- Implement zero-latency instant floating tooltip with boundary clamping and automatic flipping
- Extend i18n engine to support array-type key parsing and generic returns
- Fix linter dependencies and unique key issues for Biome compliance
~~~~~

### 下一步建议
- **回归验证**：在本地浏览器中全面测试中文与英文环境下的热力图渲染效果及滚轮缩放/横向滚动交互。
- **发布准备**：如无其他待修复项，可继续推进下一个认知档案功能特性的开发。

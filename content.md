所有架构精简与组件抽象工作已完成。现在将本次重构成果提交至 Git 仓库。

## [COMMIT] refactor: 提取通用看板、模态底座与表单原子组件以优化代码架构

### 用户需求
将本次重构涉及的领域配置注册表、通用看板、模态框底座、通用滑块交互 Hook 以及设置表单原子组件正式生成 Git 提交。

### 评论
本次重构大幅消除了跨模块的样板代码与状态冗余，统一了交互规范，提升了系统的扩展性与代码可维护性。

### 目标
1. 将所有新增与修改的文件加入 Git 暂存区。
2. 创建结构清晰且详尽的 Conventional Commit 提交记录。

### 基本原理
完成逻辑单元的工作并遵循 Git 提交规范，结束当前阶段的重构任务。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/architecture-refactoring #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交重构变更

~~~~~act
git_add
.
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor: 提取通用看板、模态底座与表单原子组件以优化代码架构

- 新增 DOMAINS_CONFIG 领域元数据注册表，并以 GenericDashboard 统一各领域看板渲染，移除 4 个冗余的单体 Dashboard。
- 提取 ModalShell 通用弹窗底座，统一蒙版遮罩、ESC 按键监听与 Header 结构。
- 提取 useTrackPointer 通用 Hook，收敛 HSV 滑块、单维度作答轨及负形占比滑块的 Pointer 拖拽与坐标数学映射。
- 提取 SliderMarginGroup、SettingToggleItem 与 TargetingSection 表单原子组件，大幅精简 4 个领域的设置表单。
- 优化 App.tsx 的路由调度与 Profiles 聚合状态。
~~~~~

### 下一步建议
- **弱点分析弹窗接入**：后续可考虑将 `AnalyticsModal` 与 `ColorAnalyticsModal` 进一步接入 `ModalShell`。
- **打包验证**：执行 `npm run build` 验证打包产物大小与类型正确性。

好的，我已经为您整理好当前代码库变动的提交计划。

## [COMMIT] feat(relative-color): 新增相对色感训练模块与通用领域隔离架构

### 用户需求
将当前已完成的相对色感（Relative Color Perception）功能模块、IndexedDB v4 通用实体表架构重构以及偏好设置领域隔离等一系列改动进行 Git 提交。

### 评论
本次提交引入了基于 OKLab 感知均匀色彩空间的相对色彩矢量推移算法，同时对底层 IDB 数据存储与 UserSettings 进行平滑无损迁移重构，为后续扩展更多训练领域打下了坚实的基础。

### 目标
1. 将 package.json、源代码、测试套件等变更添加到 Git 暂存区。
2. 提交带有规范 Conventional Commits 格式与详细说明信息的 Git 节点。

### 基本原理
按照规范，所有的文件系统变更与 Git 提交操作在执行计划中严格隔离。目前所有的修改已全部应用到工作区，因此通过 `git_add` 和 `git_commit` 一次性完成逻辑单元的原子化提交。

### 标签
#intent/build #flow/ready #priority/high #scope/core #scope/ux #ai/instruct #task/domain/color #task/object/relative-color #task/action/commit #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码更改

将更改的文件添加至暂存区并生成 Git 提交。

~~~~~act
git_add
package.json
src/app.tsx
src/components/AnalyticsModal.tsx
src/components/ColorAnalyticsModal.tsx
src/components/ColorCanvas.tsx
src/components/HsvTrackSlider.tsx
src/components/RelativeColorCanvas.tsx
src/components/SettingsModal.tsx
src/utils/__tests__/db.test.ts
src/utils/__tests__/relativeColorUtils.test.ts
src/utils/__tests__/settings.test.ts
src/utils/colorUtils.ts
src/utils/db.ts
src/utils/relativeColorUtils.ts
src/utils/settings.ts
src/views/ColorDashboard.tsx
src/views/ColorTrainingView.tsx
src/views/Dashboard.tsx
src/views/Home.tsx
src/views/RelativeColorDashboard.tsx
src/views/RelativeColorTrainingView.tsx
src/views/TrainingView.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(relative-color): add relative color perception module and domain-isolated architecture

- Add OKLab-based relative color shift training module (`RelativeColorDashboard`, `RelativeColorTrainingView`, `RelativeColorCanvas`, `relativeColorUtils`).
- Upgrade IndexedDB schema to v4 with unified 3-table entity architecture (`sessions`, `records`, `user_profiles`) and migration layer.
- Refactor settings model to support domain isolation (`star`, `color`, `relative_color`).
- Extract `HsvTrackSlider` component for reusability across color modules.
- Bump package version to 0.2.5.
~~~~~

### 下一步建议
- **自动化测试校验**: 可以在命令行运行 `npm run test` 或 `npm run check` 确保 CI/CD 检查无误。
- **构建预览**: 运行 `npm run build` 验证打包是否正常。

## [COMMIT] feat(color-sense): 将滑块极值吸附感应区大小暴露为可配置设置项

### 用户需求
用户要求将之前实现的 12px 色感滑块吸附外延感应区大小封装为一个可配置的设置项，并允许在全局偏好设置弹窗中进行调整（支持 0px / 8px / 12px / 20px）。

### 评论
本批次工作仅包含 Git 提交相关指令，严格遵循“文件修改与 Git 提交互斥”的约束。

### 目标
1. 将当前改动添加至 Git 暂存区。
2. 生成符合 Conventional Commits 规范的 Git 提交。

### 基本原理
按照 ACA 协议约束，将之前完成的所有文件变更进行原子化 Git 提交，以确保持久化状态的稳健性。

### 标签
#intent/tooling #flow/ready #priority/medium #comp/build #concept/sync #scope/dx #ai/instruct #task/domain/settings #task/object/slider-hit-margin #task/action/git-commit #task/state/end

---

### Script

#### Acts 1: 添加修改至暂存区并提交

~~~~~act
git_add
src/utils/settings.ts
src/components/ColorCanvas.tsx
src/views/ColorTrainingView.tsx
src/components/SettingsModal.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(color-sense): expose slider hit margin as a user preference setting

- Added `sliderHitMargin` to UserSettings and default configuration (default 12px).
- Updated ColorCanvas to accept configurable `hitMargin` and apply dynamic padding/margin for extended hit zones.
- Connected sliderHitMargin from settings state through ColorTrainingView down to ColorCanvas.
- Added a configuration section in SettingsModal allowing users to switch between 0px (off), 8px, 12px, and 20px hit margins.
~~~~~

### 下一步建议
- 整个色感滑块极值吸附功能及其可配置化设置已全部完成。您可以正常进行视觉训练或继续其他模块的探索。

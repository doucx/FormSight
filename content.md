根据协议约束（`d3-constraint-quipu-plan-script-rules-D3-P2`：任何造成文件系统变更的 `act` 指令必须与 Git 提交相关指令在不同的计划中执行），现在所有文件修改已完成且处于稳定状态。我将为您生成一个 `[COMMIT]` 阶段的计划，用于将上述所有改动提交到 Git 仓库。

## [COMMIT] feat(settings): 添加单卡、全局及全量设置一键恢复默认配置功能

### 用户需求
用户确认所有关于“恢复默认配置”和“重置所有设置”的代码修改已完成，现在需要将其作为一个完整的逻辑交付单元提交至 Git 版本库。

### 评论
本次提交包含了多语言词典扩充、Store 中的重置动作扩展、弹窗 Header 的重置按钮集成，以及数据治理面板中“重置所有设置”按钮的落位。修改原子完整，符合标准的 Git 提交规范。

### 目标
1. 将修改后的文件添加至 Git 暂存区。
2. 生成内容规范、详尽的 Conventional Commits 提交。

### 基本原理
按照 Quipu 的原子化与隔离原则，文件变更和 Git 提交必须在不同的 plan 中执行。现在代码已通过验证，直接执行 `git_add` 与 `git_commit`。

### 标签
#intent/build #flow/ready #priority/high 
#comp/cli #concept/config #scope/dx 
#ai/instruct
#task/domain/settings
#task/object/preference-reset
#task/action/implementation
#task/state/end

---

### Script

#### Acts 1: 添加更改至暂存区并创建提交

~~~~~act
git_add
src/locales/zh-CN.json
src/locales/en-US.json
src/stores/settingsStore.ts
src/components/modals/SettingsModal.tsx
src/components/modals/GlobalSettingsModal.tsx
src/components/settings/sections/DataGovernanceSection.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(settings): add one-click reset to defaults for cards and global preferences

- Added `resetCardSettingsAction` and `resetGlobalSettingsAction` in settings store to revert card-level and global configurations back to factory defaults.
- Added `resetAllSettingsAction` to restore all application preferences and card parameters at once.
- Integrated a discrete reset button in the header action slot of both `SettingsModal` and `GlobalSettingsModal` for spatial efficiency.
- Added a "Reset All Settings" button with a confirmation modal in the Data Governance settings section right above the "Delete All Data" action.
- Updated bilingual dictionaries (zh-CN & en-US) with proper localization strings for the new reset features.
~~~~~

### 下一步建议
- **全面审查**: 建议在生产环境中对各项重置功能进行冒烟测试，确保在重置后能够即时触发对应的 Toast 提示并正确刷新界面状态。

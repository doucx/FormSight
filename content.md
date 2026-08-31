好的，我们已经完成了全局排版字号的重构升级。现在将本次变更作为一个完整的逻辑单元提交到 Git 仓库。

## [COMMIT] refactor(ui): 全局重构微小字体尺寸为标准 text-xs 规范

### 用户需求
将本次字体排版自动化重构所涉及的脚本与源码修改提交至 Git 仓库。

### 评论
完成了从任意值微小字号（9px~11px）到 Tailwind 标准字阶 `text-xs` (12px) 的全局统一，提升了界面的整体可读性与无障碍对比度，消除了视觉感知训练中的额外眼疲劳。

### 目标
1. 将重构脚本 `scripts/refactor_typography.py` 及 `src/` 目录下所有已更新的组件与视图文件添加到 Git 暂存区。
2. 创建语义清晰且符合 Conventional Commits 规范的 Git 提交记录。

### 基本原理
按照 Quipu 协议规范，在独立且纯粹的 `[COMMIT]` 阶段执行 `git_add` 与 `git_commit` 指令，保证所有代码变更的原子化归档与可追溯性。

### 标签
#intent/refine #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/typography #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交排版系统重构代码

~~~~~act
git_add
scripts/refactor_typography.py
src/
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(ui): standardize micro font sizes to text-xs across all components

- Added automated refactoring script `scripts/refactor_typography.py` to handle arbitrary micro font classes (`text-[9px]`, `text-[10px]`, `text-[11px]`).
- Replaced micro font sizes across cards, navigation, stats, and training views with standard `text-xs` (12px).
- Consolidated composite responsive typography classes to eliminate visual fatigue and improve typographic hierarchy.
~~~~~

### 下一步建议
- **多端设备实机体验**：在移动端浏览器或不同缩放比例屏幕上验证更新后的排版舒适度。
- **扩展更多主题对比度**：后续可针对深色模式下的 `text-muted-foreground` 色阶对比度做进一步的 WCAG AA 无障碍优化。

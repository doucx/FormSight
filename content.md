## [COMMIT] fix(ui): 统一按钮边框盒模型并修复暗色模式下切换闪烁

### 用户需求
用户要求创建 Git 提交，将刚刚修复的暗色模式下按钮边框闪烁问题提交到版本库中。

### 评论
该提交将彻底解决 UI 状态切换时的视觉瑕疵，确保设计系统的交互符合暗色模式规范。

### 目标
1. 将修改后的 `src/components/ui/button.tsx` 添加至 Git 暂存区。
2. 创建符合 Conventional Commits 规范的结构化 Commit。

### 基本原理
按照 Quipu 执行协议，文件系统变更与 Git 提交操作必须严格在独立的计划中执行。当前计划为纯 Git 提交计划，状态标记为 `[COMMIT]`。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/button-component #task/action/git-commit #task/state/end

---

### Script

#### Acts 1: 暂存并提交修复文件

~~~~~act
git_add
src/components/ui/button.tsx
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
fix(ui): 统一按钮边框盒模型并修复暗色模式下切换闪烁

1. 在 buttonVariants 基础类中统一加入 `border border-transparent` 盒模型占位，防止变体切换时因缺失边框属性而回退为 currentColor（纯白）产生过渡闪烁。
2. 将过渡效果由 `transition-all` 精准收敛为 `transition-colors`，避免非颜色属性的插值抖动。
3. 增加 `focus:outline-none` 以消除点击或切换焦点时的默认外轮廓闪烁。
~~~~~

### 下一步建议
- 整个暗色模式下的导航边框闪烁修复任务已圆满结束，您可以运行测试套件或继续执行其他开发任务。

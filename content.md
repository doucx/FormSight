好的，基于您提供的 Git 差异和“创建提交”的请求，我已经按照 Quipu 协议为您准备好了 `[COMMIT]` 计划。

由于本次任务是直接对工作区中的变更创建 Git 提交，且未涉及新的文件系统写入，我们直接执行 Git 暂存与提交操作。

***

你的要求已经收到。我将为你生成一个包含 Git 暂存与提交操作的 Quipu 计划。

## [COMMIT] refactor(views): 提取通用视图组件并统一数据库路径导入

### 用户需求
用户希望将当前工作区中完成的代码重构与组件提取变更（包括通用 Canvas/2AFC/Nafc/Slider 视图组件的统一、数据库路径引用的规范化等）进行一个规范的 Git 提交。

### 评论
本次重构大幅减少了各个领域视图组件中的代码重复，统一了 Preact 组件的渲染模式与交互封装，并修正了数据库模块的引用路径。将其作为一个逻辑完整的单元进行提交，有助于保持版本历史的清晰和可维护性。

### 目标
1. 使用 `git add` 将所有修改过的源文件和新增的视图组件添加到暂存区。
2. 创建一个结构清晰、符合 Conventional Commits 规范的 `git commit`。

### 基本原理
为了确保提交的信息准确传达重构意图，我们将遵循 Conventional Commits 规范，将此次变更归类为 `refactor`，并详细列出在视图重构和模块路径规范化方面的改动。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/ui #scope/core #ai/instruct #task/domain/ui #task/object/views-refactor #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 添加更改到 Git 暂存区并进行提交

我们将所有重构后的文件加入暂存区，并生成规范的 Git 提交。

~~~~~act
git_add
.
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(ui): extract standard view components and unify database imports

- Extracted reusable standard view wrappers: CanvasView, Standard2AfcView, StandardNafcView, and StandardSliderView to eliminate code duplication across domains (Abstraction, Angle, Relative Color, Negative Space).
- Normalized database import paths from root 'src/utils/db' to explicit 'src/utils/db/index'.
- Cleaned up unused types, state hooks, and legacy generators across training domains.
- Improved canvas rendering lifecycle management with explicit dependency arrays.
~~~~~

### 下一步建议
- **运行测试套件**: 执行 `npm test` 或对应的测试命令，确保此次大规模组件重构没有引入任何逻辑回归。
- **构建检查**: 执行 `npm run build` 验证 Preact 应用能够正常打包编译无报错。

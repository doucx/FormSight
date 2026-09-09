好的，既然修改已经完成且符合预期，我将生成一个 `[COMMIT]` 计划，将上述所有变更安全地提交到 Git 仓库中。

## [COMMIT] refactor(cards): 引入难度自适应色块抖动并修正 4AFC 卡片 ID

### 用户需求
用户要求对“主调色群提炼”和“调性基底归位”卡片进行微调，让低难度下的随机散差极度收敛、更易辨识，并完成“调性基底归位”卡片从旧的错误 ID `abs_td_palette_2afc` 到正确规范 ID `abs_td_palette_4afc` 的全面重构与重命名。

### 评论
这是一个重要的视觉认知体验优化与契约规范修复。通过将马赛克瓦片的色相/饱和度/明度扰动与难度等级 $t$ 线性挂钩，初学者在低难度下可以获得清晰、干净的同色系视觉暗示，而随着层阶上升，混色干扰逐步展开，从而符合科学的渐进式刻意训练原则。同时，目录、组件与卡片 ID 的统一重构彻底消除了历史命名不一致的隐患。

### 目标
1. 将修改后的代码与重构的目录添加至 Git 暂存区。
2. 创建内容详尽、符合 Conventional Commits 规范的 Git 提交。

### 基本原理
按照 Quipu 的原则，文件修改类操作（`write_file`, `move_file` 等）与 Git 提交操作（`git_add`, `git_commit`）必须在不同的独立计划中执行。当前文件系统已经过安全变更，现在我们将其实施归档。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #concept/executor #scope/core #ai/instruct #task/domain/color #task/object/palette-clustering-and-4afc #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 将所有修改与重命名后的文件添加至 Git 暂存区

~~~~~act
git_add
~~~~~

#### Acts 2: 提交代码变更

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(cards): introduce difficulty-adaptive tile jitter and fix 4afc card id

- Adaptively scale the hue, saturation, and lightness jitter ranges based on the current difficulty level (t = 0..1) in 'abs_palette_clustering' and 'abs_td_palette_4afc'. Low levels now present near-pure, clean chromatic groupings while high levels ramp up complex noise interference.
- Rename legacy 'abs_td_palette_2afc' card directory, component, and manifests to 'abs_td_palette_4afc' to accurately reflect its 4-alternative forced choice (4AFC) design pattern and clean up registry naming contracts.
~~~~~

### 下一步建议
- **回归测试**：可以通过运行测试套件（如 `npm test`）来确保系统整体运行平稳。
- **视觉微调**：如需进一步调整抖动曲线（例如从线性改为幂函数），可随时在各自的 `generator.ts` 中微调参数 $t$ 的幂次。

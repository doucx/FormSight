好的，我们将本次完成的所有改进（自适应动态圆点半径 + 鼠标靠近网格点时自动隐藏系统光标）作为一个逻辑完整的单元进行 Git 提交。

下面是为您生成的 Quipu 提交计划：

## [COMMIT] feat(ui): 实现自适应点半径及靠近网格点时自动隐藏光标

### 用户需求
将之前完成的“高难度下动态缩小密集点半径”以及“鼠标靠近点时自动隐藏系统光标以避免遮挡”这两项改动进行打包提交。

### 评论
该提交极大地提升了高难度关卡下的用户体验和手眼协同点击的精准度。改动逻辑自洽且边界清晰，适合作为一个独立的 `feat` 单元。

### 目标
1. 将修改后的 `src/utils/geometry.ts` 与 `src/components/StarCanvas.tsx` 添加到 Git 暂存区。
2. 生成符合 Conventional Commits 规范的 Git Commit。

### 基本原理
按照 ACA 协议中“文件变更操作与 Git 提交操作互斥”的原则，本次单独执行 `[COMMIT]` 计划，确保在用户确认无误后完成版本固化。

### 标签
#intent/build #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/star-canvas-dots #task/action/implementation #task/state/end

---

### Script

#### Acts 1: 添加文件到 Git 暂存区

~~~~~act
git_add
src/utils/geometry.ts
src/components/StarCanvas.tsx
~~~~~

#### Acts 2: 提交代码变更

~~~~~act
git_commit
~~~~~
~~~~~text
feat(ui): implement dynamic dot radius and cursor-none on hover

- Added getDynamicDotRadius in geometry.ts to dynamically shrink circle radii when dot-to-dot distance is small in high-level/dense modes, preventing visual overlap and touch confusion.
- Updated StarCanvas.tsx to dynamically apply cursor-none when hoverPoint is active, hiding the system cursor to prevent it from blocking tiny target dots during high-precision tapping.
~~~~~

### 下一步建议
- **回归测试**: 可以尝试进行一次完整的高难度（Level 10+）训练轮次，体验密集点阵下的自适应渲染和无光标遮挡点击。
- **数据导出**: 测试通过后，可随时通过仪表盘的导出按钮备份当前的答题数据库与配置。

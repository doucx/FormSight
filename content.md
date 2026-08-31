好的，我们已经完成了 FormSight 项目目录分层架构的系统重构、模块解耦、静态引用扫描诊断以及全量测试验证。

现在我们将本次重构的所有成果提交至 Git 仓库。

## [COMMIT] refactor(arch): 重构工程目录分层结构并规范模块导入

### 用户需求
将本次目录分层重构（包括 `src/storage/` 统一仓储层抽离、`src/core/canvas/` 绘图管线归并、`src/components/modals/` 弹窗收拢、类型与契约整合、`HomeView` 命名规范化及全工程 import 引用修复）作为完整的工作单元提交到 Git 仓库。

### 评论
本次重构彻底解决了项目从原型期迭代累积的路径混乱与模块职责倒置问题，建立了清晰的单向数据流与零特例的扩展包规范体系，为后续扩展新训练 Pack 奠定了坚固的架构基础。

### 目标
1. 将所有结构重构涉及的源码、工具脚本与测试用例暂存。
2. 生成符合 Conventional Commits 规范的详细提交记录。

### 基本原理
按照 Quipu 协议将所有已验证的代码变更原子化提交，记录架构演进的关键里程碑。

### 标签
#intent/refine #flow/ready #priority/high #comp/core #comp/build #concept/state #concept/executor #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/project-structure #task/action/refactor #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交所有重构变更

~~~~~act
git_add
.
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(arch): restructure project layout and unify module layer architecture

- Elevate data persistence and store layers to `src/storage/` (IndexedDB, planStorage, settingsStorage, SystemRepository facade).
- Consolidate canvas rendering and analytics chart visualizers under `src/core/canvas/`.
- Organize loose root components into categorized folders (`src/components/modals/`, `src/components/common/`).
- Merge training plugin definitions into `src/core/contracts.ts` and eliminate `src/config/trainingPlugins.tsx`.
- Standardize view component naming convention (`Home.tsx` -> `HomeView.tsx`).
- Introduce automated import analysis & validation script `scripts/check_imports.py`.
- Resolve circular dependency between registry and settings via lazy accessor evaluation.
- All unit tests and static import audits verified and passed.
~~~~~

### 下一步建议
1. **后续功能演进**：可以在重构后的 `src/packs/` 目录下轻松添加新的感知训练扩展包（如立体空间透视、动态笔势、色彩微差判别等）。
2. **CI 集成**：可考虑将 `python3 scripts/check_imports.py` 添加到 `package.json` 中的 `check` 脚本序列中，持续保障模块引用安全。

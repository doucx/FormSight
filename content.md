好的，全系统双语国际化（i18n）架构重构、各扩展包私有语言包抽离以及静态合规检查脚本已全部就绪。

我将生成一个 `[COMMIT]` 计划，将当前工作区的全部变更暂存并创建结构化的 Git 提交。

## [COMMIT] feat: 实现全系统双语国际化支持与 i18n 自动化检查门禁

### 用户需求
将当前关于全系统双语国际化（中/英双语对齐）、全局与 Pack 级分层词典架构、界面语言即时切换以及 i18n 自动化静态检查门禁的修改创建 Git 提交。

### 评论
本次版本升级 (v0.5.0) 完整实现了 FormSight 的双语国际化支持，通过建立全局与扩展包私有语言包解耦挂载机制，消除了所有硬编码中文字符串，并配套了完善的静态合规检查门禁脚本（`scripts/check_i18n.py`），为后续拓展更多语言和独立发布国际版本奠定了坚实基础。

### 目标
1. 将所有新增与修改的文件添加到 Git 暂存区。
2. 创建符合 Conventional Commits 规范的提交记录，详细阐述 i18n 架构设计与变更内容。

### 基本原理
按照工作流规范，在完成全量修改并确认所有功能与国际化词典对齐后，使用独立的 `[COMMIT]` 计划执行原子化版本提交。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #concept/config #scope/core #scope/ux #ai/instruct #task/domain/ui #task/object/i18n-system #task/action/integration #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交代码变更

我们将修改的文件和新增的语言包与门禁脚本添加到暂存区并创建提交。

~~~~~act
git_add
.
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(i18n): implement comprehensive internationalization (i18n) and linting suite

- Add core i18n manager (`src/core/i18n.ts`) supporting reactive translation, namespace mounting, and deep path resolution.
- Extract global dictionaries (`zh-CN.json` / `en-US.json`) and pack-level dictionaries across all visual domains.
- Provide real-time language switcher in `GlobalSettingsModal` with persistent local storage support.
- Refactor all UI components, views, canvas visualizers, and plan templates to use declarative translation keys (`t()`).
- Add automated static audit script (`scripts/check_i18n.py`) checking locale parity, key usage validity, and hardcoded Chinese in source code.
- Bump project version to 0.5.0 in `package.json`.
~~~~~

### 下一步建议
- **CI 门禁集成**: 可在 GitHub Actions 或 pre-commit hook 中集成 `python3 scripts/check_i18n.py`，确保后续提交不会遗漏多语言翻译或引入硬编码字符串。
- **扩展更多语言**: 依托当前的扩展包私有词典挂载架构，未来可轻松扩展日语 (ja-JP) 等其他语言包。

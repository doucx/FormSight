## [COMMIT] feat(db): 支持用户偏好设置随全量 JSON 备份同步导出与恢复

### 错误分析

> 本次操作为用户主动请求的 Git 提交阶段，无错误修复背景，跳过错误分析。

### 用户需求
将用户修改后的代码（包含支持偏好设置导出与导入的 `db.ts` 逻辑，以及带有 `localStorage` 内存垫片与偏好设置验证的 `db.test.ts` 测试）提交到 Git 版本库中。

### 评论
该变更完善了 FormSight 系统的数据备份与恢复闭环，使用户在导出全量 JSON 时能够完整保留个性化偏好参数，并通过单体测试保障了其在非浏览器环境下的鲁棒性。

### 目标
1. 将 `src/utils/db.ts` 与 `src/utils/__tests__/db.test.ts` 的变更添加至 Git 暂存区。
2. 创建符合 Conventional Commits 规范的 Git Commit。

### 基本原理
按照 ACA 协议及 Quipu 任务运行规范，在文件系统变更完成后，通过独立的提交计划将代码状态持久化至 Git 历史版本中。

### 标签
#intent/build #flow/ready #priority/high #comp/storage #comp/tests #concept/config #concept/state #scope/core #ai/instruct #task/domain/storage #task/object/settings-backup #task/action/implementation #task/state/end

---

### Script

#### Acts 1: 添加文件至暂存区

~~~~~act
git_add
src/utils/db.ts
src/utils/__tests__/db.test.ts
~~~~~

#### Acts 2: 提交更改

~~~~~act
git_commit
~~~~~
~~~~~text
feat(db): support exporting and importing user settings in full JSON backup

- Updated exportAllData() to include local user settings (UserSettings) in the exported JSON object.
- Updated importAllData() to automatically restore user settings upon importing JSON backups.
- Added a localStorage memory persistence shim at the top of db.test.ts to support Web Storage API testing in lightweight Node environments.
- Added comprehensive unit tests verifying successful backup and restoration of custom grid size and auto-next preferences.
~~~~~

### 下一步建议
- **自动化构建**: 可执行 `npm run build` 确保 TypeScript 编译通过，并运行 `npm run test` 确保所有单体测试绿灯通过。
- **发布准备**: 准备好进行 v0.2.2 版本的打包与发布。

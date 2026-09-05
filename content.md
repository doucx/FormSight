现在开始执行第二步：加固卡片词典 Schema 校验测试用例，将 `instruction` 与 `taskHint` 纳入废弃键黑名单，确立自动化门禁防线。

## [WIP] test(cards): 加固卡片词典 Schema 测试门禁以杜绝废弃同义词

### 用户需求
在测试用例 `src/cards/__tests__/locales-schema.test.ts` 中补全规范细则所废弃的无上下文同义词（`instruction`、`taskHint`），确保 CI 和本地测试能够严格拦截任何试图重新引入这些废弃键名的修改。

### 评论
在完成了卡片词典与核心组件对 `instruction` 的清理之后，加固测试门禁是防止规范退化（Regression）最关键的一道防线。将 `instruction` 和 `taskHint` 加入 `FORBIDDEN_ALIAS_KEYS` 后，任何未经规范收敛的私有词典提交都会直接在测试阶段被熔断。

### 目标
1. 修改 `src/cards/__tests__/locales-schema.test.ts`，将 `'instruction'` 与 `'taskHint'` 添加至 `FORBIDDEN_ALIAS_KEYS` 黑名单。
2. 完善注释说明，明确指向“全面废弃同义词，统一归口为 `hint`”的设计准则。

### 基本原理
测试文件采用 `getAllKeys` 递归遍历各卡片私有词典中的所有键路径。将 `'instruction'` 和 `'taskHint'` 列入 `FORBIDDEN_ALIAS_KEYS` 后，断言 `expect(keys).not.toContain(forbiddenKey)` 会在全量卡片的语言包加载时逐一执行深度校验。

### 标签
#intent/tooling #flow/ready #priority/high #comp/tests #scope/dx #ai/instruct #task/domain/testing #task/object/locales-schema #task/action/test-hardening #task/state/continue #task/status/active

---

### Script

#### Acts 1: 在黑名单中加入 instruction 与 taskHint 废弃键

将 `instruction` 和 `taskHint` 引入 `FORBIDDEN_ALIAS_KEYS` 严格拦截名单。

~~~~~act
patch_file
src/cards/__tests__/locales-schema.test.ts
~~~~~
~~~~~typescript
const FORBIDDEN_ALIAS_KEYS = [
  'areaHint',
  'ratioHint',
  'vertexHint',
  'prompt', // 裸 prompt 废弃；题干标签统一使用 promptTitle，操作说明统一使用 hint
  'memoryStimulusHint',
  'memoryRecallHint',
];
~~~~~
~~~~~typescript
const FORBIDDEN_ALIAS_KEYS = [
  'areaHint',
  'ratioHint',
  'vertexHint',
  'instruction', // 全面废弃同义词；操作指引统一归口为 hint
  'taskHint', // 全面废弃同义词；操作指引统一归口为 hint
  'prompt', // 裸 prompt 废弃；题干标签统一使用 promptTitle，操作说明统一使用 hint
  'memoryStimulusHint',
  'memoryRecallHint',
];
~~~~~

### 下一步建议
测试门禁已加固完成。两步重构计划（词典收敛与测试加固）均已就绪。
建议：
1. 运行本地测试套件确认所有卡片词典均符合新规范：
   ```bash
   pnpm test:run src/cards/__tests__/locales-schema.test.ts
   ```
2. 确认测试全部通过后，生成最终的 `[COMMIT]` 计划提交本轮变更。

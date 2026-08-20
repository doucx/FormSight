测试失败的原因是在精简 `getProfile` 的函数签名（从旧版 `(domain, mode)` 双参数重载改为单参数 `cardId`）后，`db.test.ts` 中的单元测试仍在使用旧版双参数形式调用。

## [WIP] fix(test): 修复单元测试中 getProfile 旧签名调用

### 错误分析
在上一轮重构中，`getProfile` 移除了历史兼容的双参数重载 `getProfile(domain, mode)`，规范为单参数 `getProfile(cardId: string)`。
单元测试 `src/utils/__tests__/db.test.ts` 中第 44 行仍为 `getProfile('star', 'single')`，JavaScript 运行时将第一个参数 `'star'` 传入了单参数函数中，去查询主键为 `'star'` 的 profile，而实际存入的主键为 `'single'`（或指定的 `cardId`），导致返回 `null` 并断言失败。

### 用户需求
更新 `src/utils/__tests__/db.test.ts` 中的测试用例，提供标准的 `cardId`（`'star_single'`）并在调用 `getProfile` 时使用新签名 `getProfile('star_single')`。

### 评论
单元测试需要与重构后的现代数据模型及 API 签名保持 100% 同步。

### 目标
1. 在 `db.test.ts` 的 `rec_1` 记录中显式指定 `cardId: 'star_single'`。
2. 将 `getProfile('star', 'single')` 修正为 `getProfile('star_single')`。

### 基本原理
通过显式传递与获取标准 `cardId`，验证底层 IndexedDB `user_profiles` 表基于 `cardId` 主键进行存取的正确性。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #concept/state #scope/core #ai/instruct #task/domain/testing #task/object/db-unit-tests #task/action/fix #task/state/continue

---

### Script

#### Acts 1: 修正 `db.test.ts` 中的 `getProfile` 调用

~~~~~act
patch_file
src/utils/__tests__/db.test.ts
~~~~~
~~~~~typescript
    it('should save trial record and automatically update user profile', async () => {
      const record: UnifiedTrialRecord = {
        id: 'rec_1',
        sessionId: 'sess_1',
        domain: 'star',
        mode: 'single',
        timestamp: Date.now(),
        difficultyLevel: 5,
        isHit: true,
        responseTimeMs: 800,
        details: { angleDegree: 45 },
      };

      await saveTrialRecord(record);

      const records = await getTrialRecords('star', 'single');
      expect(records.length).toBe(1);
      expect(records[0].id).toBe('rec_1');
      expect(records[0].isHit).toBe(true);
      expect((records[0] as Record<string, unknown>).angleDegree).toBe(45);

      const profile = await getProfile('star', 'single');
      expect(profile).not.toBeNull();
      expect(profile?.totalTrials).toBe(1);
      expect(profile?.totalHits).toBe(1);
      expect(profile?.currentLevel).toBe(5);
      expect(profile?.bestLevel).toBe(5);
    });
~~~~~
~~~~~typescript
    it('should save trial record and automatically update user profile', async () => {
      const record: UnifiedTrialRecord = {
        id: 'rec_1',
        sessionId: 'sess_1',
        cardId: 'star_single',
        domain: 'star',
        mode: 'single',
        timestamp: Date.now(),
        difficultyLevel: 5,
        isHit: true,
        responseTimeMs: 800,
        details: { angleDegree: 45 },
      };

      await saveTrialRecord(record);

      const records = await getTrialRecords('star', 'single');
      expect(records.length).toBe(1);
      expect(records[0].id).toBe('rec_1');
      expect(records[0].isHit).toBe(true);
      expect((records[0] as Record<string, unknown>).angleDegree).toBe(45);

      const profile = await getProfile('star_single');
      expect(profile).not.toBeNull();
      expect(profile?.totalTrials).toBe(1);
      expect(profile?.totalHits).toBe(1);
      expect(profile?.currentLevel).toBe(5);
      expect(profile?.bestLevel).toBe(5);
    });
~~~~~

### 下一步建议
1. 观察 Vitest 自动化测试套件是否全量通过（44/44 passed）。
2. 执行 `npm run check` 确保代码格式和 Lint 规则无误。

这是因为在 Phase 1 重构中，我们将画像统计字段由旧名称 `totalTrainedCards` 重命名为了更符合领域语义的 `totalTrials`，而单元测试文件 `src/utils/__tests__/db.test.ts` 仍在使用旧属性名进行断言。

我们现在更新单元测试断言，并在 `UnifiedProfileData` 类型中保留可选的 `totalTrainedCards` 兼容字段。

## [WIP] fix: 更新单元测试以适配重命名后的 totalTrials 画像字段

### 错误分析
1. **错误定位**：`src/utils/__tests__/db.test.ts:46:42` 处断言 `profile?.totalTrainedCards` 为 1，实际得到 `undefined`。
2. **根因**：Phase 1 将画像数据实体中的 `totalTrainedCards` 字段正式重命名为 `totalTrials`，新写入的数据对象只包含 `totalTrials` 字段，导致旧单测未同步更新而报错。
3. **修复方案**：
   - 更新 `src/utils/__tests__/db.test.ts`，将断言字段由 `totalTrainedCards` 改为 `totalTrials`。
   - 在 `src/utils/db/schema.ts` 的 `UnifiedProfileData` 接口中添加 `totalTrainedCards?: number` 兼容属性，增强类型容错能力。

### 用户需求
修复单元测试中的断言失败，确保全量测试套件 100% 绿灯通过。

### 评论
字段重命名是偿还技术债的标准动作，保持单测与最新模型契约一致是保证重构质量的关键环节。

### 目标
1. 更新 `src/utils/__tests__/db.test.ts` 中对 `totalTrials` 的断言。
2. 运行 `npm run test` 与 `npm run check` 确保测试与代码规范全部通过。

### 基本原理
将测试代码中过时的字段引用更新为最新模型定义的 `totalTrials`，并在数据层定义中兼容旧命名。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #concept/state #scope/core #ai/instruct #task/domain/testing #task/object/database-test #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 更新 `src/utils/__tests__/db.test.ts`

~~~~~act
patch_file
src/utils/__tests__/db.test.ts
~~~~~
~~~~~typescript.old
      const profile = await getProfile('star', 'single');
      expect(profile).not.toBeNull();
      expect(profile?.totalTrainedCards).toBe(1);
      expect(profile?.totalHits).toBe(1);
~~~~~
~~~~~typescript.new
      const profile = await getProfile('star', 'single');
      expect(profile).not.toBeNull();
      expect(profile?.totalTrials).toBe(1);
      expect(profile?.totalHits).toBe(1);
~~~~~

#### Acts 2: 在 `src/utils/db/schema.ts` 补充兼容类型定义

~~~~~act
patch_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript.old
export interface UnifiedProfileData {
  cardId: string;
  domain: TrainingDomain;
  mode: string;
  currentLevel: number;
  bestLevel: number;
  totalTrials: number;
  totalHits: number;
  updatedAt: number;
}
~~~~~
~~~~~typescript.new
export interface UnifiedProfileData {
  cardId: string;
  domain: TrainingDomain;
  mode: string;
  currentLevel: number;
  bestLevel: number;
  totalTrials: number;
  totalTrainedCards?: number;
  totalHits: number;
  updatedAt: number;
}
~~~~~

### 下一步建议
1. 确认所有测试用例已全部通过。
2. 推进 **Phase 2: 弱点分析插件化（OCP）与业务功能闭环**，新建 `src/config/analyticsPlugins.tsx` 并支持所有 4 个感知领域的弱点诊断与全态结算。

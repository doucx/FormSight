我已经定位了 TypeScript 类型检查报错的原因并制定了修复方案。在卡片一等公民 (Card-Centric) 架构重构中，旧有的 `PackMeta` 和 `packId` 概念已被彻底废弃并统一收敛至 `domain`（视觉域）。目前有 4 个文件仍残留了未使用的废弃导入或引用了已被移除的 `packId` 属性。

## [WIP] fix: 清理废弃 PackMeta 导入并修正 card.packId 字段引用

### 错误分析

1. **未使用的废弃类型导入 (`TS6192`, `TS2305`, `TS6196`)**:
   - `src/core/contracts.ts` 导入了 `CardDefinition, PackMeta`，但该模块内并未实际使用它们，且 `src/types/card.ts` 中已无 `PackMeta` 导出。
   - `src/core/registry.ts` 从 `../types/card` 中导入了已不存在且未使用的 `PackMeta`。
2. **废弃属性访问 (`TS2339`)**:
   - `src/storage/db/importExport.ts`（第 167、179、196 行）在还原导入数据时访问了 `card.packId`，而在新规范中 `CardDefinition` 仅保留 `domain`。
   - `src/storage/db/queries.ts`（第 22、110 行）在保存做答与会话时访问了 `canonicalCard.packId`，应改为读取 `canonicalCard.domain`。

### 用户需求

修复项目中所有的 TypeScript 编译类型错误，彻底清理对 `PackMeta` 及 `packId` 的废弃引用，确保类型检查通过且平铺卡片架构稳健运行。

### 评论

这是在卡片化架构阶段 5 清理旧 Pack 概念残留的关键收尾步骤。消除这些旧字段引用后，底层持久化层（IndexedDB 与导入导出）将完全对齐到卡片的 `domain` 视觉域体系。

### 目标

1. 移除 `src/core/contracts.ts` 中无用的 `../types/card` 导入。
2. 移除 `src/core/registry.ts` 中的 `PackMeta` 导入声明。
3. 将 `src/storage/db/importExport.ts` 中的 `card.packId` 替换为 `card.domain`。
4. 将 `src/storage/db/queries.ts` 中的 `canonicalCard.packId` 替换为 `canonicalCard.domain`。

### 基本原理

通过字节级 `patch_file` 精确替换遗留代码中的废弃类型与属性名，保持整体业务逻辑与存储行为的一致性，满足 TypeScript 严格类型检查要求。

### 标签

#intent/fix #flow/ready #priority/high #comp/runtime #concept/state #scope/core #ai/instruct #task/domain/architecture #task/object/card-centric-cleanup #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复 core 层的类型导入声明

移除 `contracts.ts` 与 `registry.ts` 中对已废弃 `PackMeta` 的无效引用。

~~~~~act
patch_file
src/core/contracts.ts
~~~~~
~~~~~typescript
import type { Point } from '../types';
import type { CardDefinition, PackMeta } from '../types/card';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
~~~~~
~~~~~typescript
import type { Point } from '../types';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
import type {
  CardDefinition,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  PackMeta,
  VisualDomainTag,
} from '../types/card';
~~~~~
~~~~~typescript
import type {
  CardDefinition,
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../types/card';
~~~~~

#### Acts 2: 修复 storage 层中关于 packId 的废弃字段引用

将 `importExport.ts` 与 `queries.ts` 中涉及 `packId` 的访问对齐至 `domain` 字段。

~~~~~act
patch_file
src/storage/db/importExport.ts
~~~~~
~~~~~typescript
    // 1. 导入 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const tx = db.transaction('sessions', 'readwrite');
      for (const s of parsed.sessions) {
        const cardId = s.cardId || s.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.packId : s.domain || 'core';
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
      await tx.done;
    }

    // 2. 导入 profiles
    if (parsed.profiles && parsed.profiles.length > 0) {
      const tx = db.transaction('user_profiles', 'readwrite');
      for (const p of parsed.profiles) {
        const cardId = p.cardId || p.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.packId : p.domain || 'core';
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
      await tx.done;
    }

    // 3. 分批写入海量 records (每 1500 条为一个独立事务批次)
    if (parsed.records && parsed.records.length > 0) {
      const BATCH_SIZE = 1500;
      for (let i = 0; i < parsed.records.length; i += BATCH_SIZE) {
        const batch = parsed.records.slice(i, i + BATCH_SIZE);
        const tx = db.transaction('records', 'readwrite');
        const store = tx.objectStore('records');
        for (const r of batch) {
          const cardId = r.cardId || r.mode;
          const card = registry.getCardById(cardId);
          const domain = card ? card.packId : r.domain || 'core';
          await store.put({ ...r, domain, cardId });
        }
        await tx.done;
      }
    }
~~~~~
~~~~~typescript
    // 1. 导入 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const tx = db.transaction('sessions', 'readwrite');
      for (const s of parsed.sessions) {
        const cardId = s.cardId || s.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : s.domain || 'core';
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
      await tx.done;
    }

    // 2. 导入 profiles
    if (parsed.profiles && parsed.profiles.length > 0) {
      const tx = db.transaction('user_profiles', 'readwrite');
      for (const p of parsed.profiles) {
        const cardId = p.cardId || p.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : p.domain || 'core';
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
      await tx.done;
    }

    // 3. 分批写入海量 records (每 1500 条为一个独立事务批次)
    if (parsed.records && parsed.records.length > 0) {
      const BATCH_SIZE = 1500;
      for (let i = 0; i < parsed.records.length; i += BATCH_SIZE) {
        const batch = parsed.records.slice(i, i + BATCH_SIZE);
        const tx = db.transaction('records', 'readwrite');
        const store = tx.objectStore('records');
        for (const r of batch) {
          const cardId = r.cardId || r.mode;
          const card = registry.getCardById(cardId);
          const domain = card ? card.domain : r.domain || 'core';
          await store.put({ ...r, domain, cardId });
        }
        await tx.done;
      }
    }
~~~~~

~~~~~act
patch_file
src/storage/db/queries.ts
~~~~~
~~~~~typescript
export async function saveTrialRecord(
  record: UnifiedTrialRecord,
  currentProfileLevel?: number,
): Promise<void> {
  const db = await getDB();
  const cardId = record.cardId || record.mode;
  const canonicalCard = registry.getCardById(cardId);
  const packId = canonicalCard ? canonicalCard.packId : record.domain || 'core';
  const targetProfileLevel = currentProfileLevel ?? record.difficultyLevel;
~~~~~
~~~~~typescript
export async function saveTrialRecord(
  record: UnifiedTrialRecord,
  currentProfileLevel?: number,
): Promise<void> {
  const db = await getDB();
  const cardId = record.cardId || record.mode;
  const canonicalCard = registry.getCardById(cardId);
  const packId = canonicalCard ? canonicalCard.domain : record.domain || 'core';
  const targetProfileLevel = currentProfileLevel ?? record.difficultyLevel;
~~~~~

~~~~~act
patch_file
src/storage/db/queries.ts
~~~~~
~~~~~typescript
export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const cardId = session.cardId || session.mode;
  const canonicalCard = registry.getCardById(cardId);
  const packId = canonicalCard ? canonicalCard.packId : session.domain || 'core';
  await db.put('sessions', { ...session, cardId, domain: packId });
}
~~~~~
~~~~~typescript
export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const cardId = session.cardId || session.mode;
  const canonicalCard = registry.getCardById(cardId);
  const packId = canonicalCard ? canonicalCard.domain : session.domain || 'core';
  await db.put('sessions', { ...session, cardId, domain: packId });
}
~~~~~

### 下一步建议

1. 执行 `pnpm tsc --noEmit` 再次验证全项目类型检查是否全部通过。
2. 运行 `pnpm test` 和 `pnpm build` 进行全量构建冒烟测试。

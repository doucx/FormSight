## [WIP] fix: 修复细化感知模块 Profile 领域索引脱节导致层阶显示异常的问题

### 错误分析
- **现象**：细化感知看板（`concretization`）下的 4 个模块在完成训练后，看板卡片的能力层阶与正确率仍为默认初始状态（Level 5，正确率 0%），而今日刷题数正常。
- **根因**：
  1. `updateProfile` 在更新已有 Profile 时未校准 `domain` 字段，导致旧数据 `domain` 仍为 `abstraction`。
  2. `getProfilesByDomain` 仅依赖 `by-domain` 索引查询，当历史 Profile 的 domain 字段有偏差时无法命中。
  3. `resolveLegacyCardId` 仅按 `${domain}:${mode}` 精确匹配，当传入历史 domain 时无法根据唯一的 `legacyMode` 进行容错回退。

### 用户需求
修复“几何大模寻形”、“黑白素描骨架”、“调性基底归位”等模块在完成练习后能力层阶和正确率无法正常在看板展示的问题，并确保历史数据的平滑自愈与兼容。

### 评论
该修复强化了 IndexedDB 中 Profile 数据与当前卡片体系的映射一致性，并在查询、写入与数据迁移三层建立自愈机制，彻底杜绝多领域拆分时的历史数据索引脱节。

### 目标
1. 增强 `resolveLegacyCardId` 和 `resolveCardByLegacy`，支持按全局唯一 `legacyMode` 进行兜底匹配。
2. 在 `updateProfile` 中强制使用卡片的规范 `legacyDomain` 更新 `existing.domain`。
3. 增强 `getProfilesByDomain`，在索引查询基础上增加按卡片 ID 兜底检索并自动自愈修正不一致的 `domain`。
4. 在数据迁移与初始化阶段增加自愈校验，自动修复本地 IndexedDB 中的历史数据。

### 基本原理
1. 通过 `MODE_MAP` 构建以全局唯一的 `legacyMode` 为键的备用索引，无论输入哪种历史领域标识均能唯一定位到正确的 `CardDefinition`。
2. 在 `getProfilesByDomain` 和 `updateProfile` 中以 `card.legacyDomain` 为唯一真理来源（Single Source of Truth），实现历史数据无感知自动自愈。

### 标签
#intent/fix #flow/ready #priority/high #comp/engine #concept/state #scope/core #ai/instruct #task/domain/storage #task/object/user-profiles #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 增强 `src/config/cards.ts` 的 legacyMode 容错映射机制

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript.old
const CARD_MAP = new Map<string, CardDefinition>(ALL_CARDS.map((c) => [c.id, c]));
const LEGACY_MAP = new Map<string, CardDefinition>(
  ALL_CARDS.map((c) => [`${c.legacyDomain}:${c.legacyMode}`, c]),
);

export function getCardById(id: string): CardDefinition | undefined {
  return CARD_MAP.get(id);
}

export function getCardsByDomain(domain: TrainingDomain): CardDefinition[] {
  return ALL_CARDS.filter((c) => c.legacyDomain === domain);
}

export function resolveLegacyCardId(domain: string, mode: string): string {
  const card = LEGACY_MAP.get(`${domain}:${mode}`);
  return card ? card.id : `${domain}_${mode}`;
}

export function resolveCardByLegacy(domain: string, mode: string): CardDefinition | undefined {
  return LEGACY_MAP.get(`${domain}:${mode}`);
}
~~~~~
~~~~~typescript.new
const CARD_MAP = new Map<string, CardDefinition>(ALL_CARDS.map((c) => [c.id, c]));
const LEGACY_MAP = new Map<string, CardDefinition>(
  ALL_CARDS.map((c) => [`${c.legacyDomain}:${c.legacyMode}`, c]),
);
const MODE_MAP = new Map<string, CardDefinition>(ALL_CARDS.map((c) => [c.legacyMode, c]));

export function getCardById(id: string): CardDefinition | undefined {
  return CARD_MAP.get(id);
}

export function getCardsByDomain(domain: TrainingDomain): CardDefinition[] {
  return ALL_CARDS.filter((c) => c.legacyDomain === domain);
}

export function resolveLegacyCardId(domain: string, mode: string): string {
  const card = LEGACY_MAP.get(`${domain}:${mode}`) || MODE_MAP.get(mode);
  return card ? card.id : `${domain}_${mode}`;
}

export function resolveCardByLegacy(domain: string, mode: string): CardDefinition | undefined {
  return LEGACY_MAP.get(`${domain}:${mode}`) || MODE_MAP.get(mode);
}
~~~~~

#### Acts 2: 修复 `src/utils/db/queries.ts` 中的 Profile 写入与查询自愈逻辑

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript.old
import { resolveLegacyCardId } from '../../config/cards';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
} from './schema';
~~~~~
~~~~~typescript.new
import { getCardById, getCardsByDomain, resolveLegacyCardId } from '../../config/cards';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
} from './schema';
~~~~~

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript.old
export async function getProfilesByDomain(domain: TrainingDomain): Promise<UnifiedProfileData[]> {
  const db = await getDB();
  return await db.getAllFromIndex('user_profiles', 'by-domain', domain);
}
~~~~~
~~~~~typescript.new
export async function getProfilesByDomain(domain: TrainingDomain): Promise<UnifiedProfileData[]> {
  const db = await getDB();
  const domainCards = getCardsByDomain(domain);
  const indexProfiles = await db.getAllFromIndex('user_profiles', 'by-domain', domain);
  const map = new Map<string, UnifiedProfileData>();

  for (const p of indexProfiles) {
    map.set(p.cardId, p);
  }

  // 兜底补齐因历史 domain 迁移未匹配索引的 Profile 并自愈写入
  for (const card of domainCards) {
    if (!map.has(card.id)) {
      const p = await db.get('user_profiles', card.id);
      if (p) {
        if (p.domain !== domain) {
          p.domain = domain;
          await db.put('user_profiles', p);
        }
        map.set(p.cardId, p);
      }
    }
  }

  return Array.from(map.values());
}
~~~~~

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript.old
async function updateProfile(
  cardId: string,
  domain: TrainingDomain,
  mode: string,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('user_profiles', cardId);

  if (!existing) {
    const newProfile: UnifiedProfileData = {
      cardId,
      domain,
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrials: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await db.put('user_profiles', newProfile);
  } else {
    existing.totalTrials += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    if (currentLevel > existing.bestLevel) {
      existing.bestLevel = currentLevel;
    }
    existing.updatedAt = Date.now();
    await db.put('user_profiles', existing);
  }
}
~~~~~
~~~~~typescript.new
async function updateProfile(
  cardId: string,
  domain: TrainingDomain,
  mode: string,
  isHit: boolean,
  currentLevel: number,
): Promise<void> {
  const db = await getDB();
  const card = getCardById(cardId);
  const canonicalDomain = card ? card.legacyDomain : domain;
  const existing = await db.get('user_profiles', cardId);

  if (!existing) {
    const newProfile: UnifiedProfileData = {
      cardId,
      domain: canonicalDomain,
      mode,
      currentLevel,
      bestLevel: currentLevel,
      totalTrials: 1,
      totalHits: isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await db.put('user_profiles', newProfile);
  } else {
    existing.domain = canonicalDomain;
    existing.mode = mode;
    existing.totalTrials += 1;
    if (isHit) existing.totalHits += 1;
    existing.currentLevel = currentLevel;
    if (currentLevel > existing.bestLevel) {
      existing.bestLevel = currentLevel;
    }
    existing.updatedAt = Date.now();
    await db.put('user_profiles', existing);
  }
}
~~~~~

#### Acts 3: 优化 `src/utils/db/migration.ts` 与 `src/utils/db/importExport.ts` 导入导出及迁移逻辑

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript.old
import { resolveLegacyCardId } from '../../config/cards';
import { loadSettings, saveSettings } from '../settings';
import { DB_VERSION, type TrainingDomain, getDB } from './schema';
~~~~~
~~~~~typescript.new
import { getCardById, resolveLegacyCardId } from '../../config/cards';
import { loadSettings, saveSettings } from '../settings';
import { DB_VERSION, type TrainingDomain, getDB } from './schema';
~~~~~

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript.old
    if (data.profiles) {
      for (const p of data.profiles) {
        const domain = (p.domain || 'star') as TrainingDomain;
        const cardId = p.cardId || resolveLegacyCardId(domain, p.mode);
        const totalTrials = p.totalTrials ?? p.totalTrainedCards ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
    }
~~~~~
~~~~~typescript.new
    if (data.profiles) {
      for (const p of data.profiles) {
        const cardId = p.cardId || resolveLegacyCardId(p.domain || 'star', p.mode);
        const card = getCardById(cardId);
        const domain = card ? card.legacyDomain : ((p.domain || 'star') as TrainingDomain);
        const totalTrials = p.totalTrials ?? p.totalTrainedCards ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
    }
~~~~~

~~~~~act
patch_file
src/utils/db/migration.ts
~~~~~
~~~~~typescript.old
import { openDB } from 'idb';
import { resolveLegacyCardId } from '../../config/cards';
import type {
  FormSightDBSchema,
  TrainingDomain,
  UnifiedProfileData,
  UnifiedSessionData,
  UnifiedTrialRecord,
} from './schema';
~~~~~
~~~~~typescript.new
import { openDB } from 'idb';
import { getCardById, resolveLegacyCardId } from '../../config/cards';
import type {
  FormSightDBSchema,
  TrainingDomain,
  UnifiedProfileData,
  UnifiedSessionData,
  UnifiedTrialRecord,
} from './schema';
~~~~~

~~~~~act
patch_file
src/utils/db/migration.ts
~~~~~
~~~~~typescript.old
    for (const p of oldProfiles) {
      const domain = p.domain || 'star';
      const cardId = p.cardId || resolveLegacyCardId(domain, p.mode);
      const totalTrials = p.totalTrials ?? p.totalTrainedCards ?? 0;
      await tx.objectStore('user_profiles').put({
        ...p,
        cardId,
        domain,
        totalTrials,
      });
    }
~~~~~
~~~~~typescript.new
    for (const p of oldProfiles) {
      const cardId = p.cardId || resolveLegacyCardId(p.domain || 'star', p.mode);
      const card = getCardById(cardId);
      const domain = card ? card.legacyDomain : (p.domain || 'star');
      const totalTrials = p.totalTrials ?? p.totalTrainedCards ?? 0;
      await tx.objectStore('user_profiles').put({
        ...p,
        cardId,
        domain,
        totalTrials,
      });
    }
~~~~~

### 下一步建议
- 可以启动开发服务器验证细化感知看板（`#/dashboard/concretization`），确认“动态势线寻源”、“几何大模寻形”、“黑白素描骨架”、“调性基底归位”在刷新或练习后正确展示当前层阶与正确率。

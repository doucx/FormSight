我已定位并修复单锚点模式下悬停 `?` 提示显示 `packs.xxx.instruction` 键名的原因。以下是完整的解决计划与执行脚本：

我已分析出根本原因：FormSight 存在两套卡片国际化词典注册机制（`PackManifest` 的 `packs.<packId>.cards.<cardId>` 与 `CardManifest` 一等公民卡片的 `cards.<cardId>`）。而 `TrainingShell.tsx` 此前硬编码了旧版 `PackManifest` 的查找路径，导致采用 `CardManifest` 架构的卡片（如单锚点模式 `star_single`、角度系列等）无法命中并外显了 Key 字符串。

为此，我将在 `src/core/i18n.ts` 中实现双向兼容的 `getCardInstruction` 工具函数，并在 `TrainingShell.tsx` 中应用它。

## [WIP] fix: 修复单锚点等新架构卡片训练页玩法要领（instruction）国际化键名外显问题

### 错误分析

在 FormSight 中存在两套卡片多语言注册机制：
1. **PackManifest 架构**：多语言词典挂载在 `packs.<packId>.cards.<cardId>` 命名空间下（如 `abstraction` 等）。
2. **CardManifest（一等公民卡片）架构**：多语言词典挂载在 `cards.<cardId>` 命名空间下（如 `star` 模块的 `star_single`、`angle` 模块等）。

`TrainingShell.tsx` 中硬编码了 `t(`packs.${card.packId}.cards.${card.id}.instruction`)`，导致采用 `CardManifest` 架构的卡片无法命中旧版路径，从而回退并外显了国际化 Key 字符串。这与已有的 `getCardTitle` 和 `getCardDesc` 不一致。

### 用户需求
修复单锚点模式（及其他采用 `CardManifest` 架构的卡片）在训练页悬停 `?` 提示时无法正确显示中文说明、外显 Key 键名的问题。

### 评论
该修复完善了新旧卡片架构在国际化多语言解析上的向后兼容性，保持了与 `getCardTitle` / `getCardDesc` 一致的设计模式。

### 目标
1. 在 `src/core/i18n.ts` 中实现并导出 `getCardInstruction` 函数，优先查询 `cards.<cardId>.instruction`，随后回退至 `packs.<packId>.cards.<cardId>.instruction`、静态字段及描述信息。
2. 在 `src/components/training/TrainingShell.tsx` 中使用 `getCardInstruction(card, t)` 替换硬编码查询。

### 基本原理
通过仿照 `getCardTitle` 的双向命名空间查询逻辑，确保不论卡片是通过 `PackManifest` 还是 `CardManifest` 注册的，其 `instruction` 都能被准确解析并展示。

### 标签
#intent/fix #flow/ready #priority/high #comp/engine #concept/config #scope/core #ai/instruct #task/domain/ui #task/object/instruction-tooltip #task/action/bug-fix #task/state/begin

---

### Script

我们将按照你的要求，在 `src/core/i18n.ts` 中实现 `getCardInstruction` 工具函数，并在 `src/components/training/TrainingShell.tsx` 中进行集成，以彻底解决单锚点及其他新架构卡片（CardManifest）无法正确加载 `instruction` 的问题。

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~python.old
/**
 * 通用：解析卡片描述多语言回退 (优先卡片级词典 -> Pack词典 -> 静态默认值)
 */
export function getCardDesc(
  card: { id: string; packId?: string; desc?: string },
  t = i18n.t,
): string {
  // 1. 优先从 Card 命名空间查询
  const cardKey = `cards.${card.id}.desc`;
  const cardDesc = t(cardKey);
  if (cardDesc !== cardKey) return cardDesc;

  // 2. 回退从 legacy Pack 命名空间查询
  const packId = card.packId || 'core';
  const legacyPackKey = `packs.${packId}.cards.${card.id}.desc`;
  const legacyDesc = t(legacyPackKey);
  if (legacyDesc !== legacyPackKey) return legacyDesc;

  // 3. 最终回退至静态字段
  return card.desc || '';
}
~~~~~
~~~~~python.new
/**
 * 通用：解析卡片描述多语言回退 (优先卡片级词典 -> Pack词典 -> 静态默认值)
 */
export function getCardDesc(
  card: { id: string; packId?: string; desc?: string },
  t = i18n.t,
): string {
  // 1. 优先从 Card 命名空间查询
  const cardKey = `cards.${card.id}.desc`;
  const cardDesc = t(cardKey);
  if (cardDesc !== cardKey) return cardDesc;

  // 2. 回退从 legacy Pack 命名空间查询
  const packId = card.packId || 'core';
  const legacyPackKey = `packs.${packId}.cards.${card.id}.desc`;
  const legacyDesc = t(legacyPackKey);
  if (legacyDesc !== legacyPackKey) return legacyDesc;

  // 3. 最终回退至静态字段
  return card.desc || '';
}

/**
 * 通用：解析卡片玩法要领多语言回退 (优先卡片级词典 -> Pack词典 -> 静态字段 -> 描述)
 */
export function getCardInstruction(
  card: { id: string; packId?: string; instruction?: string; desc?: string },
  t = i18n.t,
): string {
  // 1. 优先从 Card 命名空间查询 instruction
  const cardKey = `cards.${card.id}.instruction`;
  const cardInst = t(cardKey);
  if (cardInst !== cardKey) return cardInst;

  // 2. 回退从 legacy Pack 命名空间查询 instruction
  const packId = card.packId || 'core';
  const legacyPackKey = `packs.${packId}.cards.${card.id}.instruction`;
  const legacyInst = t(legacyPackKey);
  if (legacyInst !== legacyPackKey) return legacyInst;

  // 3. 回退到静态 instruction 字段
  if (card.instruction) return card.instruction;

  // 4. 最终回退到描述信息 (desc)
  return getCardDesc(card, t);
}
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~python.old
import { getCardDesc, getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { formatSecondsToTimer } from '../../utils/time';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';
import type { SessionHistoryItem } from '../modals/SessionSummaryModal';
import { SessionSummaryModal } from '../modals/SessionSummaryModal';
import { Button } from '../ui/button';

export interface TrainingSessionHandle {
  totalTrials: number;
  elapsedSeconds: number;
  isFinished: boolean;
  isIdle: boolean;
  showAnswer: boolean;
  showSummaryModal: boolean;
  sessionHistory: SessionHistoryItem[];
  resumeFromIdle: () => void;
  handleNextQuestion: () => void;
  handleRequestFinish: () => void;
  handleFinishSession: () => void;
  handleRestartSession: () => void;
}

interface TrainingShellProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  currentLevel: number;
  isTargeting?: boolean;
  autoNext: boolean;
  session: TrainingSessionHandle;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
  children: (state: { disabled: boolean; isIdle: boolean }) => ComponentChildren;
}

export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  autoNext,
  session,
  showExitButton = true,
  showTimer = true,
  children,
}: TrainingShellProps) {
  const { t } = useTranslation();
  const cardTitle = getCardTitle(card, t);
  const instruction =
    t(`packs.${card.packId}.cards.${card.id}.instruction`) || card.instruction || '';
  const desc = getCardDesc(card, t);
~~~~~
~~~~~python.new
import { getCardDesc, getCardInstruction, getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import { formatSecondsToTimer } from '../../utils/time';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';
import type { SessionHistoryItem } from '../modals/SessionSummaryModal';
import { SessionSummaryModal } from '../modals/SessionSummaryModal';
import { Button } from '../ui/button';

export interface TrainingSessionHandle {
  totalTrials: number;
  elapsedSeconds: number;
  isFinished: boolean;
  isIdle: boolean;
  showAnswer: boolean;
  showSummaryModal: boolean;
  sessionHistory: SessionHistoryItem[];
  resumeFromIdle: () => void;
  handleNextQuestion: () => void;
  handleRequestFinish: () => void;
  handleFinishSession: () => void;
  handleRestartSession: () => void;
}

interface TrainingShellProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  currentLevel: number;
  isTargeting?: boolean;
  autoNext: boolean;
  session: TrainingSessionHandle;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
  children: (state: { disabled: boolean; isIdle: boolean }) => ComponentChildren;
}

export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  autoNext,
  session,
  showExitButton = true,
  showTimer = true,
  children,
}: TrainingShellProps) {
  const { t } = useTranslation();
  const cardTitle = getCardTitle(card, t);
  const instruction = getCardInstruction(card, t);
  const desc = getCardDesc(card, t);
~~~~~

### 下一步建议

我们已经成功修复了 `TrainingShell` 中获取卡片玩法要领（`instruction`）的国际化路径问题。建议后续对所有卡片及模块进行一次全面审查，确保所有国际化文本的读取均通过统一的工具函数（如 `getCardTitle`, `getCardDesc`, `getCardInstruction`）进行，避免硬编码 Key 路径带来的隐患。

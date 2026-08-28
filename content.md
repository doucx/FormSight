好的，我将为你把 `getCardTitle`、`getCardDesc` 与 `getPackTitle` 统一应用到全站核心视图与模态框组件中，彻底消除散落各处的手工多语言模板拼接与回退代码。

## [WIP] refactor(i18n): 在全站组件中应用统一元数据多语言解析工具

### 用户需求
在 `Home.tsx`、`PlanHeroCard.tsx`、`PlanStageList.tsx`、`TrainingShell.tsx`、`SessionSummaryModal.tsx`、`GlobalStatsModal.tsx` 等全站组件中全面接入 `getCardTitle` / `getCardDesc` / `getPackTitle`，消除样板代码。

### 目标
1. 重构 **主页与编排相关组件**：`Home.tsx`、`PlanHeroCard.tsx`、`PlanStageList.tsx`、`PlanSummaryModal.tsx`、`PlanTrainingView.tsx`。
2. 重构 **训练与结算相关组件**：`TrainingShell.tsx`、`SessionSummaryModal.tsx`、`SettingsModal.tsx`、`WeaknessAnalyticsModal.tsx`。
3. 重构 **全局统计与主路由**：`GlobalStatsModal.tsx`、`App.tsx`。

### 基本原理
- 将原本散落在 10+ 个文件中的多语言 key 拼接和 fallback 逻辑（`t('packs.${card.packId}...') || ...`）统一收敛至 `getCardTitle` / `getCardDesc` / `getPackTitle`，降低维护成本，避免 key 命名不一致的潜在 Bug。

### 标签
#intent/refine #flow/ready #priority/medium #comp/common #comp/views #concept/ui #scope/dx #ai/instruct #task/domain/architecture #task/object/i18n-unification #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构 `Home.tsx` 与 `PlanHeroCard.tsx`

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~tsx.old
import { ModeCard } from '../components/common/ModeCard';
import { FilterEngine } from '../components/discovery/FilterEngine';
import { PlanHeroCard } from '../components/plan/PlanHeroCard';
import { useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CardQueryOptions } from '../types/card';
~~~~~
~~~~~tsx.new
import { ModeCard } from '../components/common/ModeCard';
import { FilterEngine } from '../components/discovery/FilterEngine';
import { PlanHeroCard } from '../components/plan/PlanHeroCard';
import { getCardDesc, getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CardQueryOptions } from '../types/card';
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~tsx.old
          {filteredCards.map((card) => {
            const profile = profiles[card.id];
            const totalTrials = profile?.totalTrials || 0;
            const accuracy =
              totalTrials > 0 && profile ? Math.round((profile.totalHits / totalTrials) * 100) : 0;
            const currentLevel = profile?.currentLevel || 5;
            const stat = todayStats[card.id] || { count: 0, timeMs: 0 };
            const cardTitle =
              t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
            const cardDesc = t(`packs.${card.packId}.cards.${card.id}.desc`) || card.desc || '';

            return (
              <ModeCard
                key={card.id}
                title={cardTitle}
                desc={cardDesc}
                icon={card.icon}
                todayCount={stat.count}
                todayTimeMs={stat.timeMs}
                currentLevel={currentLevel}
                accuracy={accuracy}
                hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
                isExperimental={card.tags.status === 'experimental'}
                onStartTraining={() => onStartCard(card.id, 'training')}
                onStartBenchmark={() => onStartCard(card.id, 'benchmark')}
                onOpenSettings={() => onOpenCardSettings(card.id)}
                onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
              />
            );
          })}
~~~~~
~~~~~tsx.new
          {filteredCards.map((card) => {
            const profile = profiles[card.id];
            const totalTrials = profile?.totalTrials || 0;
            const accuracy =
              totalTrials > 0 && profile ? Math.round((profile.totalHits / totalTrials) * 100) : 0;
            const currentLevel = profile?.currentLevel || 5;
            const stat = todayStats[card.id] || { count: 0, timeMs: 0 };
            const cardTitle = getCardTitle(card, t);
            const cardDesc = getCardDesc(card, t);

            return (
              <ModeCard
                key={card.id}
                title={cardTitle}
                desc={cardDesc}
                icon={card.icon}
                todayCount={stat.count}
                todayTimeMs={stat.timeMs}
                currentLevel={currentLevel}
                accuracy={accuracy}
                hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
                isExperimental={card.tags.status === 'experimental'}
                onStartTraining={() => onStartCard(card.id, 'training')}
                onStartBenchmark={() => onStartCard(card.id, 'benchmark')}
                onOpenSettings={() => onOpenCardSettings(card.id)}
                onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
              />
            );
          })}
~~~~~

~~~~~act
patch_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~tsx.old
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { TrainingPlan } from '../../types/plan';
~~~~~
~~~~~tsx.new
import { useEffect, useRef, useState } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { TrainingPlan } from '../../types/plan';
~~~~~

~~~~~act
patch_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~tsx.old
        {plan.items.map((item, idx) => {
          const card = registry.getCardById(item.cardId);
          if (!card) return null;
          const Icon = card.icon;
          const cardTitle =
            t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;

          return (
            <div key={item.id} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-2xl shadow-inner">
                <div className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono text-[10px] font-black">
                  {idx + 1}
                </div>
                <Icon className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">{cardTitle}</span>
                <span className="text-[11px] font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                  {item.targetTrials}
                  {t('common.trialsUnit')}
                </span>
              </div>
              {idx < plan.items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
            </div>
          );
        })}
~~~~~
~~~~~tsx.new
        {plan.items.map((item, idx) => {
          const card = registry.getCardById(item.cardId);
          if (!card) return null;
          const Icon = card.icon;
          const cardTitle = getCardTitle(card, t);

          return (
            <div key={item.id} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-2xl shadow-inner">
                <div className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono text-[10px] font-black">
                  {idx + 1}
                </div>
                <Icon className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">{cardTitle}</span>
                <span className="text-[11px] font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                  {item.targetTrials}
                  {t('common.trialsUnit')}
                </span>
              </div>
              {idx < plan.items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
            </div>
          );
        })}
~~~~~

#### Acts 2: 重构 `PlanStageList.tsx`、`PlanSummaryModal.tsx` 与 `PlanTrainingView.tsx`

~~~~~act
patch_file
src/components/plan/editor/PlanStageList.tsx
~~~~~
~~~~~tsx.old
import { ArrowDown, ArrowUp, RotateCcw, Trash2, Zap } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { TrainingPlan } from '../../../types/plan';
~~~~~
~~~~~tsx.new
import { ArrowDown, ArrowUp, RotateCcw, Trash2, Zap } from 'lucide-preact';
import { getCardDesc, getCardTitle, useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { TrainingPlan } from '../../../types/plan';
~~~~~

~~~~~act
patch_file
src/components/plan/editor/PlanStageList.tsx
~~~~~
~~~~~tsx.old
          {currentPlan.items.map((item, idx) => {
            const card = registry.getCardById(item.cardId);
            if (!card) return null;
            const Icon = card.icon;
            const cardTitle =
              t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
            const cardDesc = t(`packs.${card.packId}.cards.${card.id}.desc`) || card.desc || '';

            return (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex items-center justify-between gap-3"
              >
                {/* 左侧：严格 min-w-0 弹性约束，保证超长文本必然被截断，绝不撑开容器 */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400 truncate">{cardDesc}</div>
                  </div>
                </div>
~~~~~
~~~~~tsx.new
          {currentPlan.items.map((item, idx) => {
            const card = registry.getCardById(item.cardId);
            if (!card) return null;
            const Icon = card.icon;
            const cardTitle = getCardTitle(card, t);
            const cardDesc = getCardDesc(card, t);

            return (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex items-center justify-between gap-3"
              >
                {/* 左侧：严格 min-w-0 弹性约束，保证超长文本必然被截断，绝不撑开容器 */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400 truncate">{cardDesc}</div>
                  </div>
                </div>
~~~~~

~~~~~act
patch_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~tsx.old
import { ArrowRight, Award, CheckCircle, Clock, Home, RotateCcw, Target } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';
~~~~~
~~~~~tsx.new
import { ArrowRight, Award, CheckCircle, Clock, Home, RotateCcw, Target } from 'lucide-preact';
import { getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';
~~~~~

~~~~~act
patch_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~tsx.old
              const Icon = stage.card.icon;
              const cardTitle =
                t(`packs.${stage.card.packId}.cards.${stage.card.id}.title`) ||
                stage.card.title ||
                stage.card.id;

              return (
                <div
                  key={`${stage.card.id}-${idx}`}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-slate-800 text-white font-mono text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-white text-indigo-600 border border-slate-200/60 shadow-sm">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{cardTitle}</div>
                      <div className="text-[10px] text-slate-400">
                        {t('common.trialsCorrect', {
                          hits: stageHits,
                          total: stage.history.length,
                        })}
                      </div>
                    </div>
                  </div>
~~~~~
~~~~~tsx.new
              const Icon = stage.card.icon;
              const cardTitle = getCardTitle(stage.card, t);

              return (
                <div
                  key={`${stage.card.id}-${idx}`}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-slate-800 text-white font-mono text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-white text-indigo-600 border border-slate-200/60 shadow-sm">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{cardTitle}</div>
                      <div className="text-[10px] text-slate-400">
                        {t('common.trialsCorrect', {
                          hits: stageHits,
                          total: stage.history.length,
                        })}
                      </div>
                    </div>
                  </div>
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~tsx.old
import { ArrowLeft, Clock, FastForward } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { type PlanStageResult, PlanSummaryModal } from '../components/plan/PlanSummaryModal';
import { useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { TrainingPlan } from '../types/plan';
~~~~~
~~~~~tsx.new
import { ArrowLeft, Clock, FastForward } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { type PlanStageResult, PlanSummaryModal } from '../components/plan/PlanSummaryModal';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { TrainingPlan } from '../types/plan';
~~~~~

~~~~~act
patch_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~tsx.old
  const plugin = registry.getPluginByCardId(currentCard.id);
  if (!plugin) {
    onExit();
    return null;
  }
  const cardConfig = getCardSettings(settings, currentCard.id);
  const cardTitle =
    t(`packs.${currentCard.packId}.cards.${currentCard.id}.title`) ||
    currentCard.title ||
    currentCard.id;

  const formatTime = (sec: number) => {
~~~~~
~~~~~tsx.new
  const plugin = registry.getPluginByCardId(currentCard.id);
  if (!plugin) {
    onExit();
    return null;
  }
  const cardConfig = getCardSettings(settings, currentCard.id);
  const cardTitle = getCardTitle(currentCard, t);

  const formatTime = (sec: number) => {
~~~~~

#### Acts 3: 重构 `TrainingShell.tsx`、`SessionSummaryModal.tsx`、`SettingsModal.tsx`、`WeaknessAnalyticsModal.tsx`

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~tsx.old
import { ArrowLeft, ChevronRight, Clock, Crosshair, FlaskConical, HelpCircle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';
~~~~~
~~~~~tsx.new
import { ArrowLeft, ChevronRight, Clock, Crosshair, FlaskConical, HelpCircle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { getCardDesc, getCardTitle, useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~tsx.old
export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  isTargeting = false,
  autoNext,
  session,
  showExitButton = true,
  showTimer = true,
  children,
}: TrainingShellProps) {
  const { t } = useTranslation();
  const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
  const instruction =
    t(`packs.${card.packId}.cards.${card.id}.instruction`) || card.instruction || '';
  const desc = t(`packs.${card.packId}.cards.${card.id}.desc`) || card.desc || '';
  const badgeKey = card.tags.domain[0] ? `tags.domains.${card.tags.domain[0]}` : '';
  const badge = badgeKey ? t(badgeKey) : '';
~~~~~
~~~~~tsx.new
export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  isTargeting = false,
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
  const badgeKey = card.tags.domain[0] ? `tags.domains.${card.tags.domain[0]}` : '';
  const badge = badgeKey ? t(badgeKey) : '';
~~~~~

~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~tsx.old
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
import { renderSessionTrendChartCanvas } from '../utils/canvas/drawTrendChart';
~~~~~
~~~~~tsx.new
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
import { renderSessionTrendChartCanvas } from '../utils/canvas/drawTrendChart';
~~~~~

~~~~~act
patch_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~tsx.old
export function SessionSummaryModal({
  card,
  sessionType,
  elapsedSeconds,
  history,
  onClose,
  onRestart,
}: SessionSummaryModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;

  const totalTrials = history.length;
~~~~~
~~~~~tsx.new
export function SessionSummaryModal({
  card,
  sessionType,
  elapsedSeconds,
  history,
  onClose,
  onRestart,
}: SessionSummaryModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = getCardTitle(card, t);

  const totalTrials = history.length;
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~tsx.old
import { Flame, Sliders, Target, ToggleLeft, ToggleRight } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
~~~~~
~~~~~tsx.new
import { Flame, Sliders, Target, ToggleLeft, ToggleRight } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { getCardTitle, useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
~~~~~

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~tsx.old
export function SettingsModal({ card, settings, onClose, onSave }: SettingsModalProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<UserSettings>({ ...settings });
  const cardConfig = getCardSettings(current, card.id);

  const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;

  const updateCardConfig = (patch: Partial<BaseModuleSettings>) => {
~~~~~
~~~~~tsx.new
export function SettingsModal({ card, settings, onClose, onSave }: SettingsModalProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<UserSettings>({ ...settings });
  const cardConfig = getCardSettings(current, card.id);

  const cardTitle = getCardTitle(card, t);

  const updateCardConfig = (patch: Partial<BaseModuleSettings>) => {
~~~~~

~~~~~act
patch_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~tsx.old
import { BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { CardAnalyticsView } from '../core/contracts';
import { useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CardDefinition } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db/index';
~~~~~
~~~~~tsx.new
import { BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { CardAnalyticsView } from '../core/contracts';
import { getCardTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CardDefinition } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db/index';
~~~~~

~~~~~act
patch_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~tsx.old
export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const { t } = useTranslation();
  const plugin = registry.getAnalyticsPluginByCardId(card.id);
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeViewIndex, setActiveViewIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;

  const views = plugin?.views ?? [];
~~~~~
~~~~~tsx.new
export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const { t } = useTranslation();
  const plugin = registry.getAnalyticsPluginByCardId(card.id);
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeViewIndex, setActiveViewIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = getCardTitle(card, t);

  const views = plugin?.views ?? [];
~~~~~

#### Acts 4: 重构 `GlobalStatsModal.tsx` 与 `app.tsx`

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~tsx.old
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';
~~~~~
~~~~~tsx.new
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { getCardTitle, getPackTitle, useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~tsx.old
    if (selectedFilter.startsWith('pack:')) {
      const pId = selectedFilter.replace('pack:', '');
      const pTitle = t(`packs.${pId}.meta.title`) || registry.getPack(pId)?.meta.title || pId;
      return `${t('home.allPacks')} • ${pTitle}`;
    }
    if (selectedFilter.startsWith('domain:')) {
      const d = selectedFilter.replace('domain:', '') as VisualDomainTag;
      return `Domain • ${t(DOMAIN_TAGS[d]?.i18nKey || d)}`;
    }
    if (selectedFilter.startsWith('path:')) {
      const p = selectedFilter.replace('path:', '') as CognitivePathTag;
      return `Path • ${t(PATH_TAGS[p]?.i18nKey || p)}`;
    }
    if (selectedFilter.startsWith('challenge:')) {
      const c = selectedFilter.replace('challenge:', '') as MentalChallengeTag;
      return `Challenge • ${t(CHALLENGE_TAGS[c]?.i18nKey || c)}`;
    }
    if (selectedFilter.startsWith('card:')) {
      const cardId = selectedFilter.replace('card:', '');
      const card = registry.getCardById(cardId);
      const cTitle = card ? t(`packs.${card.packId}.cards.${card.id}.title`) || card.title : cardId;
      return `${cTitle}`;
    }
~~~~~
~~~~~tsx.new
    if (selectedFilter.startsWith('pack:')) {
      const pId = selectedFilter.replace('pack:', '');
      const pack = registry.getPack(pId);
      const pTitle = pack ? getPackTitle(pack, t) : pId;
      return `${t('home.allPacks')} • ${pTitle}`;
    }
    if (selectedFilter.startsWith('domain:')) {
      const d = selectedFilter.replace('domain:', '') as VisualDomainTag;
      return `Domain • ${t(DOMAIN_TAGS[d]?.i18nKey || d)}`;
    }
    if (selectedFilter.startsWith('path:')) {
      const p = selectedFilter.replace('path:', '') as CognitivePathTag;
      return `Path • ${t(PATH_TAGS[p]?.i18nKey || p)}`;
    }
    if (selectedFilter.startsWith('challenge:')) {
      const c = selectedFilter.replace('challenge:', '') as MentalChallengeTag;
      return `Challenge • ${t(CHALLENGE_TAGS[c]?.i18nKey || c)}`;
    }
    if (selectedFilter.startsWith('card:')) {
      const cardId = selectedFilter.replace('card:', '');
      const card = registry.getCardById(cardId);
      const cTitle = card ? getCardTitle(card, t) : cardId;
      return `${cTitle}`;
    }
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~tsx.old
                <optgroup label={t('stats.optgroupPacks')}>
                  {packs.map((p) => {
                    const packTitle = t(`packs.${p.packId}.meta.title`) || p.meta.title || p.packId;
                    return (
                      <option key={`pack:${p.packId}`} value={`pack:${p.packId}`}>
                        {packTitle}
                      </option>
                    );
                  })}
                </optgroup>
~~~~~
~~~~~tsx.new
                <optgroup label={t('stats.optgroupPacks')}>
                  {packs.map((p) => {
                    const packTitle = getPackTitle(p, t);
                    return (
                      <option key={`pack:${p.packId}`} value={`pack:${p.packId}`}>
                        {packTitle}
                      </option>
                    );
                  })}
                </optgroup>
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~tsx.old
                <optgroup label={t('stats.optgroupCards')}>
                  {allCards.map((card) => {
                    const cardTitle =
                      t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
                    return (
                      <option key={`card:${card.id}`} value={`card:${card.id}`}>
                        {cardTitle}
                      </option>
                    );
                  })}
                </optgroup>
~~~~~
~~~~~tsx.new
                <optgroup label={t('stats.optgroupCards')}>
                  {allCards.map((card) => {
                    const cardTitle = getCardTitle(card, t);
                    return (
                      <option key={`card:${card.id}`} value={`card:${card.id}`}>
                        {cardTitle}
                      </option>
                    );
                  })}
                </optgroup>
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { i18n, useTranslation } from './core/i18n';
import { registry } from './core/registry';
import { type RouteLocation, useHashRoute } from './hooks/useHashRoute';
~~~~~
~~~~~tsx.new
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { getCardTitle, i18n, useTranslation } from './core/i18n';
import { registry } from './core/registry';
import { type RouteLocation, useHashRoute } from './hooks/useHashRoute';
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~tsx.old
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card
        ? t(`packs.${card.packId}.cards.${card.id}.title`) || card.title
        : t('shell.training');
      document.title = `${cardTitle} - ${t('common.appName')}`;
    }
~~~~~
~~~~~tsx.new
    } else if (route.type === 'train') {
      const card = registry.getCardById(route.cardId);
      const cardTitle = card ? getCardTitle(card, t) : t('shell.training');
      document.title = `${cardTitle} - ${t('common.appName')}`;
    }
~~~~~

### 下一步建议
1. **执行构建检查**：运行 `npm run check` 确保全站国际化辅助函数替换后无任何类型或导出遗漏。
2. **提交当前工作流**：若所有改动均已验证完毕，可随时指示创建 `[COMMIT]` 提交节点。


好的，我将为你实现「自定义训练计划（训练流 / Daily Workout Flow）」功能。

## [WIP] feat: 实现自定义训练计划流与主页日课入口

### 用户需求
在 FormSight 中引入自定义训练计划系统：
1. 允许用户在主页直观查看与管理今日训练计划（默认计划为空）。
2. 支持可视化计划编排：按多维标签挑选卡片、自由调整阶段顺序、设定每个阶段的题量。
3. 提供科学的内置官方训练模板（全能热身、几何比例、光影色彩等），支持一键套用。
4. 打造多阶段连续训练流执行器：阶段自动流转、中间轻量过渡、最终全局大盘结算与技能画像。
5. 计划配置本地持久化并纳入系统全局数据备份与恢复。

### 评论
基于项目已实现的扁平卡片注册表 (`ALL_CARDS`) 与多维标签体系 (`CardTags`)，训练计划不再是一个简单的卡片列表，而是支持多维筛选、阶段动态调度与跨阶段能力评估的一站式日课闭环，极大提升了日常训练的自律性与沉浸感。

### 目标
1. 创建 `src/types/plan.ts` 与 `src/config/planTemplates.ts`，定义计划数据模型与内置官方模板。
2. 创建 `src/utils/planStorage.ts`，实现训练计划的持久化存储、读取与模板应用；在 `importExport.ts` 中整合计划备份。
3. 在 `src/hooks/useHashRoute.ts` 中新增 `#/plan-train` 路由支持。
4. 增强 `src/hooks/useTrainingSession.ts` 与 `src/views/GenericTrainingView.tsx`，支持阶段题量上限截断与阶段达成回调。
5. 编写计划系列组件：
   - `src/components/plan/PlanHeroCard.tsx`：主页顶部入口与进度指示卡片；
   - `src/components/plan/PlanEditorModal.tsx`：多维标签选卡与阶段编排弹窗；
   - `src/components/plan/PlanStepTransition.tsx`：阶段过渡与达成浮层；
   - `src/components/plan/PlanSummaryModal.tsx`：全局多阶段大盘结算报告。
6. 编写 `src/views/PlanTrainingView.tsx` 训练流运行视图，并集成到 `src/views/Home.tsx` 与 `src/app.tsx`。

### 基本原理
1. **数据解耦**：计划项仅由 `{ id, cardId, targetTrials }` 组成，利用 `cardId` 在运行时通过 `CARD_PLUGINS` 与 `getCardById` 实现 $O(1)$ 查找与热加载。
2. **状态机驱动流转**：`PlanTrainingView` 维护当前执行阶段索引 `currentStepIndex` 与各阶段的历史做答记录 `stageHistories`，当阶段达到 `targetTrials` 时触发轻量过渡后自动加载下一个阶段的画布与题目，完成后唤起结算报告。
3. **数据一致性**：计划训练中的每一道题仍正常记录到 IndexedDB 的 `records` 与 `user_profiles`，无损累积全局经验与难度进阶。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #comp/cli #concept/executor #scope/core #scope/ux #ai/instruct #task/domain/training #task/object/training-plan #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 创建训练计划类型定义与预设模板

~~~~~act
write_file
src/types/plan.ts
~~~~~
~~~~~typescript
export interface PlanItem {
  id: string; // 阶段唯一 ID (用于渲染与排序 key)
  cardId: string; // 目标卡片 ID (如 'star_single', 'color_hue')
  targetTrials: number; // 本阶段目标题量
}

export interface TrainingPlan {
  id: string;
  name: string;
  items: PlanItem[];
  updatedAt: number;
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  badge?: string;
  items: Omit<PlanItem, 'id'>[];
}
~~~~~

~~~~~act
write_file
src/config/planTemplates.ts
~~~~~
~~~~~typescript
import type { PlanTemplate } from '../types/plan';

export const DEFAULT_PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'all_round_warmup',
    name: '晨间感知全能热身 (50题)',
    description: '快速激活空间几何、绝对色相与正负形快判直觉，适合每日开工前热身。',
    badge: '推荐',
    items: [
      { cardId: 'star_single', targetTrials: 15 },
      { cardId: 'color_hue', targetTrials: 15 },
      { cardId: 'neg_area_comparison_2afc', targetTrials: 20 },
    ],
  },
  {
    id: 'geometry_sculpting',
    name: '造型起形与比例强化 (60题)',
    description: '深入训练双锚点透视构图、负形反切定点与折线低模概括能力。',
    badge: '造型专项',
    items: [
      { cardId: 'star_double_h', targetTrials: 20 },
      { cardId: 'neg_vertex_fitting', targetTrials: 20 },
      { cardId: 'abs_polygon_decimation', targetTrials: 20 },
    ],
  },
  {
    id: 'color_light_mastery',
    name: '色彩光影与环境穿透 (65题)',
    description: '从绝对色相识别进阶到阿尔伯斯环境色对抗、色彩矢量迁移与综合拾色。',
    badge: '色彩进阶',
    items: [
      { cardId: 'color_hue', targetTrials: 20 },
      { cardId: 'rel_decontextual_2afc', targetTrials: 15 },
      { cardId: 'rel_vector_shift', targetTrials: 15 },
      { cardId: 'color_all', targetTrials: 15 },
    ],
  },
  {
    id: 'abstraction_essence',
    name: '视知觉概括提炼 (60题)',
    description: '自底向上训练动态势线提取、黑白素描归组与主调色群提炼本质。',
    badge: '概括专项',
    items: [
      { cardId: 'abs_gesture_axis', targetTrials: 20 },
      { cardId: 'abs_notan_threshold', targetTrials: 20 },
      { cardId: 'abs_palette_clustering', targetTrials: 20 },
    ],
  },
];
~~~~~

#### Acts 2: 创建计划存储模块并集成全量备份

~~~~~act
write_file
src/utils/planStorage.ts
~~~~~
~~~~~typescript
import { DEFAULT_PLAN_TEMPLATES } from '../config/planTemplates';
import type { PlanItem, PlanTemplate, TrainingPlan } from '../types/plan';

const PLAN_STORAGE_KEY = 'formsight_custom_training_plan';

export const EMPTY_TRAINING_PLAN: TrainingPlan = {
  id: 'custom_plan',
  name: '我的自选训练流',
  items: [],
  updatedAt: Date.now(),
};

export function loadTrainingPlan(): TrainingPlan {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return EMPTY_TRAINING_PLAN;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return EMPTY_TRAINING_PLAN;
    return {
      id: parsed.id || 'custom_plan',
      name: parsed.name || '我的自选训练流',
      items: parsed.items,
      updatedAt: parsed.updatedAt || Date.now(),
    };
  } catch (e) {
    console.error('Failed to load training plan:', e);
    return EMPTY_TRAINING_PLAN;
  }
}

export function saveTrainingPlan(plan: TrainingPlan): void {
  try {
    localStorage.setItem(
      PLAN_STORAGE_KEY,
      JSON.stringify({
        ...plan,
        updatedAt: Date.now(),
      }),
    );
  } catch (e) {
    console.error('Failed to save training plan:', e);
  }
}

export function createPlanFromTemplate(template: PlanTemplate): TrainingPlan {
  const items: PlanItem[] = template.items.map((item, idx) => ({
    id: `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
    cardId: item.cardId,
    targetTrials: item.targetTrials,
  }));

  return {
    id: `plan_${template.id}`,
    name: template.name,
    items,
    updatedAt: Date.now(),
  };
}
~~~~~

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript.old
import { getCardById } from '../../config/cards';
import { loadSettings, saveSettings } from '../settings';
import { DB_VERSION, type TrainingDomain, getDB } from './schema';

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const settings = loadSettings();

  const exportObject = {
    appName: 'FormSight',
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
    settings,
  };

  return JSON.stringify(exportObject, null, 2);
}

export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    const db = await getDB();
    const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');

    if (data.sessions) {
      for (const s of data.sessions) {
        const domain = (s.domain || 'star') as TrainingDomain;
        const cardId = s.cardId || s.mode;
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
    }
    if (data.records) {
      for (const r of data.records) {
        const domain = (r.domain || 'star') as TrainingDomain;
        const cardId = r.cardId || r.mode;
        await tx.objectStore('records').put({ ...r, domain, cardId });
      }
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        const cardId = p.cardId || p.mode;
        const card = getCardById(cardId);
        const domain = card ? card.domain : ((p.domain || 'star') as TrainingDomain);
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
    }

    await tx.done;

    if (data.settings) {
      saveSettings(data.settings);
    }

    return true;
  } catch (err) {
    console.error('导入数据失败:', err);
    return false;
  }
}
~~~~~
~~~~~typescript.new
import { getCardById } from '../../config/cards';
import { loadTrainingPlan, saveTrainingPlan } from '../planStorage';
import { loadSettings, saveSettings } from '../settings';
import { DB_VERSION, type TrainingDomain, getDB } from './schema';

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const settings = loadSettings();
  const trainingPlan = loadTrainingPlan();

  const exportObject = {
    appName: 'FormSight',
    version: DB_VERSION,
    exportAt: new Date().toISOString(),
    sessions,
    records,
    profiles,
    settings,
    trainingPlan,
  };

  return JSON.stringify(exportObject, null, 2);
}

export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    const db = await getDB();
    const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');

    if (data.sessions) {
      for (const s of data.sessions) {
        const domain = (s.domain || 'star') as TrainingDomain;
        const cardId = s.cardId || s.mode;
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
    }
    if (data.records) {
      for (const r of data.records) {
        const domain = (r.domain || 'star') as TrainingDomain;
        const cardId = r.cardId || r.mode;
        await tx.objectStore('records').put({ ...r, domain, cardId });
      }
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        const cardId = p.cardId || p.mode;
        const card = getCardById(cardId);
        const domain = card ? card.domain : ((p.domain || 'star') as TrainingDomain);
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
    }

    await tx.done;

    if (data.settings) {
      saveSettings(data.settings);
    }

    if (data.trainingPlan) {
      saveTrainingPlan(data.trainingPlan);
    }

    return true;
  } catch (err) {
    console.error('导入数据失败:', err);
    return false;
  }
}
~~~~~

#### Acts 3: 更新路由与训练会话引擎

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript.old
export type RouteLocation =
  | { type: 'home' }
  | { type: 'dashboard'; domain: TrainingDomain }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' };

function parseHash(hash: string): RouteLocation {
  const cleanHash = hash.replace(/^#\/?/, '').trim();
  if (!cleanHash) return { type: 'home' };

  const [pathPart, queryPart] = cleanHash.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  if (segments[0] === 'dashboard' && segments[1]) {
    const domain = segments[1] as TrainingDomain;
    if (
      [
        'abstraction',
        'concretization',
        'star',
        'color',
        'relative_color',
        'negative_space',
      ].includes(domain)
    ) {
      return { type: 'dashboard', domain };
    }
  }

  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const params = new URLSearchParams(queryPart || '');
    const sessionType = params.get('type') === 'benchmark' ? 'benchmark' : 'training';
    return { type: 'train', cardId, sessionType };
  }

  return { type: 'home' };
}

function stringifyRoute(route: RouteLocation): string {
  if (route.type === 'home') return '#/';
  if (route.type === 'dashboard') return `#/dashboard/${route.domain}`;
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
}
~~~~~
~~~~~typescript.new
export type RouteLocation =
  | { type: 'home' }
  | { type: 'dashboard'; domain: TrainingDomain }
  | { type: 'train'; cardId: string; sessionType: 'training' | 'benchmark' }
  | { type: 'plan-train' };

function parseHash(hash: string): RouteLocation {
  const cleanHash = hash.replace(/^#\/?/, '').trim();
  if (!cleanHash) return { type: 'home' };

  const [pathPart, queryPart] = cleanHash.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  if (segments[0] === 'plan-train') {
    return { type: 'plan-train' };
  }

  if (segments[0] === 'dashboard' && segments[1]) {
    const domain = segments[1] as TrainingDomain;
    if (
      [
        'abstraction',
        'concretization',
        'star',
        'color',
        'relative_color',
        'negative_space',
      ].includes(domain)
    ) {
      return { type: 'dashboard', domain };
    }
  }

  if (segments[0] === 'train' && segments[1]) {
    const cardId = segments[1];
    const params = new URLSearchParams(queryPart || '');
    const sessionType = params.get('type') === 'benchmark' ? 'benchmark' : 'training';
    return { type: 'train', cardId, sessionType };
  }

  return { type: 'home' };
}

function stringifyRoute(route: RouteLocation): string {
  if (route.type === 'home') return '#/';
  if (route.type === 'plan-train') return '#/plan-train';
  if (route.type === 'dashboard') return `#/dashboard/${route.domain}`;
  if (route.type === 'train') return `#/train/${route.cardId}?type=${route.sessionType}`;
  return '#/';
}
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  mode: string;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity?: StepGranularity;
  adaptiveMode?: AdaptiveMode;
  targetAccuracy?: number;
  blockSize?: number;
  idleTimeoutSec?: number;
  generateQuestion: (level: number) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  saveTrialRecord: (params: {
    sessionId: string;
    question: TQuestion;
    hitResult: THitResult;
    responseTimeMs: number;
    userVal: TAnswerVal;
  }) => Promise<void>;
  saveSession: (params: {
    sessionId: string;
    totalTrials: number;
    hitTrials: number;
    ended: boolean;
    startTimestamp: number;
    endLevel: number;
  }) => Promise<void>;
  onExit: () => void;
}
~~~~~
~~~~~typescript.new
export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  mode: string;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity?: StepGranularity;
  adaptiveMode?: AdaptiveMode;
  targetAccuracy?: number;
  blockSize?: number;
  idleTimeoutSec?: number;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  generateQuestion: (level: number) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  saveTrialRecord: (params: {
    sessionId: string;
    question: TQuestion;
    hitResult: THitResult;
    responseTimeMs: number;
    userVal: TAnswerVal;
  }) => Promise<void>;
  saveSession: (params: {
    sessionId: string;
    totalTrials: number;
    hitTrials: number;
    ended: boolean;
    startTimestamp: number;
    endLevel: number;
  }) => Promise<void>;
  onExit: () => void;
}
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript.old
  const handleAnswer = useCallback(
    async (userVal: TAnswerVal) => {
      const responseTimeMs = Date.now() - questionStartTime;
      const hitResult = evaluateAnswer(userVal, question);
      const hit = isHit(hitResult);

      if (hit) {
        streakRef.current += 1;
        playHitSound(streakRef.current);
      } else {
        streakRef.current = 0;
        playMissSound();
      }

      setUserAnswer(hitResult);
      setShowAnswer(true);

      const newTotal = totalTrials + 1;
      const newHits = hitTrials + (hit ? 1 : 0);
      setTotalTrials(newTotal);
      setHitTrials(newHits);

      await saveTrialRecord({
        sessionId: sessionIdRef.current,
        question,
        hitResult,
        responseTimeMs,
        userVal,
      });

      setSessionHistory((prev) => [
        ...prev,
        {
          trialIndex: newTotal,
          level: getQuestionLevel(question),
          isHit: hit,
          responseTimeMs,
        },
      ]);

      adaptiveEngineRef.current.recordResult(hit);

      if (sessionType === 'benchmark' && newTotal >= 20) {
        setIsFinished(true);
        await saveCurrentSession(newTotal, newHits, true);
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          setShowSummaryModal(true);
        }, autoNextDelay);
      } else if (autoNext) {
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          handleNextQuestion();
        }, autoNextDelay);
      }
    },
    [
      questionStartTime,
      evaluateAnswer,
      question,
      isHit,
      totalTrials,
      hitTrials,
      saveTrialRecord,
      getQuestionLevel,
      sessionType,
      saveCurrentSession,
      autoNextDelay,
      autoNext,
      handleNextQuestion,
    ],
  );
~~~~~
~~~~~typescript.new
  const { targetLimitTrials, onTargetLimitReached } = options;

  const handleAnswer = useCallback(
    async (userVal: TAnswerVal) => {
      const responseTimeMs = Date.now() - questionStartTime;
      const hitResult = evaluateAnswer(userVal, question);
      const hit = isHit(hitResult);

      if (hit) {
        streakRef.current += 1;
        playHitSound(streakRef.current);
      } else {
        streakRef.current = 0;
        playMissSound();
      }

      setUserAnswer(hitResult);
      setShowAnswer(true);

      const newTotal = totalTrials + 1;
      const newHits = hitTrials + (hit ? 1 : 0);
      setTotalTrials(newTotal);
      setHitTrials(newHits);

      await saveTrialRecord({
        sessionId: sessionIdRef.current,
        question,
        hitResult,
        responseTimeMs,
        userVal,
      });

      const nextHistoryItem: SessionHistoryItem = {
        trialIndex: newTotal,
        level: getQuestionLevel(question),
        isHit: hit,
        responseTimeMs,
      };

      const updatedHistory = [...sessionHistory, nextHistoryItem];
      setSessionHistory(updatedHistory);

      adaptiveEngineRef.current.recordResult(hit);

      if (targetLimitTrials && newTotal >= targetLimitTrials) {
        setIsFinished(true);
        await saveCurrentSession(newTotal, newHits, true);
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          if (onTargetLimitReached) {
            onTargetLimitReached(updatedHistory);
          } else {
            setShowSummaryModal(true);
          }
        }, autoNextDelay);
      } else if (sessionType === 'benchmark' && newTotal >= 20) {
        setIsFinished(true);
        await saveCurrentSession(newTotal, newHits, true);
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          setShowSummaryModal(true);
        }, autoNextDelay);
      } else if (autoNext) {
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          handleNextQuestion();
        }, autoNextDelay);
      }
    },
    [
      questionStartTime,
      evaluateAnswer,
      question,
      isHit,
      totalTrials,
      hitTrials,
      saveTrialRecord,
      getQuestionLevel,
      sessionHistory,
      targetLimitTrials,
      onTargetLimitReached,
      sessionType,
      saveCurrentSession,
      autoNextDelay,
      autoNext,
      handleNextQuestion,
    ],
  );
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
export interface GenericTrainingViewProps {
  card: CardDefinition;
  plugin: AnyTrainingPlugin;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: BaseModuleSettings;
  globalSettings?: GlobalSettings;
  onExit: () => void;
}

export function GenericTrainingView({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  globalSettings,
  onExit,
}: GenericTrainingViewProps) {
  const domain = card.domain;
  const mode = card.mode;
  const adapter = plugin as unknown as GenericTrainingPluginAdapter;

  const session = useTrainingSession<unknown, unknown, unknown>({
    domain,
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => adapter.generateQuestion(mode, level, settings),
    evaluateAnswer: (userVal, q) => adapter.evaluateAnswer(userVal, q, mode),
    isHit: adapter.isHit,
    getQuestionLevel: adapter.getQuestionLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      await saveTrialRecord({
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        cardId: card.id,
        domain,
        mode,
        timestamp: Date.now(),
        difficultyLevel: adapter.getQuestionLevel(q),
        isHit: adapter.isHit(hitResult),
        responseTimeMs,
        details: adapter.extractRecordDetails(q, hitResult, userVal, mode),
      });
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveSession({
        id: sessionId,
        cardId: card.id,
        domain,
        mode,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });
~~~~~
~~~~~typescript.new
import type { SessionHistoryItem } from '../components/SessionSummaryModal';

export interface GenericTrainingViewProps {
  card: CardDefinition;
  plugin: AnyTrainingPlugin;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: BaseModuleSettings;
  globalSettings?: GlobalSettings;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  onExit: () => void;
}

export function GenericTrainingView({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  globalSettings,
  targetLimitTrials,
  onTargetLimitReached,
  onExit,
}: GenericTrainingViewProps) {
  const domain = card.domain;
  const mode = card.mode;
  const adapter = plugin as unknown as GenericTrainingPluginAdapter;

  const session = useTrainingSession<unknown, unknown, unknown>({
    domain,
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    targetLimitTrials,
    onTargetLimitReached,
    generateQuestion: (level) => adapter.generateQuestion(mode, level, settings),
    evaluateAnswer: (userVal, q) => adapter.evaluateAnswer(userVal, q, mode),
    isHit: adapter.isHit,
    getQuestionLevel: adapter.getQuestionLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      await saveTrialRecord({
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        cardId: card.id,
        domain,
        mode,
        timestamp: Date.now(),
        difficultyLevel: adapter.getQuestionLevel(q),
        isHit: adapter.isHit(hitResult),
        responseTimeMs,
        details: adapter.extractRecordDetails(q, hitResult, userVal, mode),
      });
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveSession({
        id: sessionId,
        cardId: card.id,
        domain,
        mode,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });
~~~~~

#### Acts 4: 编写计划系列 UI 组件

~~~~~act
write_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~typescript
import { ArrowRight, ChevronRight, Clock, Play, Plus, Sliders, Sparkles, Zap } from 'lucide-preact';
import { getCardById } from '../../config/cards';
import { DOMAINS_CONFIG } from '../../config/domains';
import type { TrainingPlan } from '../../types/plan';

interface PlanHeroCardProps {
  plan: TrainingPlan;
  onStartPlan: () => void;
  onOpenEditor: () => void;
}

export function PlanHeroCard({ plan, onStartPlan, onOpenEditor }: PlanHeroCardProps) {
  const hasItems = plan.items && plan.items.length > 0;
  const totalTrials = plan.items.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  if (!hasItems) {
    return (
      <div className="w-full bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 border-2 border-dashed border-indigo-200/80 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-100 text-indigo-600 rounded-2xl">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">今日训练计划</h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                未设置
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              按需编排多模块定制训练流，一站式贯通寻星、色感、相对推移与空间负形。
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditor}
          className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          定制我的训练流
        </button>
      </div>
    );
  }

  return (
    <div className="group w-full bg-white border border-indigo-100 hover:border-indigo-300 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-5 relative overflow-hidden">
      {/* 顶部标题与快速编辑入口 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm shadow-indigo-200">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">{plan.name}</h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                {plan.items.length} 个训练阶段
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-0.5">
              <span>合计 {totalTrials} 题</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                预计约 {estimatedMin} 分钟
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditor}
          className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
          title="调整阶段或题量"
        >
          <Sliders className="w-3.5 h-3.5" />
          编排计划
        </button>
      </div>

      {/* 中部阶段流水线胶囊展示 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {plan.items.map((item, idx) => {
          const card = getCardById(item.cardId);
          if (!card) return null;
          const meta = DOMAINS_CONFIG[card.domain];
          const Icon = card.icon;

          return (
            <div key={item.id} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-2xl shadow-inner">
                <div className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono text-[10px] font-black">
                  {idx + 1}
                </div>
                <Icon className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">{card.title}</span>
                <span className="text-[11px] font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                  {item.targetTrials}题
                </span>
              </div>
              {idx < plan.items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* 底部一键启动大按钮 */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-slate-400 font-medium">
          各阶段自适应难度与答题记录将自动同步至个人生涯档案
        </div>

        <button
          type="button"
          onClick={onStartPlan}
          className="py-3 px-6 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          开始今日训练流
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  X,
  Zap,
} from 'lucide-preact';
import { useState } from 'preact/hooks';
import { ALL_CARDS, getCardById } from '../../config/cards';
import { DOMAINS_CONFIG } from '../../config/domains';
import { DEFAULT_PLAN_TEMPLATES } from '../../config/planTemplates';
import type { PlanItem, PlanTemplate, TrainingPlan } from '../../types/plan';
import { createPlanFromTemplate } from '../../utils/planStorage';
import { ModalShell } from '../common/ModalShell';

interface PlanEditorModalProps {
  initialPlan: TrainingPlan;
  onClose: () => void;
  onSave: (newPlan: TrainingPlan) => void;
}

const TRIAL_PRESETS = [10, 15, 20, 30, 50];

export function PlanEditorModal({ initialPlan, onClose, onSave }: PlanEditorModalProps) {
  const [plan, setPlan] = useState<TrainingPlan>({ ...initialPlan });
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');
  const [isAddingCard, setIsAddingCard] = useState<boolean>(false);

  const handleApplyTemplate = (template: PlanTemplate) => {
    const newPlan = createPlanFromTemplate(template);
    setPlan(newPlan);
  };

  const handleAddItem = (cardId: string) => {
    const newItem: PlanItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      cardId,
      targetTrials: 20,
    };
    setPlan((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setIsAddingCard(false);
  };

  const handleRemoveItem = (id: string) => {
    setPlan((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= plan.items.length) return;

    const newItems = [...plan.items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    setPlan((prev) => ({ ...prev, items: newItems }));
  };

  const handleUpdateTrials = (id: string, trials: number) => {
    setPlan((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, targetTrials: Math.max(5, trials) } : item,
      ),
    }));
  };

  const handleClearAll = () => {
    setPlan((prev) => ({ ...prev, items: [] }));
  };

  const handleSave = () => {
    onSave(plan);
    onClose();
  };

  const totalTrials = plan.items.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  const availableCards = ALL_CARDS.filter((card) => {
    if (selectedDomainFilter === 'all') return true;
    return card.domain === selectedDomainFilter;
  });

  return (
    <ModalShell title="定制日常训练流" icon={Sliders} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* 预设模板一键载入 */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
              快捷套用官方科学预设
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEFAULT_PLAN_TEMPLATES.map((tmpl) => (
              <button
                type="button"
                key={tmpl.id}
                onClick={() => handleApplyTemplate(tmpl)}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 rounded-2xl text-left transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
                    {tmpl.name}
                  </span>
                  {tmpl.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-md">
                      {tmpl.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{tmpl.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 计划阶段列表 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <span>已编排阶段序列 ({plan.items.length})</span>
              <span className="text-slate-400 font-normal">
                • 合计 {totalTrials} 题 · 约 {estimatedMin} 分钟
              </span>
            </div>
            {plan.items.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                清空阶段
              </button>
            )}
          </div>

          {plan.items.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50/50">
              <Zap className="w-6 h-6 text-slate-300" />
              <span>当前计划为空，请点击下方「添加训练阶段」或选用上方模板</span>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {plan.items.map((item, idx) => {
                const card = getCardById(item.cardId);
                if (!card) return null;
                const Icon = card.icon;

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <div className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{card.title}</div>
                        <div className="text-[10px] text-slate-400">{card.desc.slice(0, 26)}...</div>
                      </div>
                    </div>

                    {/* 题量选择档位 */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
                        {TRIAL_PRESETS.map((preset) => (
                          <button
                            type="button"
                            key={preset}
                            onClick={() => handleUpdateTrials(item.id, preset)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                              item.targetTrials === preset
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      {/* 排序与删除 */}
                      <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveItem(idx, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                          title="上移"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === plan.items.length - 1}
                          onClick={() => handleMoveItem(idx, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                          title="下移"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-1"
                          title="移除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 添加卡片选择器展开面板 */}
        {isAddingCard ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">挑选需要添加的训练模块：</span>
              <button
                type="button"
                onClick={() => setIsAddingCard(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                收起
              </button>
            </div>

            {/* 领域分类 Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedDomainFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  selectedDomainFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                全部
              </button>
              {Object.values(DOMAINS_CONFIG).map((d) => (
                <button
                  type="button"
                  key={d.domain}
                  onClick={() => setSelectedDomainFilter(d.domain)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
                    selectedDomainFilter === d.domain
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {d.title}
                </button>
              ))}
            </div>

            {/* 模块卡片列表 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {availableCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    type="button"
                    key={card.id}
                    onClick={() => handleAddItem(card.id)}
                    className="p-2.5 bg-white hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-300 rounded-xl text-left transition-all flex items-center gap-2 group active:scale-95"
                  >
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform flex-shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">
                      {card.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingCard(true)}
            className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            添加训练阶段
          </button>
        )}

        {/* 底部保存提交 */}
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            保存计划
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/plan/PlanStepTransitionOverlay.tsx
~~~~~
~~~~~typescript
import { ArrowRight, CheckCircle2 } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import type { CardDefinition } from '../../types/card';

interface PlanStepTransitionOverlayProps {
  completedCard: CardDefinition;
  nextCard: CardDefinition;
  completedStepIndex: number;
  totalSteps: number;
  onProceed: () => void;
}

export function PlanStepTransitionOverlay({
  completedCard,
  nextCard,
  completedStepIndex,
  totalSteps,
  onProceed,
}: PlanStepTransitionOverlayProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onProceed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onProceed]);

  const CompletedIcon = completedCard.icon;
  const NextIcon = nextCard.icon;

  return (
    <div
      role="presentation"
      onClick={onProceed}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200 cursor-pointer select-none"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-white/80 p-7 flex flex-col items-center gap-5 text-center my-auto animate-in zoom-in-95">
        <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            阶段 {completedStepIndex + 1} / {totalSteps} 达成
          </span>
          <h2 className="text-lg font-black text-slate-800 mt-2">
            【{completedCard.title}】训练完成！
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            即将进入下一个阶段：
            <span className="font-bold text-indigo-600">{nextCard.title}</span>
          </p>
        </div>

        {/* 下阶段预览 */}
        <div className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 text-left">
          <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm border border-slate-100">
            <NextIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">{nextCard.title}</div>
            <div className="text-[11px] text-slate-400 line-clamp-1">{nextCard.instruction || nextCard.desc}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onProceed}
          className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
        >
          点击进入下一阶段 (Space)
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~typescript
import { ArrowRight, Award, CheckCircle, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';

export interface PlanStageResult {
  card: CardDefinition;
  targetTrials: number;
  history: SessionHistoryItem[];
}

interface PlanSummaryModalProps {
  planName: string;
  stageResults: PlanStageResult[];
  totalElapsedSeconds: number;
  onClose: () => void;
  onRestart: () => void;
}

export function PlanSummaryModal({
  planName,
  stageResults,
  totalElapsedSeconds,
  onClose,
  onRestart,
}: PlanSummaryModalProps) {
  const allHistory = stageResults.flatMap((s) => s.history);
  const totalTrials = allHistory.length;
  const hitCount = allHistory.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">今日训练流总结</h2>
              <p className="text-xs text-slate-400">
                {planName} • 完成共 {stageResults.length} 个训练阶段
              </p>
            </div>
          </div>
        </div>

        {/* 核心综合大盘卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              综合正确率
            </div>
            <div className="text-2xl font-black text-slate-800">{accuracy}%</div>
          </div>

          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              总击中题数
            </div>
            <div className="text-2xl font-black text-slate-800">
              {hitCount} <span className="text-xs font-normal text-slate-400">/ {totalTrials}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              总用时
            </div>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {formatTime(totalElapsedSeconds)}
            </div>
          </div>
        </div>

        {/* 分阶段明细成果 */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">阶段明细成绩</div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {stageResults.map((stage, idx) => {
              const stageHits = stage.history.filter((h) => h.isHit).length;
              const stageAcc =
                stage.history.length > 0
                  ? Math.round((stageHits / stage.history.length) * 100)
                  : 0;
              const startLvl = stage.history.length > 0 ? stage.history[0].level : 5;
              const endLvl =
                stage.history.length > 0
                  ? stage.history[stage.history.length - 1].level
                  : startLvl;
              const Icon = stage.card.icon;

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
                      <div className="text-xs font-bold text-slate-800">{stage.card.title}</div>
                      <div className="text-[10px] text-slate-400">
                        {stageHits}/{stage.history.length} 题正确
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded-xl border border-slate-200/60">
                      <span>L{startLvl}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-indigo-600">L{endLvl}</span>
                    </div>

                    <span
                      className={`text-xs font-black font-mono px-2 py-1 rounded-xl ${
                        stageAcc >= 80
                          ? 'bg-emerald-100 text-emerald-700'
                          : stageAcc >= 60
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {stageAcc}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部动作按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Home className="w-4 h-4" />
            完成并返回主页
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            再练一遍此计划
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 5: 编写训练流水线调度视图 PlanTrainingView

~~~~~act
write_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { PlanStepTransitionOverlay } from '../components/plan/PlanStepTransitionOverlay';
import {
  type PlanStageResult,
  PlanSummaryModal,
} from '../components/plan/PlanSummaryModal';
import { getCardById } from '../config/cards';
import { CARD_PLUGINS } from '../config/trainingPlugins';
import type { TrainingPlan } from '../types/plan';
import { getProfile } from '../utils/db';
import { type UserSettings, getCardSettings } from '../utils/settings';
import { GenericTrainingView } from './GenericTrainingView';

interface PlanTrainingViewProps {
  plan: TrainingPlan;
  settings: UserSettings;
  onExit: () => void;
}

export function PlanTrainingView({ plan, settings, onExit }: PlanTrainingViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stageResults, setStageResults] = useState<PlanStageResult[]>([]);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [sessionStartTime] = useState<number>(Date.now());
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);

  const currentStep = plan.items[currentStepIndex];
  const currentCard = currentStep ? getCardById(currentStep.cardId) : null;
  const nextStep = plan.items[currentStepIndex + 1];
  const nextCard = nextStep ? getCardById(nextStep.cardId) : null;

  // 加载当前卡片生涯等级
  useEffect(() => {
    if (currentCard) {
      getProfile(currentCard.id).then((p) => {
        setStageInitialLevel(p?.currentLevel || 5);
      });
    }
  }, [currentCard]);

  // 总计时器
  useEffect(() => {
    const timer = setInterval(() => {
      if (!showSummaryModal) {
        setTotalElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime, showSummaryModal]);

  const handleStageReached = useCallback(
    (history: SessionHistoryItem[]) => {
      if (!currentCard) return;

      const stageRes: PlanStageResult = {
        card: currentCard,
        targetTrials: currentStep.targetTrials,
        history,
      };

      setStageResults((prev) => [...prev, stageRes]);

      if (currentStepIndex + 1 < plan.items.length) {
        setIsTransitioning(true);
      } else {
        setShowSummaryModal(true);
      }
    },
    [currentCard, currentStep, currentStepIndex, plan.items.length],
  );

  const handleProceedNextStage = useCallback(() => {
    setIsTransitioning(false);
    setCurrentStepIndex((prev) => prev + 1);
  }, []);

  const handleRestartPlan = useCallback(() => {
    setShowSummaryModal(false);
    setIsTransitioning(false);
    setCurrentStepIndex(0);
    setStageResults([]);
  }, []);

  if (!currentCard || !plan.items || plan.items.length === 0) {
    onExit();
    return null;
  }

  const plugin = CARD_PLUGINS[currentCard.id];
  const cardConfig = getCardSettings(settings, currentCard.id);

  return (
    <div className="w-full">
      {/* 顶部流水线全局进度 */}
      <div className="max-w-5xl mx-auto mb-4 bg-indigo-900 text-white px-5 py-3 rounded-2xl shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-black bg-indigo-600 px-2.5 py-1 rounded-xl">
            阶段 {currentStepIndex + 1} / {plan.items.length}
          </span>
          <span className="text-xs font-bold text-indigo-100">{plan.name}</span>
        </div>

        <div className="text-xs text-indigo-200 font-mono font-bold">
          本阶段目标: {currentStep.targetTrials} 题
        </div>
      </div>

      <GenericTrainingView
        key={`plan-stage-${currentStepIndex}-${currentCard.id}`}
        card={currentCard}
        plugin={plugin}
        sessionType="training"
        initialLevel={stageInitialLevel}
        settings={cardConfig}
        globalSettings={settings.global}
        targetLimitTrials={currentStep.targetTrials}
        onTargetLimitReached={handleStageReached}
        onExit={onExit}
      />

      {isTransitioning && nextCard && (
        <PlanStepTransitionOverlay
          completedCard={currentCard}
          nextCard={nextCard}
          completedStepIndex={currentStepIndex}
          totalSteps={plan.items.length}
          onProceed={handleProceedNextStage}
        />
      )}

      {showSummaryModal && (
        <PlanSummaryModal
          planName={plan.name}
          stageResults={stageResults}
          totalElapsedSeconds={totalElapsedSeconds}
          onClose={onExit}
          onRestart={handleRestartPlan}
        />
      )}
    </div>
  );
}
~~~~~

#### Acts 6: 集成主页 Home 与 App 入口

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
import { ArrowRight, BarChart2, Clock, Sliders, Sparkles } from 'lucide-preact';
import { DOMAINS_CONFIG } from '../config/domains';
import { type TrainingDomain, formatTotalTime } from '../utils/db';

interface HomeProps {
  totalTimeMs: number;
  domainTimes: Record<TrainingDomain, number>;
  onNavigateDomain: (domain: TrainingDomain) => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  domainTimes,
  onNavigateDomain,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const domainOrder: TrainingDomain[] = [
    'star',
    'color',
    'relative_color',
    'negative_space',
    'abstraction',
    'concretization',
  ];
  const domains = domainOrder.map((d) => DOMAINS_CONFIG[d]);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-10">
      {/* 品牌 Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-8 py-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-200">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              FormSight{' '}
              <span className="text-xs font-extrabold px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                v{__APP_VERSION__}
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">视觉造型构图与色彩感知强化训练系统</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>{formatTotalTime(totalTimeMs)}</span>
          </div>
          <button
            type="button"
            onClick={onOpenGlobalStats}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            title="全局统计"
          >
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            统计
          </button>
          <button
            type="button"
            onClick={onOpenGlobalSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5"
            title="全局设置"
          >
            <Sliders className="w-4 h-4" />
            全局设置
          </button>
        </div>
      </div>

      {/* 模块选择区：元数据动态渲染 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
~~~~~
~~~~~typescript.new
import { ArrowRight, BarChart2, Clock, Sliders, Sparkles } from 'lucide-preact';
import { PlanHeroCard } from '../components/plan/PlanHeroCard';
import { DOMAINS_CONFIG } from '../config/domains';
import type { TrainingPlan } from '../types/plan';
import { type TrainingDomain, formatTotalTime } from '../utils/db';

interface HomeProps {
  totalTimeMs: number;
  domainTimes: Record<TrainingDomain, number>;
  trainingPlan: TrainingPlan;
  onNavigateDomain: (domain: TrainingDomain) => void;
  onStartPlan: () => void;
  onOpenPlanEditor: () => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  domainTimes,
  trainingPlan,
  onNavigateDomain,
  onStartPlan,
  onOpenPlanEditor,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const domainOrder: TrainingDomain[] = [
    'star',
    'color',
    'relative_color',
    'negative_space',
    'abstraction',
    'concretization',
  ];
  const domains = domainOrder.map((d) => DOMAINS_CONFIG[d]);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      {/* 品牌 Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-8 py-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-200">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              FormSight{' '}
              <span className="text-xs font-extrabold px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                v{__APP_VERSION__}
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">视觉造型构图与色彩感知强化训练系统</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>{formatTotalTime(totalTimeMs)}</span>
          </div>
          <button
            type="button"
            onClick={onOpenGlobalStats}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            title="全局统计"
          >
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            统计
          </button>
          <button
            type="button"
            onClick={onOpenGlobalSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5"
            title="全局设置"
          >
            <Sliders className="w-4 h-4" />
            全局设置
          </button>
        </div>
      </div>

      {/* 计划 Hero 区域 */}
      <PlanHeroCard
        plan={trainingPlan}
        onStartPlan={onStartPlan}
        onOpenEditor={onOpenPlanEditor}
      />

      {/* 模块选择区：元数据动态渲染 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
import { useCallback, useEffect, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { GenericDashboard } from './components/dashboard/GenericDashboard';
import { getCardById } from './config/cards';
import { DOMAINS_CONFIG } from './config/domains';
import { CARD_PLUGINS } from './config/trainingPlugins';
import { useHashRoute } from './hooks/useHashRoute';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
import { type UserSettings, getCardSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';
~~~~~
~~~~~typescript.new
import { useCallback, useEffect, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { ToastContainer, type ToastMessage, type ToastType } from './components/common/Toast';
import { GenericDashboard } from './components/dashboard/GenericDashboard';
import { PlanEditorModal } from './components/plan/PlanEditorModal';
import { getCardById } from './config/cards';
import { DOMAINS_CONFIG } from './config/domains';
import { CARD_PLUGINS } from './config/trainingPlugins';
import { useHashRoute } from './hooks/useHashRoute';
import type { TrainingPlan } from './types/plan';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
import { loadTrainingPlan, saveTrainingPlan } from './utils/planStorage';
import { type UserSettings, getCardSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';
import { PlanTrainingView } from './views/PlanTrainingView';
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
export function App() {
  const { route, navigate } = useHashRoute();

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);
  const [activeAnalyticsCardId, setActiveAnalyticsCardId] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    abstraction: 0,
    concretization: 0,
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });

  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});
~~~~~
~~~~~typescript.new
export function App() {
  const { route, navigate } = useHashRoute();

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);
  const [activeAnalyticsCardId, setActiveAnalyticsCardId] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(loadTrainingPlan);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    abstraction: 0,
    concretization: 0,
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });

  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  const refreshProfiles = useCallback(async () => {
    const timesEntries = await Promise.all(
      ALL_DOMAINS.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    const allProfilesList = await Promise.all(ALL_DOMAINS.map((d) => getProfilesByDomain(d)));
    const pMap: Record<string, UnifiedProfileData> = {};
    for (const list of allProfilesList) {
      for (const p of list) {
        pMap[p.cardId] = p;
      }
    }

    setDomainTimes(timesMap);
    setCurrentDomainProfiles(pMap);
    setSettings(loadSettings());
    setProfilesLoaded(true);
  }, []);
~~~~~
~~~~~typescript.new
  const refreshProfiles = useCallback(async () => {
    const timesEntries = await Promise.all(
      ALL_DOMAINS.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    const allProfilesList = await Promise.all(ALL_DOMAINS.map((d) => getProfilesByDomain(d)));
    const pMap: Record<string, UnifiedProfileData> = {};
    for (const list of allProfilesList) {
      for (const p of list) {
        pMap[p.cardId] = p;
      }
    }

    setDomainTimes(timesMap);
    setCurrentDomainProfiles(pMap);
    setSettings(loadSettings());
    setTrainingPlan(loadTrainingPlan());
    setProfilesLoaded(true);
  }, []);
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  useEffect(() => {
    if (route.type === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else if (route.type === 'dashboard') {
      const meta = DOMAINS_CONFIG[route.domain];
      document.title = `${meta.title} (${meta.subTitle}) - FormSight`;
    } else if (route.type === 'train') {
      const card = getCardById(route.cardId);
      document.title = `${card?.title || '训练'} - FormSight`;
    }
  }, [route]);
~~~~~
~~~~~typescript.new
  useEffect(() => {
    if (route.type === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else if (route.type === 'plan-train') {
      document.title = `${trainingPlan.name || '今日训练流'} - FormSight`;
    } else if (route.type === 'dashboard') {
      const meta = DOMAINS_CONFIG[route.domain];
      document.title = `${meta.title} (${meta.subTitle}) - FormSight`;
    } else if (route.type === 'train') {
      const card = getCardById(route.cardId);
      document.title = `${card?.title || '训练'} - FormSight`;
    }
  }, [route, trainingPlan.name]);
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
      {route.type === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          domainTimes={domainTimes}
          onNavigateDomain={(domain) => navigate({ type: 'dashboard', domain })}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}
~~~~~
~~~~~typescript.new
      {route.type === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          domainTimes={domainTimes}
          trainingPlan={trainingPlan}
          onNavigateDomain={(domain) => navigate({ type: 'dashboard', domain })}
          onStartPlan={() => navigate({ type: 'plan-train' })}
          onOpenPlanEditor={() => setIsPlanEditorOpen(true)}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {route.type === 'plan-train' && (
        <PlanTrainingView
          plan={trainingPlan}
          settings={settings}
          onExit={() => {
            refreshProfiles();
            navigate({ type: 'home' });
          }}
        />
      )}
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
      {activeAnalyticsCard && (
        <WeaknessAnalyticsModal
          card={activeAnalyticsCard}
          onClose={() => setActiveAnalyticsCardId(null)}
        />
      )}
    </div>
  );
}
~~~~~
~~~~~typescript.new
      {activeAnalyticsCard && (
        <WeaknessAnalyticsModal
          card={activeAnalyticsCard}
          onClose={() => setActiveAnalyticsCardId(null)}
        />
      )}

      {isPlanEditorOpen && (
        <PlanEditorModal
          initialPlan={trainingPlan}
          onClose={() => setIsPlanEditorOpen(false)}
          onSave={(newPlan) => {
            saveTrainingPlan(newPlan);
            setTrainingPlan(newPlan);
            showToast('训练计划已成功更新', 'success');
          }}
        />
      )}
    </div>
  );
}
~~~~~

### 下一步建议
1. **运行构建与校验**：执行 `npm run check` 或 `npm run build` 验证 TypeScript 类型与 Biome 规范。
2. **测试体验**：
   - 打开主页，体验从默认空计划选用推荐模板（如“晨间感知全能热身”）。
   - 点击“开始今日训练流”，验证跨卡片的流畅自动流转、阶段完成浮层及结课大盘总结。
3. **编写单元测试**：为 `src/utils/planStorage.ts` 编写针对模板加载和数据解析的单元测试。

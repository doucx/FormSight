好的，我将为你生成完整的实施计划，为不可用/占位卡片增加实验性标志，并在全局设置中提供显隐控制。

## [WIP] feat(settings): 支持实验性卡片占位标记与全局显隐切换

### 用户需求
1. 为尚未完善或处于试验阶段的训练卡片（如“黑白素描归组”、“几何大模寻形”）标记“实验性（Experimental）”属性，作为占位。
2. 在全局设置中增加“显示实验性训练模块”开关，默认关闭。
3. 看板（Dashboard）默认过滤实验性卡片；开启后展示并附带清晰的实验性徽标。
4. 训练界面 Header 对实验性卡片展示相应标识。

### 评论
这是一个非常有利于产品迭代和用户体验的设计。它既能保留处于算法探索阶段的卡片架构与代码，为后续完善预留清晰的占位入口，又能避免普通用户在日常练习中遇到未就绪的卡片产生困惑。

### 目标
1. 在 `CardDefinition` 中扩展 `isExperimental?: boolean` 字段。
2. 在 `GlobalSettings` 中新增 `showExperimentalCards`（默认为 `false`），并在 `GlobalSettingsModal` 中提供控制开关。
3. 在 `cards.ts` 中将 `abs_notan_threshold` 与 `abs_td_hull_2afc` 标注为 `isExperimental: true`。
4. 在 `ModeCard` 与 `GenericDashboard` 中实现实验性徽章展示与按设置过滤逻辑。
5. 在 `TrainingShell` 顶部状态栏添加实验性特性提示。

### 基本原理
1. 在配置层解耦：通过 `CardDefinition` 的静态元数据标记是否为实验性卡片；
2. 在状态层持久化：利用已有的 `UserSettings` 存储机制，将 `showExperimentalCards` 存储在本地；
3. 在表现层渐进增强：看板根据设置计算 `visibleCards`，同时在卡片和训练界面以低侵入性的琥珀色 `FlaskConical` 徽章标明。

### 标签
#intent/build #flow/ready #priority/high #comp/cli #concept/config #scope/ux #scope/api #ai/instruct #task/domain/settings #task/object/experimental-cards #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 扩展 CardDefinition 与 GlobalSettings 类型定义

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript.old
  tags: CardTags;
  settingsKey?: string; // 兼容
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
}
~~~~~
~~~~~typescript.new
  tags: CardTags;
  settingsKey?: string; // 兼容
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
  isExperimental?: boolean;
}
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
}
~~~~~
~~~~~typescript.new
export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
  sliderHitMargin: number;
  showCanvasHints?: boolean;
  showExperimentalCards?: boolean;
}
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
  },
  cards: {
~~~~~
~~~~~typescript.new
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
    sliderHitMargin: 12,
    showCanvasHints: true,
    showExperimentalCards: false,
  },
  cards: {
~~~~~

#### Acts 2: 标注实验性卡片

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript.old
  {
    id: 'abs_notan_threshold',
    legacyDomain: 'abstraction',
    legacyMode: 'NOTAN_THRESHOLD',
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
    instruction: '调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态',
    icon: Sun,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
~~~~~
~~~~~typescript.new
  {
    id: 'abs_notan_threshold',
    legacyDomain: 'abstraction',
    legacyMode: 'NOTAN_THRESHOLD',
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
    instruction: '调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态',
    icon: Sun,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
    isExperimental: true,
  },
~~~~~

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~typescript.old
  {
    id: 'abs_td_hull_2afc',
    legacyDomain: 'concretization',
    legacyMode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    instruction: '观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形',
    icon: Columns,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
~~~~~
~~~~~typescript.new
  {
    id: 'abs_td_hull_2afc',
    legacyDomain: 'concretization',
    legacyMode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    instruction: '观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形',
    icon: Columns,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
    isExperimental: true,
  },
~~~~~

#### Acts 3: 在全局设置面板中添加控制开关

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
import {
  Clock,
  Download,
  HelpCircle,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-preact';
~~~~~
~~~~~typescript.new
import {
  Clock,
  Download,
  FlaskConical,
  HelpCircle,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-preact';
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
  const handleToggleHints = () => {
    const current = settings.global.showCanvasHints ?? true;
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        showCanvasHints: !current,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleIdleTimeoutChange = (sec: number) => {
~~~~~
~~~~~typescript.new
  const handleToggleHints = () => {
    const current = settings.global.showCanvasHints ?? true;
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        showCanvasHints: !current,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleToggleExperimental = () => {
    const current = settings.global.showExperimentalCards ?? false;
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        showExperimentalCards: !current,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleIdleTimeoutChange = (sec: number) => {
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript.old
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">显示任务文字指引</div>
                <div className="text-[11px] text-slate-400">
                  在画布上方展示极简提示，关闭进入全沉浸模式
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleHints}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {(settings.global.showCanvasHints ?? true) ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
~~~~~
~~~~~typescript.new
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">显示任务文字指引</div>
                <div className="text-[11px] text-slate-400">
                  在画布上方展示极简提示，关闭进入全沉浸模式
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleHints}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {(settings.global.showCanvasHints ?? true) ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">显示实验性训练模块</div>
                <div className="text-[11px] text-slate-400">
                  开启后展示正在开发与算法演进中的占位卡片
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleExperimental}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {(settings.global.showExperimentalCards ?? false) ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>

          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
~~~~~

#### Acts 4: 看板卡片徽标与过滤展示

~~~~~act
patch_file
src/components/dashboard/ModeCard.tsx
~~~~~
~~~~~typescript.old
import { Award, BarChart2, Play, Sliders, Target, TrendingUp } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
~~~~~
~~~~~typescript.new
import { Award, BarChart2, FlaskConical, Play, Sliders, Target, TrendingUp } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
~~~~~

~~~~~act
patch_file
src/components/dashboard/ModeCard.tsx
~~~~~
~~~~~typescript.old
  currentLevel: number;
  accuracy: number;
  hasAnalytics?: boolean;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function ModeCard({
  title,
  desc,
  icon: Icon,
  todayCount,
  todayTimeMs = 0,
  currentLevel,
  accuracy,
  hasAnalytics = false,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
  onOpenAnalytics,
}: ModeCardProps) {
~~~~~
~~~~~typescript.new
  currentLevel: number;
  accuracy: number;
  hasAnalytics?: boolean;
  isExperimental?: boolean;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function ModeCard({
  title,
  desc,
  icon: Icon,
  todayCount,
  todayTimeMs = 0,
  currentLevel,
  accuracy,
  hasAnalytics = false,
  isExperimental = false,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
  onOpenAnalytics,
}: ModeCardProps) {
~~~~~

~~~~~act
patch_file
src/components/dashboard/ModeCard.tsx
~~~~~
~~~~~typescript.old
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">{desc}</p>
~~~~~
~~~~~typescript.new
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          {isExperimental && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg">
              <FlaskConical className="w-3 h-3 text-amber-600" />
              实验性
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed h-10">{desc}</p>
~~~~~

~~~~~act
patch_file
src/components/dashboard/GenericDashboard.tsx
~~~~~
~~~~~typescript.old
import { useEffect, useState } from 'preact/hooks';
import type { DomainMeta } from '../../config/domains';
import { useTodayStats } from '../../hooks/useTodayStats';
import { type UnifiedProfileData, getProfilesByDomain } from '../../utils/db';
import { DashboardShell } from './DashboardShell';
import { ModeCard } from './ModeCard';
~~~~~
~~~~~typescript.new
import { useEffect, useState } from 'preact/hooks';
import type { DomainMeta } from '../../config/domains';
import { useTodayStats } from '../../hooks/useTodayStats';
import { type UnifiedProfileData, getProfilesByDomain } from '../../utils/db';
import { loadSettings } from '../../utils/settings';
import { DashboardShell } from './DashboardShell';
import { ModeCard } from './ModeCard';
~~~~~

~~~~~act
patch_file
src/components/dashboard/GenericDashboard.tsx
~~~~~
~~~~~typescript.old
  return (
    <DashboardShell title={meta.title} subTitle={meta.subTitle} onBackToHome={onBackToHome}>
      {meta.cards.map((card) => {
        const profile = profiles[card.id];
        const totalTrials = profile?.totalTrials || 0;
        const accuracy =
          totalTrials > 0 && profile ? Math.round((profile.totalHits / totalTrials) * 100) : 0;
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[card.legacyMode] || todayStats[card.id] || { count: 0, timeMs: 0 };

        return (
          <ModeCard
            key={card.id}
            title={card.title}
            desc={card.desc}
            icon={card.icon}
            todayCount={stat.count}
            todayTimeMs={stat.timeMs}
            currentLevel={currentLevel}
            accuracy={accuracy}
            hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
            onStartTraining={() => onStart(card.id, 'training')}
            onStartBenchmark={() => onStart(card.id, 'benchmark')}
            onOpenSettings={() => onOpenCardSettings(card.id)}
            onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
          />
        );
      })}
    </DashboardShell>
  );
~~~~~
~~~~~typescript.new
  const showExperimental = loadSettings().global.showExperimentalCards ?? false;
  const visibleCards = meta.cards.filter((card) => showExperimental || !card.isExperimental);

  return (
    <DashboardShell title={meta.title} subTitle={meta.subTitle} onBackToHome={onBackToHome}>
      {visibleCards.map((card) => {
        const profile = profiles[card.id];
        const totalTrials = profile?.totalTrials || 0;
        const accuracy =
          totalTrials > 0 && profile ? Math.round((profile.totalHits / totalTrials) * 100) : 0;
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[card.legacyMode] || todayStats[card.id] || { count: 0, timeMs: 0 };

        return (
          <ModeCard
            key={card.id}
            title={card.title}
            desc={card.desc}
            icon={card.icon}
            todayCount={stat.count}
            todayTimeMs={stat.timeMs}
            currentLevel={currentLevel}
            accuracy={accuracy}
            hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
            isExperimental={Boolean(card.isExperimental)}
            onStartTraining={() => onStart(card.id, 'training')}
            onStartBenchmark={() => onStart(card.id, 'benchmark')}
            onOpenSettings={() => onOpenCardSettings(card.id)}
            onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
          />
        );
      })}
    </DashboardShell>
  );
~~~~~

#### Acts 5: 在训练状态栏展示实验性标识

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
import { ArrowLeft, ChevronRight, Clock, Crosshair, HelpCircle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
~~~~~
~~~~~typescript.new
import { ArrowLeft, ChevronRight, Clock, Crosshair, FlaskConical, HelpCircle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript.old
          {isTargeting && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              靶向强化训练
            </span>
          )}
        </div>
~~~~~
~~~~~typescript.new
          {isTargeting && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              靶向强化训练
            </span>
          )}

          {card.isExperimental && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
              实验性模块
            </span>
          )}
        </div>
~~~~~

### 下一步建议
1. **测试验证**：运行 `npm run check` 或 `npm run dev`，进入全局设置测试开启/关闭“显示实验性训练模块”，确认卡片显隐逻辑与徽标渲染符合预期。
2. **算法完善**：在后续迭代中继续完善“黑白素描归组”（如多阈值分层及能量优化）与“几何大模寻形”（生成高质量细碎剪影候选库）的实现，待算法成熟后移除其 `isExperimental` 标记。

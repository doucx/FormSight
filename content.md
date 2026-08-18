我们将分阶段推进 FormSight 的架构重构与精简。第一阶段的核心目标是：
1. 创建通用的领域元数据配置注册表 (`src/config/domains.ts`)。
2. 建立通用模态弹窗外壳 (`src/components/common/ModalShell.tsx`)，消除各 Modal 之间重复的 Backdrop 与 ESC 监听样板代码。
3. 建立通用数据看板 (`src/components/dashboard/GenericDashboard.tsx`)，统一 4 大训练领域的 Dashboard 渲染逻辑。
4. 重构 `src/app.tsx`，接入通用看板与聚合状态。

## [WIP] refactor: 抽象通用看板、模态底座与领域配置注册表

### 用户需求
通过架构级重构，消除 FormSight 前端项目中存在的跨领域看板冗余、模态框样板代码以及分散的路由状态，大幅精简代码体积并提升模块扩展性。

### 评论
这是一项高价值的架构重构。原实现中 4 个训练领域的 Dashboard 存在近 80% 的代码重复，且每个 Modal 都在重复实现键盘监听与背景遮罩。通过配置驱动（Configuration-driven UI）与组合式外壳组件（Shell Pattern），可以在保持完全向后兼容与视觉一致的前提下，显著降低代码维护成本并减小打包体积。

### 目标
1. 新建 `src/config/domains.ts` 统一管理 4 大领域的标题、说明、模式配置与弱点分析支持能力。
2. 新建 `src/components/common/ModalShell.tsx` 抽象通用弹窗底座。
3. 新建 `src/components/dashboard/GenericDashboard.tsx` 替代原有的 4 个重复 Dashboard。
4. 重构 `src/app.tsx` 统一路由调度与看板挂载。
5. 优化现存 Modals（如 `GlobalSettingsModal`、`SettingsModal`）接入 `ModalShell`。

### 基本原理
- **配置驱动 UI (Config-driven UI)**：将领域（Star、Color、Relative Color、Negative Space）的静态元数据（图标、模式文案、路由映射）从视图组件中解耦，移入单一的事实来源 `domains.ts`。
- **Shell 组件模式**：将 Backdrop、点击外部关闭、ESC 按键监听、圆角阴影容器与 Header 头系统收敛进 `ModalShell`。
- **渐进式替换**：在确保现有功能无回归的前提下平滑替换并精简视图层。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/ui #task/object/architecture-refactoring #task/action/refactor #task/state/begin #task/status/active

---

### Script

#### Acts 1: 创建领域配置注册表 `domains.ts`

定义所有训练领域的元数据与子模式配置，作为驱动 Dashboard 与导航的唯一事实来源。

~~~~~act
write_file
src/config/domains.ts
~~~~~
~~~~~typescript
import {
  Compass,
  Crosshair,
  Droplet,
  Maximize2,
  Palette,
  RotateCw,
  Shuffle,
  Sun,
  Target,
} from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { TrainingDomain } from '../utils/db';

export interface ModeConfig {
  id: string;
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
}

export interface DomainMeta {
  domain: TrainingDomain;
  appId: 'star-hopping' | 'color-sense' | 'relative-color' | 'negative-space';
  title: string;
  subTitle: string;
  homeTitle: string;
  homeDesc: string;
  themeColor: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon: (props: { className?: string }) => ComponentChildren;
  hasWeaknessAnalytics?: boolean;
  modes: ModeConfig[];
}

export const DOMAINS_CONFIG: Record<TrainingDomain, DomainMeta> = {
  star: {
    domain: 'star',
    appId: 'star-hopping',
    title: '寻星练习',
    subTitle: 'Star-Hopping',
    homeTitle: '寻星练习 (Star-Hopping)',
    homeDesc:
      '基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。',
    themeColor: 'indigo',
    icon: Compass,
    hasWeaknessAnalytics: true,
    modes: [
      {
        id: 'single',
        title: '单锚点模式',
        desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
        icon: Target,
      },
      {
        id: 'double_h',
        title: '水平双锚点',
        desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
        icon: Crosshair,
      },
      {
        id: 'double_r',
        title: '旋转双锚点',
        desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
        icon: RotateCw,
      },
    ],
  },
  color: {
    domain: 'color',
    appId: 'color-sense',
    title: '色感训练',
    subTitle: 'Color Recognition',
    homeTitle: '绝对色感 (Color Recognition)',
    homeDesc:
      '拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation) 的分级递进识别，全面建立微小色彩差异感知力。',
    themeColor: 'amber',
    icon: Palette,
    hasWeaknessAnalytics: true,
    modes: [
      {
        id: 'H',
        title: '色相 (Hue)',
        desc: '识别颜色在色相环上的具体角度 (0°~360°)',
        icon: RotateCw,
      },
      {
        id: 'V',
        title: '明度 (Value)',
        desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
        icon: Sun,
      },
      {
        id: 'S',
        title: '饱和度 (Sat)',
        desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
        icon: Droplet,
      },
      {
        id: 'ALL',
        title: '综合拾色 (Match)',
        desc: '同时调整色相、饱和度与明度，逼近真理色彩',
        icon: Palette,
      },
    ],
  },
  relative_color: {
    domain: 'relative_color',
    appId: 'relative-color',
    title: '相对色感',
    subTitle: 'Relative Color',
    homeTitle: '相对色感 (Relative Color Perception)',
    homeDesc:
      '基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。',
    themeColor: 'purple',
    icon: Shuffle,
    hasWeaknessAnalytics: false,
    modes: [
      {
        id: 'VECTOR_SHIFT',
        title: '色彩矢量迁移',
        desc: '保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。',
        icon: Shuffle,
      },
    ],
  },
  negative_space: {
    domain: 'negative_space',
    appId: 'negative-space',
    title: '正负形感知',
    subTitle: 'Negative Space',
    homeTitle: '正负形空间感知 (Negative Space)',
    homeDesc:
      '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
    hasWeaknessAnalytics: false,
    modes: [
      {
        id: 'RATIO_ESTIMATION',
        title: '负形占比滑块评估',
        desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
        icon: Maximize2,
      },
    ],
  },
};
~~~~~

#### Acts 2: 创建通用弹窗容器 `ModalShell.tsx`

统一遮罩层、Escape 键监听、入场动画与 Header 头部布局。

~~~~~act
write_file
src/components/common/ModalShell.tsx
~~~~~
~~~~~typescript
import { X } from 'lucide-preact';
import type { ComponentChildren } from 'preact';

interface ModalShellProps {
  title: string;
  subTitle?: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  maxWidth?: string;
  onClose: () => void;
  headerAction?: ComponentChildren;
  children: ComponentChildren;
}

export function ModalShell({
  title,
  subTitle,
  icon: Icon,
  maxWidth = 'max-w-md',
  onClose,
  headerAction,
  children,
}: ModalShellProps) {
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${maxWidth} bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-800">{title}</h2>
              {subTitle && <p className="text-xs text-slate-400">{subTitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
~~~~~

#### Acts 3: 创建通用领域看板组件 `GenericDashboard.tsx`

统一 4 个领域的看板视图，直接通过 `DomainMeta` 驱动，动态查询当天做答情况与历史能力 profile。

~~~~~act
write_file
src/components/dashboard/GenericDashboard.tsx
~~~~~
~~~~~typescript
import { useEffect, useState } from 'preact/hooks';
import type { DomainMeta } from '../../config/domains';
import { useTodayStats } from '../../hooks/useTodayStats';
import { type UnifiedProfileData, getProfilesByDomain } from '../../utils/db';
import { DashboardShell } from './DashboardShell';
import { ModeCard } from './ModeCard';

interface GenericDashboardProps {
  meta: DomainMeta;
  onStart: (mode: string, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function GenericDashboard({
  meta,
  onStart,
  onBackToHome,
  onOpenSettings,
  onOpenAnalytics,
}: GenericDashboardProps) {
  const todayStats = useTodayStats(meta.domain);
  const [profiles, setProfiles] = useState<Record<string, UnifiedProfileData>>({});

  useEffect(() => {
    let isMounted = true;
    getProfilesByDomain(meta.domain).then((list) => {
      if (!isMounted) return;
      const map: Record<string, UnifiedProfileData> = {};
      for (const p of list) {
        map[p.mode] = p;
      }
      setProfiles(map);
    });
    return () => {
      isMounted = false;
    };
  }, [meta.domain]);

  return (
    <DashboardShell
      title={meta.title}
      subTitle={meta.subTitle}
      onBackToHome={onBackToHome}
      onOpenSettings={onOpenSettings}
      onOpenAnalytics={meta.hasWeaknessAnalytics ? onOpenAnalytics : undefined}
    >
      {meta.modes.map((config) => {
        const profile = profiles[config.id];
        const totalCards = profile?.totalTrainedCards || 0;
        const accuracy =
          totalCards > 0 && profile ? Math.round((profile.totalHits / totalCards) * 100) : 0;
        const currentLevel = profile?.currentLevel || 5;
        const stat = todayStats[config.id] || { count: 0, timeMs: 0 };

        return (
          <ModeCard
            key={config.id}
            title={config.title}
            desc={config.desc}
            icon={config.icon}
            todayCount={stat.count}
            todayTimeMs={stat.timeMs}
            currentLevel={currentLevel}
            accuracy={accuracy}
            onStartTraining={() => onStart(config.id, 'training')}
            onStartBenchmark={() => onStart(config.id, 'benchmark')}
          />
        );
      })}
    </DashboardShell>
  );
}
~~~~~

#### Acts 4: 重构 `src/app.tsx` 接入通用看板与聚合状态

使用 `DOMAINS_CONFIG` 驱动看板渲染，精简大量各自独立的 Profiles 状态与重复的看板加载逻辑。

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { AnalyticsModal } from './components/AnalyticsModal';
import { ColorAnalyticsModal } from './components/ColorAnalyticsModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { GenericDashboard } from './components/dashboard/GenericDashboard';
import { DOMAINS_CONFIG } from './config/domains';
import type { TrainingMode } from './types';
import type { ColorMode } from './utils/colorUtils';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getColorTrainingTimeMs,
  getProfilesByDomain,
  getStarHoppingTrainingTimeMs,
  getTrainingTimeMs,
} from './utils/db';
import type { NegativeSpaceMode } from './utils/negativeSpaceUtils';
import type { RelativeColorMode } from './utils/relativeColorUtils';
import { type UserSettings, loadSettings } from './utils/settings';
import { ColorTrainingView } from './views/ColorTrainingView';
import { Home } from './views/Home';
import { NegativeSpaceTrainingView } from './views/NegativeSpaceTrainingView';
import { RelativeColorTrainingView } from './views/RelativeColorTrainingView';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense' | 'relative-color' | 'negative-space';

const APP_TO_DOMAIN: Record<Exclude<GlobalApp, 'home'>, TrainingDomain> = {
  'star-hopping': 'star',
  'color-sense': 'color',
  'relative-color': 'relative_color',
  'negative-space': 'negative_space',
};

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');

  // 当前活跃训练参数
  const [activeMode, setActiveMode] = useState<string>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  // 弹窗状态
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsDomain, setSettingsDomain] = useState<TrainingDomain>('star');

  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isColorAnalyticsOpen, setIsColorAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  // 聚合时长状态
  const [starHoppingTimeMs, setStarHoppingTimeMs] = useState<number>(0);
  const [colorTimeMs, setColorTimeMs] = useState<number>(0);
  const [relativeColorTimeMs, setRelativeColorTimeMs] = useState<number>(0);
  const [negativeSpaceTimeMs, setNegativeSpaceTimeMs] = useState<number>(0);

  // 当前领域的 profiles 缓存 (用于获取当前等级)
  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});

  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const relMs = await getTrainingTimeMs('relative_color');
    const nsMs = await getTrainingTimeMs('negative_space');

    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
    setRelativeColorTimeMs(relMs);
    setNegativeSpaceTimeMs(nsMs);
    setSettings(loadSettings());

    if (currentApp !== 'home') {
      const d = APP_TO_DOMAIN[currentApp];
      const pList = await getProfilesByDomain(d);
      const pMap: Record<string, UnifiedProfileData> = {};
      for (const p of pList) {
        pMap[p.mode] = p;
      }
      setCurrentDomainProfiles(pMap);
    }
  }, [currentApp]);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  // 动态同步 Title
  useEffect(() => {
    if (currentApp === 'home') {
      document.title = 'FormSight - 视觉造型构图与色彩感知训练系统';
    } else {
      const d = APP_TO_DOMAIN[currentApp];
      const meta = DOMAINS_CONFIG[d];
      document.title = `${meta.title} (${meta.subTitle}) - FormSight`;
    }
  }, [currentApp]);

  const handleStartSession = (mode: string, type: 'training' | 'benchmark') => {
    setActiveMode(mode);
    setSessionType(type);
    setCurrentView('training');
  };

  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const currentLevel = currentDomainProfiles[activeMode]?.currentLevel || 5;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentApp === 'home' && (
        <Home
          totalTimeMs={
            starHoppingTimeMs + colorTimeMs + relativeColorTimeMs + negativeSpaceTimeMs
          }
          starHoppingTimeMs={starHoppingTimeMs}
          colorTimeMs={colorTimeMs}
          relativeColorTimeMs={relativeColorTimeMs}
          negativeSpaceTimeMs={negativeSpaceTimeMs}
          onNavigate={(app) => {
            setCurrentApp(app);
            setCurrentView('dashboard');
          }}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}

      {currentApp !== 'home' &&
        (() => {
          const domain = APP_TO_DOMAIN[currentApp];
          const meta = DOMAINS_CONFIG[domain];

          if (currentView === 'dashboard') {
            return (
              <GenericDashboard
                meta={meta}
                onStart={handleStartSession}
                onBackToHome={() => setCurrentApp('home')}
                onOpenSettings={() => {
                  setSettingsDomain(domain);
                  setIsSettingsOpen(true);
                }}
                onOpenAnalytics={() => {
                  if (domain === 'star') {
                    setAnalyticsMode('all');
                    setIsAnalyticsOpen(true);
                  } else if (domain === 'color') {
                    setIsColorAnalyticsOpen(true);
                  }
                }}
              />
            );
          }

          if (domain === 'star') {
            return (
              <TrainingView
                mode={activeMode as TrainingMode}
                sessionType={sessionType}
                initialLevel={currentLevel}
                settings={settings.star}
                onExit={handleExitTraining}
              />
            );
          }

          if (domain === 'color') {
            return (
              <ColorTrainingView
                mode={activeMode as ColorMode}
                sessionType={sessionType}
                initialLevel={currentLevel}
                settings={settings.color}
                onExit={handleExitTraining}
              />
            );
          }

          if (domain === 'relative_color') {
            return (
              <RelativeColorTrainingView
                mode={activeMode as RelativeColorMode}
                sessionType={sessionType}
                initialLevel={currentLevel}
                settings={settings.relative_color}
                onExit={handleExitTraining}
              />
            );
          }

          return (
            <NegativeSpaceTrainingView
              mode={activeMode as NegativeSpaceMode}
              sessionType={sessionType}
              initialLevel={currentLevel}
              settings={settings.negative_space}
              onExit={handleExitTraining}
            />
          );
        })()}

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
        />
      )}

      {isGlobalStatsOpen && <GlobalStatsModal onClose={() => setIsGlobalStatsOpen(false)} />}

      {isSettingsOpen && (
        <SettingsModal
          domain={settingsDomain}
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
        />
      )}

      {isAnalyticsOpen && (
        <AnalyticsModal initialMode={analyticsMode} onClose={() => setIsAnalyticsOpen(false)} />
      )}

      {isColorAnalyticsOpen && (
        <ColorAnalyticsModal onClose={() => setIsColorAnalyticsOpen(false)} />
      )}
    </div>
  );
}
~~~~~

#### Acts 5: 使用 `ModalShell` 重构 `GlobalSettingsModal` 与 `SettingsModal`

消除弹窗中重复的遮罩、ESC 监听、Card 容器和 Header 结构代码。

~~~~~act
write_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
import { Clock, Download, Sliders, ToggleLeft, ToggleRight, Trash2, Upload, Volume2 } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { clearAllData, exportAllData, importAllData } from '../utils/db';
import { loadSettings, saveSettings } from '../utils/settings';
import { ModalShell } from './common/ModalShell';

interface GlobalSettingsModalProps {
  onClose: () => void;
  onDataChanged: () => void;
}

export function GlobalSettingsModal({ onClose, onDataChanged }: GlobalSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState(loadSettings);

  const handleToggleSound = () => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        soundEnabled: !settings.global.soundEnabled,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleIdleTimeoutChange = (sec: number) => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        idleTimeout: sec,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleExport = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    a.download = `formsight_data_${dateStr}_${timeStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files?.[0]) {
      const file = target.files[0];
      const text = await file.text();
      const success = await importAllData(text);
      if (success) {
        alert('✅ 数据导入成功！');
        onDataChanged();
        onClose();
      } else {
        alert('❌ 导入失败，数据格式不匹配。');
      }
    }
  };

  const handleClearData = async () => {
    if (confirm('⚠️ 确定要清空 FormSight 所有训练日志、历史会话与能力数据吗？此操作无法撤销！')) {
      await clearAllData();
      alert('所有训练数据已清空。');
      onDataChanged();
      onClose();
    }
  };

  return (
    <ModalShell title="FormSight 全局设置" icon={Sliders} onClose={onClose} maxWidth="max-w-md">
      {/* 常规偏好 */}
      <div className="space-y-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">系统偏好</div>
        <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700">训练音效反馈</div>
              <div className="text-[11px] text-slate-400">答对清脆升调提示，答错低沉提示</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleSound}
            className="text-indigo-600 hover:opacity-80 transition-opacity"
          >
            {settings.global.soundEnabled ? (
              <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300" />
            )}
          </button>
        </div>

        <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700">闲置休眠保护</div>
              <div className="text-[11px] text-slate-400">无操作或切出窗口时暂停计时与模糊遮罩</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[
              { label: '关闭', value: 0 },
              { label: '30 秒', value: 30 },
              { label: '60 秒', value: 60 },
              { label: '120 秒', value: 120 },
            ].map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => handleIdleTimeoutChange(opt.value)}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  settings.global.idleTimeout === opt.value
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 数据管理 */}
      <div className="space-y-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          数据备份与恢复
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="py-3 px-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            导出全量 JSON
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-3 px-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            导入 JSON 备份
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        {/* 危险操作 */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-600">删除所有数据</div>
            <div className="text-[11px] text-slate-400">清空所有模块的本地练习记录</div>
          </div>
          <button
            type="button"
            onClick={handleClearData}
            className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空数据
          </button>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
        >
          完成
        </button>
      </div>
    </ModalShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
import { Flame, Sliders, Target, ToggleLeft, ToggleRight } from 'lucide-preact';
import { useState } from 'preact/hooks';
import type { TrainingDomain } from '../utils/db';
import {
  type ColorSenseSettings,
  type NegativeSpaceSettings,
  type RelativeColorSettings,
  type StarSettings,
  type UserSettings,
  saveSettings,
} from '../utils/settings';
import { ModalShell } from './common/ModalShell';
import { ColorSettingsForm } from './settings/ColorSettingsForm';
import { NegativeSpaceSettingsForm } from './settings/NegativeSpaceSettingsForm';
import { RelativeColorSettingsForm } from './settings/RelativeColorSettingsForm';
import { StarSettingsForm } from './settings/StarSettingsForm';

const DOMAIN_TITLE: Record<TrainingDomain, string> = {
  star: '寻星训练偏好设置',
  color: '绝对色感偏好设置',
  relative_color: '相对色感偏好设置',
  negative_space: '正负形感知偏好设置',
};

interface SettingsModalProps {
  domain: TrainingDomain;
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export function SettingsModal({ domain, settings, onClose, onSave }: SettingsModalProps) {
  const [current, setCurrent] = useState<UserSettings>({ ...settings });

  const updateDomainSettings = (
    patch:
      | Partial<StarSettings | ColorSenseSettings | RelativeColorSettings | NegativeSpaceSettings>
      | ((
          prev: StarSettings | ColorSenseSettings | RelativeColorSettings | NegativeSpaceSettings,
        ) => Partial<
          StarSettings | ColorSenseSettings | RelativeColorSettings | NegativeSpaceSettings
        >),
  ) => {
    setCurrent((prev) => {
      const prevDomainSettings = prev[domain];
      const updatedPatch = typeof patch === 'function' ? patch(prevDomainSettings) : patch;
      const nextDomainSettings = { ...prevDomainSettings, ...updatedPatch };
      const nextSettings = {
        ...prev,
        [domain]: nextDomainSettings,
      };
      saveSettings(nextSettings);
      onSave(nextSettings);
      return nextSettings;
    });
  };

  const domainSettings = current[domain];

  return (
    <ModalShell title={DOMAIN_TITLE[domain]} icon={Sliders} onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-5">
        {/* 通用配置：自动翻页开关 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-700">自动切换下一题</div>
            <div className="text-xs text-slate-400">点击答题后无需手动按空格切题</div>
          </div>
          <button
            type="button"
            onClick={() => updateDomainSettings({ autoNext: !domainSettings.autoNext })}
            className="text-indigo-600 hover:opacity-80 transition-opacity"
          >
            {domainSettings.autoNext ? (
              <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300" />
            )}
          </button>
        </div>

        {/* 通用配置：自动翻页延迟 */}
        {domainSettings.autoNext && (
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
              <span>切换延迟时间</span>
              <span className="font-mono text-indigo-600 font-bold">
                {domainSettings.autoNextDelay} ms
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={domainSettings.autoNextDelay}
              onInput={(e) => {
                const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                updateDomainSettings({ autoNextDelay: val });
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        )}

        {/* 通用配置：自适应算子模式 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700">自适应算子模式</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateDomainSettings({ adaptiveMode: 'block' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                domainSettings.adaptiveMode === 'block'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              轮次胜率评估 (推荐)
            </button>
            <button
              type="button"
              onClick={() => updateDomainSettings({ adaptiveMode: 'staircase' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                domainSettings.adaptiveMode === 'staircase'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              经典 3U1D 阶梯
            </button>
          </div>
        </div>

        {/* 轮次评估配置 */}
        {domainSettings.adaptiveMode === 'block' && (
          <div className="space-y-3 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span>目标通关正确率</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {Math.round(domainSettings.targetAccuracy * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.7, 0.8, 0.85, 0.9].map((acc) => (
                  <button
                    type="button"
                    key={acc}
                    onClick={() => updateDomainSettings({ targetAccuracy: acc })}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      domainSettings.targetAccuracy === acc
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {Math.round(acc * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span>每轮评估题量</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {domainSettings.blockSize} 题/轮
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[10, 15, 20].map((size) => (
                  <button
                    type="button"
                    key={size}
                    onClick={() => updateDomainSettings({ blockSize: size })}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      domainSettings.blockSize === size
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {size} 题
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 难度阶梯精细度 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700">难度阶梯精细度</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateDomainSettings({ stepGranularity: 'standard' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                domainSettings.stepGranularity === 'standard'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              标准阶梯 (大步幅)
            </button>
            <button
              type="button"
              onClick={() => updateDomainSettings({ stepGranularity: 'fine' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                domainSettings.stepGranularity === 'fine'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              精细阶梯 (小步幅)
            </button>
          </div>
        </div>

        {/* 渲染特定领域的表单 */}
        {domain === 'star' && (
          <StarSettingsForm
            settings={domainSettings as StarSettings}
            onChange={(patch) => updateDomainSettings(patch)}
          />
        )}

        {domain === 'color' && (
          <ColorSettingsForm
            settings={domainSettings as ColorSenseSettings}
            onChange={(patch) => updateDomainSettings(patch)}
          />
        )}

        {domain === 'relative_color' && (
          <RelativeColorSettingsForm
            settings={domainSettings as RelativeColorSettings}
            onChange={(patch) => updateDomainSettings(patch)}
          />
        )}

        {domain === 'negative_space' && (
          <NegativeSpaceSettingsForm
            settings={domainSettings as NegativeSpaceSettings}
            onChange={(patch) => updateDomainSettings(patch)}
          />
        )}
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
        >
          完成
        </button>
      </div>
    </ModalShell>
  );
}
~~~~~

#### Acts 6: 清理废弃的 4 个单体 Dashboard 文件

由于各领域已完全由 `GenericDashboard` 统一渲染，删除原有的 4 个重复 Dashboard 文件。

~~~~~act
delete_file
src/views/Dashboard.tsx
~~~~~

~~~~~act
delete_file
src/views/ColorDashboard.tsx
~~~~~

~~~~~act
delete_file
src/views/RelativeColorDashboard.tsx
~~~~~

~~~~~act
delete_file
src/views/NegativeSpaceDashboard.tsx
~~~~~

### 下一步建议

1. **测试验证**：执行 `npm run build` 和 `npm run check`，验证类型检查与页面构建。
2. **滑块逻辑收敛**：在下一计划中，将 `HsvTrackSlider`、`SingleDimensionSlider` 和 `NegativeSpaceCanvas` 中的拖拽 Pointer 逻辑收敛为通用 Hook `useTrackPointer`。
3. **设置项原子化**：提取 `SliderMarginGroup` 和 `SectorPicker` 组件，精简 `ColorSettingsForm`、`StarSettingsForm` 等表单代码。

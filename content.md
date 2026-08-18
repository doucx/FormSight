我将为你生成重构实施计划，对系统架构进行全面的体积瘦身，移除旧版历史迁移兼容包袱，并通过元数据驱动与组件复用大幅减少代码冗余。

## [WIP] refactor: 重构核心架构以精简代码体积并消除冗余

### 用户需求
实施之前分析的架构重构方案以缩减代码体积，不需要保留旧测试版历史数据的兼容迁移逻辑。

### 评论
通过将硬编码视图重构为元数据驱动（`DOMAINS_CONFIG`）、收敛滑块轨道组件、精简数据与设置层的历史兼容代码，能够大幅提升代码内聚性与可维护性，同时有效降低编译打包体积。

### 目标
1. **精简数据存储与设置层**：清理 `schema.ts`、`importExport.ts` 和 `settings.ts` 中的旧版兼容与手动字段映射代码。
2. **元数据驱动首页与全局统计**：重构 `Home.tsx`、`app.tsx` 和 `GlobalStatsModal.tsx`，消除重复的卡片模板及硬编码筛选器。
3. **收敛滑块轨道复用**：重构 `ColorCanvas.tsx`，移除内部重复的 `SingleDimensionSlider`，统一复用 `HsvTrackSlider`。

### 基本原理
- **声明式视图**：`DOMAINS_CONFIG` 已经包含了各训练领域的标题、描述、图标与子模式配置，首页和统计弹窗直接基于此元数据遍历渲染，新增或调整模块时无需修改多处 UI 模板。
- **状态聚合**：在 `app.tsx` 中使用 `Record<TrainingDomain, number>` 替代离散的时长状态变量，简化生命周期与派发逻辑。
- **消除沉没兼容包袱**：直接针对统一表结构与层级配置进行序列化和反序列化，去除数十行针对旧测试版本的历史数据升级与字段重命名转换分支。

### 标签
#intent/refine #flow/ready #priority/high #comp/runtime #comp/cli #concept/state #concept/ui #scope/core #scope/dx #ai/instruct #task/domain/architecture #task/object/codebase-slimming #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 精简数据库 Schema 与导入导出模块

移除旧版 `color_sessions`、`color_records` 和 `color_profiles` 迁移代码，保留干净的表结构与索引定义。

~~~~~act
write_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

export type TrainingDomain = 'star' | 'color' | 'relative_color' | 'negative_space';

export interface UnifiedSessionData {
  id: string;
  domain?: TrainingDomain;
  mode: string;
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface UnifiedTrialRecord {
  id: string;
  sessionId: string;
  domain?: TrainingDomain;
  mode: string;
  timestamp: number;
  difficultyLevel: number;
  isHit: boolean;
  responseTimeMs: number;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UnifiedProfileData {
  key: string;
  domain: TrainingDomain;
  mode: string;
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

export interface FormSightDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: UnifiedSessionData;
    indexes: {
      'by-domain': TrainingDomain;
      'by-domain-mode': [TrainingDomain, string];
    };
  };
  records: {
    key: string;
    value: UnifiedTrialRecord;
    indexes: {
      'by-session': string;
      'by-domain': TrainingDomain;
      'by-domain-mode': [TrainingDomain, string];
      'by-mode': string;
    };
  };
  user_profiles: {
    key: string;
    value: UnifiedProfileData;
    indexes: {
      'by-domain': TrainingDomain;
    };
  };
}

export const DB_NAME = 'StarHoppingDB';
export const DB_VERSION = 4;

let dbPromise: Promise<IDBPDatabase<FormSightDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<FormSightDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FormSightDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        const sessionsStore = db.objectStoreNames.contains('sessions')
          ? transaction.objectStore('sessions')
          : db.createObjectStore('sessions', { keyPath: 'id' });

        if (!sessionsStore.indexNames.contains('by-domain')) {
          sessionsStore.createIndex('by-domain', 'domain');
        }
        if (!sessionsStore.indexNames.contains('by-domain-mode')) {
          sessionsStore.createIndex('by-domain-mode', ['domain', 'mode']);
        }

        const recordsStore = db.objectStoreNames.contains('records')
          ? transaction.objectStore('records')
          : db.createObjectStore('records', { keyPath: 'id' });

        if (!recordsStore.indexNames.contains('by-session')) {
          recordsStore.createIndex('by-session', 'sessionId');
        }
        if (!recordsStore.indexNames.contains('by-domain')) {
          recordsStore.createIndex('by-domain', 'domain');
        }
        if (!recordsStore.indexNames.contains('by-domain-mode')) {
          recordsStore.createIndex('by-domain-mode', ['domain', 'mode']);
        }
        if (!recordsStore.indexNames.contains('by-mode')) {
          recordsStore.createIndex('by-mode', 'mode');
        }

        const profilesStore = db.objectStoreNames.contains('user_profiles')
          ? transaction.objectStore('user_profiles')
          : db.createObjectStore('user_profiles', { keyPath: 'key' });

        if (!profilesStore.indexNames.contains('by-domain')) {
          profilesStore.createIndex('by-domain', 'domain');
        }
      },
    });
  }
  return dbPromise;
}
~~~~~

~~~~~act
write_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript
import { loadSettings, saveSettings } from '../settings';
import { DB_VERSION, getDB } from './schema';

export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  const records = await db.getAll('records');
  const profiles = await db.getAll('user_profiles');
  const settings = loadSettings();

  const exportObject = {
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
        await tx.objectStore('sessions').put({ ...s, domain: s.domain || 'star' });
      }
    }
    if (data.records) {
      for (const r of data.records) {
        await tx.objectStore('records').put({ ...r, domain: r.domain || 'star' });
      }
    }
    if (data.profiles) {
      for (const p of data.profiles) {
        const domain = p.domain || 'star';
        const key = p.key || `${domain}:${p.mode}`;
        await tx.objectStore('user_profiles').put({ ...p, key, domain });
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

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'records', 'user_profiles'], 'readwrite');
  await tx.objectStore('sessions').clear();
  await tx.objectStore('records').clear();
  await tx.objectStore('user_profiles').clear();
  await tx.done;
}
~~~~~

#### Acts 2: 精简用户配置持久化逻辑

移除 `settings.ts` 中针对旧版平铺结构字段的手动回落映射，统一为安全的深度合并。

~~~~~act
write_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';

export interface BaseModuleSettings {
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity: StepGranularity;
  adaptiveMode: AdaptiveMode;
  targetAccuracy: number;
  blockSize: number;
}

export interface StarSettings extends BaseModuleSettings {
  gridSize: number;
  targetingMode: TargetingMode;
  manualTargetSectors: number[];
}

export interface ColorSenseSettings extends BaseModuleSettings {
  sliderHitMargin: number;
  showToleranceBand: boolean;
  enableHoverColorPreview: boolean;
  targetingMode: TargetingMode;
  manualTargetSectors: number[];
}

export interface RelativeColorSettings extends BaseModuleSettings {
  sliderHitMargin: number;
  showToleranceBand: boolean;
  enableHoverColorPreview: boolean;
}

export interface NegativeSpaceSettings extends BaseModuleSettings {
  sliderHitMargin: number;
  showToleranceBand: boolean;
}

export interface GlobalSettings {
  idleTimeout: number;
  soundEnabled: boolean;
}

export interface UserSettings {
  global: GlobalSettings;
  star: StarSettings;
  color: ColorSenseSettings;
  relative_color: RelativeColorSettings;
  negative_space: NegativeSpaceSettings;
}

const SETTINGS_KEY = 'star_hopping_user_settings';

export const DEFAULT_BASE_SETTINGS: BaseModuleSettings = {
  autoNext: true,
  autoNextDelay: 500,
  stepGranularity: 'standard',
  adaptiveMode: 'block',
  targetAccuracy: 0.8,
  blockSize: 10,
};

export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
  },
  star: {
    ...DEFAULT_BASE_SETTINGS,
    gridSize: 3,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  color: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
    targetingMode: 'off',
    manualTargetSectors: [],
  },
  relative_color: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
    enableHoverColorPreview: true,
  },
  negative_space: {
    ...DEFAULT_BASE_SETTINGS,
    sliderHitMargin: 12,
    showToleranceBand: true,
  },
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;

    return {
      global: { ...DEFAULT_SETTINGS.global, ...(parsed.global || {}) },
      star: { ...DEFAULT_SETTINGS.star, ...(parsed.star || {}) },
      color: { ...DEFAULT_SETTINGS.color, ...(parsed.color || {}) },
      relative_color: { ...DEFAULT_SETTINGS.relative_color, ...(parsed.relative_color || {}) },
      negative_space: { ...DEFAULT_SETTINGS.negative_space, ...(parsed.negative_space || {}) },
    };
  } catch (e) {
    console.error('Failed to load user settings, fallback to default:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
}
~~~~~

#### Acts 3: 元数据驱动首页与主应用状态收敛

重构 `Home.tsx` 动态循环渲染 `DOMAINS_CONFIG`，并在 `app.tsx` 中使用 `Record<TrainingDomain, number>` 收敛状态管理。

~~~~~act
write_file
src/views/Home.tsx
~~~~~
~~~~~typescript
import { ArrowRight, BarChart2, Clock, Sliders, Sparkles } from 'lucide-preact';
import { DOMAINS_CONFIG } from '../config/domains';
import { type TrainingDomain, formatTotalTime } from '../utils/db';

interface HomeProps {
  totalTimeMs: number;
  domainTimes: Record<TrainingDomain, number>;
  onNavigate: (app: 'star-hopping' | 'color-sense' | 'relative-color' | 'negative-space') => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  domainTimes,
  onNavigate,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const domains = Object.values(DOMAINS_CONFIG);

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
        {domains.map((meta) => {
          const Icon = meta.icon;
          const timeMs = domainTimes[meta.domain] || 0;

          return (
            <button
              key={meta.domain}
              type="button"
              onClick={() => onNavigate(meta.appId)}
              className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <Icon className="w-8 h-8" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{meta.homeTitle}</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">{meta.homeDesc}</p>
                </div>
              </div>

              <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>累计练习: {formatTotalTime(timeMs)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>进入练习看板</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/app.tsx
~~~~~
~~~~~typescript
import { useCallback, useEffect, useState } from 'preact/hooks';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { GlobalStatsModal } from './components/GlobalStatsModal';
import { SettingsModal } from './components/SettingsModal';
import { WeaknessAnalyticsModal } from './components/WeaknessAnalyticsModal';
import { GenericDashboard } from './components/dashboard/GenericDashboard';
import { DOMAINS_CONFIG } from './config/domains';
import { TRAINING_PLUGINS } from './config/trainingPlugins';
import {
  type TrainingDomain,
  type UnifiedProfileData,
  getProfilesByDomain,
  getTrainingTimeMs,
} from './utils/db';
import { type UserSettings, loadSettings } from './utils/settings';
import { GenericTrainingView } from './views/GenericTrainingView';
import { Home } from './views/Home';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense' | 'relative-color' | 'negative-space';

const APP_TO_DOMAIN: Record<Exclude<GlobalApp, 'home'>, TrainingDomain> = {
  'star-hopping': 'star',
  'color-sense': 'color',
  'relative-color': 'relative_color',
  'negative-space': 'negative_space',
};

const ALL_DOMAINS: TrainingDomain[] = ['star', 'color', 'relative_color', 'negative_space'];

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');

  const [activeMode, setActiveMode] = useState<string>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isGlobalStatsOpen, setIsGlobalStatsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsDomain, setSettingsDomain] = useState<TrainingDomain>('star');

  const [activeAnalyticsDomain, setActiveAnalyticsDomain] = useState<'star' | 'color' | null>(null);
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });

  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});

  const refreshProfiles = useCallback(async () => {
    const timesEntries = await Promise.all(
      ALL_DOMAINS.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    setDomainTimes(timesMap);
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

  const totalTimeMs = Object.values(domainTimes).reduce((acc, t) => acc + t, 0);
  const currentLevel = currentDomainProfiles[activeMode]?.currentLevel || 5;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentApp === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          domainTimes={domainTimes}
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
                  if (domain === 'star' || domain === 'color') {
                    setActiveAnalyticsDomain(domain);
                  }
                }}
              />
            );
          }

          const plugin = TRAINING_PLUGINS[domain];
          return (
            <GenericTrainingView
              key={`${domain}-${activeMode}-${sessionType}`}
              plugin={plugin}
              mode={activeMode}
              sessionType={sessionType}
              initialLevel={currentLevel}
              settings={settings[domain]}
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

      {activeAnalyticsDomain && (
        <WeaknessAnalyticsModal
          domain={activeAnalyticsDomain}
          onClose={() => setActiveAnalyticsDomain(null)}
        />
      )}
    </div>
  );
}
~~~~~

#### Acts 4: 元数据驱动全局统计筛选器

使用 `DOMAINS_CONFIG` 动态生成过滤列表和匹配算法，消除 `GlobalStatsModal.tsx` 中上百行硬编码与条件分支。

~~~~~act
write_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
import {
  Activity,
  BarChart2,
  Calendar,
  ChevronDown,
  Filter,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { DOMAINS_CONFIG } from '../config/domains';
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import { type TrainingDomain, getTrialRecords } from '../utils/db';

interface GlobalStatsModalProps {
  onClose: () => void;
}

interface UnifiedRecord {
  timestamp: number;
  isHit: boolean;
  level: number;
  module: TrainingDomain;
  subMode: string;
}

const ALL_DOMAINS: TrainingDomain[] = ['star', 'color', 'relative_color', 'negative_space'];

export function GlobalStatsModal({ onClose }: GlobalStatsModalProps) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<UnifiedRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // === 1. 数据加载与聚合 ===
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const results = await Promise.all(
        ALL_DOMAINS.map(async (domain) => {
          const domainRecords = await getTrialRecords(domain);
          return domainRecords.map((r) => ({
            timestamp: r.timestamp,
            isHit: r.isHit,
            level: r.difficultyLevel,
            module: domain,
            subMode: r.mode,
          }));
        }),
      );

      const combined = results.flat().sort((a, b) => a.timestamp - b.timestamp);

      if (isMounted) {
        setRecords(combined);
        setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // === 2. 筛选过滤处理 ===
  const filteredRecords = records.filter((r) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter.endsWith('_all')) {
      const targetDomain = selectedFilter.replace('_all', '');
      return r.module === targetDomain;
    }
    const [domain, mode] = selectedFilter.split(':');
    return r.module === domain && r.subMode === mode;
  });

  // 获取当前筛选标签名
  const getCurrentFilterLabel = () => {
    if (selectedFilter === 'all') return '全部练习项目';
    if (selectedFilter.endsWith('_all')) {
      const d = selectedFilter.replace('_all', '') as TrainingDomain;
      return `${DOMAINS_CONFIG[d]?.title || d} (全部)`;
    }
    const [domain, mode] = selectedFilter.split(':') as [TrainingDomain, string];
    const meta = DOMAINS_CONFIG[domain];
    const modeConfig = meta?.modes.find((m) => m.id === mode);
    return `${meta?.title || domain} • ${modeConfig?.title || mode}`;
  };

  // === 3. 基于筛选结果计算统计指标 ===
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

  const stats = {
    today: { total: 0, hits: 0 },
    week: { total: 0, hits: 0 },
    year: { total: 0, hits: 0 },
    allTime: { total: filteredRecords.length, hits: filteredRecords.filter((r) => r.isHit).length },
  };

  const dailyData: Record<string, { total: number; maxLevel: number }> = {};

  for (const r of filteredRecords) {
    if (r.timestamp >= startOfToday) {
      stats.today.total++;
      if (r.isHit) stats.today.hits++;
    }
    if (r.timestamp >= startOfWeek) {
      stats.week.total++;
      if (r.isHit) stats.week.hits++;
    }
    if (r.timestamp >= startOfYear) {
      stats.year.total++;
      if (r.isHit) stats.year.hits++;
    }

    const dateStr = new Date(r.timestamp).toISOString().slice(0, 10);
    if (!dailyData[dateStr]) {
      dailyData[dateStr] = { total: 0, maxLevel: r.level };
    }
    dailyData[dateStr].total++;
    dailyData[dateStr].maxLevel = Math.max(dailyData[dateStr].maxLevel, r.level);
  }

  const calcAcc = (hits: number, total: number) =>
    total === 0 ? 0 : Math.round((hits / total) * 100);

  // === 4. 热力图数据 (近 84 天) ===
  const heatmapDays = 84;
  const heatmapData = Array.from({ length: heatmapDays }).map((_, i) => {
    const d = new Date(startOfToday - (heatmapDays - 1 - i) * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    return {
      date: dateStr,
      count: dailyData[dateStr]?.total || 0,
    };
  });

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-100';
    if (count < 10) return 'bg-indigo-200';
    if (count < 25) return 'bg-indigo-400';
    if (count < 50) return 'bg-indigo-600';
    return 'bg-indigo-800';
  };

  // === 5. 折线图渲染 ===
  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">全局数据统计</h2>
              <p className="text-xs text-slate-400">洞察你的训练足迹与能力成长</p>
            </div>
          </div>

          {/* 右侧下拉筛选与关闭 */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 text-indigo-500 absolute left-3 pointer-events-none" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter((e.target as HTMLSelectElement).value)}
                className="pl-8 pr-8 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-all shadow-sm"
              >
                <option value="all">全部练习项目</option>
                {Object.values(DOMAINS_CONFIG).map((meta) => (
                  <optgroup key={meta.domain} label={meta.title}>
                    <option value={`${meta.domain}_all`}>{meta.title} (全部)</option>
                    {meta.modes.map((m) => (
                      <option key={`${meta.domain}:${m.id}`} value={`${meta.domain}:${m.id}`}>
                        {m.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            正在统计海量数据...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <Activity className="w-10 h-10 text-slate-300" />【{getCurrentFilterLabel()}
            】下暂无训练数据，先去练习几道题吧！
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* 核心指标卡片群 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  今日刷题
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.today.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-indigo-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.today.hits, stats.today.total)}%
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  最近 7 天
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.week.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.week.hits, stats.week.total)}%
                </div>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  本年累计
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.year.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-amber-600 font-semibold mt-1">
                  正确率 {calcAcc(stats.year.hits, stats.year.total)}%
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                  生涯总计
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.allTime.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  打卡 {Object.keys(dailyData).length} 天
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 热力图 */}
              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-4">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>近 12 周训练热力图</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-normal">
                    少 <div className="w-2.5 h-2.5 rounded-sm bg-slate-100" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-200" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-800" /> 多
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1.5 self-center">
                  {heatmapData.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date} : 训练了 ${day.count} 题`}
                      className={`w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125 cursor-help ${getHeatmapColor(
                        day.count,
                      )}`}
                    />
                  ))}
                </div>
              </div>

              {/* 折线图 */}
              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-2">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>能力峰值演进轨迹</span>
                  <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                    每日最高 Level
                  </span>
                </div>
                <canvas ref={canvasRef} width={340} height={150} className="w-full mt-2" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

#### Acts 5: 复用 `HsvTrackSlider` 并清理 `ColorCanvas.tsx` 内部冗余组件

移除 `ColorCanvas.tsx` 中内部重复定义的 `SingleDimensionSlider`，单维度练习模式直接复用 `HsvTrackSlider` 及其即时提交特性。

~~~~~act
write_file
src/components/ColorCanvas.tsx
~~~~~
~~~~~typescript
import { useEffect, useState } from 'preact/hooks';
import {
  type ColorHitResult,
  type ColorQuestionData,
  hsvToHex,
} from '../utils/colorUtils';
import { HsvTrackSlider } from './HsvTrackSlider';

interface ColorCanvasProps {
  question: ColorQuestionData;
  showAnswer: boolean;
  userAnswer: ColorHitResult | null;
  onAnswer: (userVal: number | [number, number, number]) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
}

export function ColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  enableHoverColorPreview = true,
}: ColorCanvasProps) {
  const { mode, targetH, targetS, targetV, difficultyLevel } = question;
  const targetHex = hsvToHex(targetH, targetS, targetV);
  const targetHSV: [number, number, number] = [targetH, targetS, targetV];

  // ALL 模式下的本地调制状态
  const [userH, setUserH] = useState<number>(180);
  const [userS, setUserS] = useState<number>(50);
  const [userV, setUserV] = useState<number>(50);

  // ALL 模式下悬停与拖拽状态 (控制右侧色块预览)
  const [allHoverVals, setAllHoverVals] = useState<Record<'H' | 'S' | 'V', number | null>>({
    H: null,
    S: null,
    V: null,
  });
  const [draggingLabel, setDraggingLabel] = useState<'H' | 'S' | 'V' | null>(null);

  // 题目切换时重置 ALL 模式状态
  useEffect(() => {
    if (mode === 'ALL') {
      setUserH(180);
      setUserS(50);
      setUserV(50);
      setAllHoverVals({ H: null, S: null, V: null });
      setDraggingLabel(null);
    }
  }, [mode]);

  const handleSubmitAll = () => {
    if (disabled || showAnswer) return;
    onAnswer([userH, userS, userV]);
  };

  // 键盘快捷键响应 (ALL 模式下 Space 显式提交)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && mode === 'ALL' && !showAnswer && !disabled) {
        e.preventDefault();
        onAnswer([userH, userS, userV]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, showAnswer, disabled, userH, userS, userV, onAnswer]);

  // 渐变背景计算
  const currentH = mode === 'ALL' ? userH : targetH;
  const currentV = mode === 'ALL' ? userV : targetV;

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(currentH, 0, currentV)}, ${hsvToHex(currentH, 100, currentV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(currentH, 100, 100)})`;

  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 目标色块 / 综合对比色块 */}
      <div className="flex flex-col items-center gap-2 w-full">
        {mode === 'ALL' ? (
          <div className="flex items-center justify-center gap-4 w-full">
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
              style={{ backgroundColor: targetHex }}
            />
            <div
              className="flex-1 h-28 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-75"
              style={{
                backgroundColor: hsvToHex(
                  draggingLabel === 'H' || (enableHoverColorPreview && allHoverVals.H !== null)
                    ? (allHoverVals.H ?? userH)
                    : userH,
                  draggingLabel === 'S' || (enableHoverColorPreview && allHoverVals.S !== null)
                    ? (allHoverVals.S ?? userS)
                    : userS,
                  draggingLabel === 'V' || (enableHoverColorPreview && allHoverVals.V !== null)
                    ? (allHoverVals.V ?? userV)
                    : userV,
                ),
              }}
            />
          </div>
        ) : (
          <div
            className="w-32 h-32 rounded-2xl shadow-inner border-4 border-white ring-1 ring-slate-200 transition-all duration-300"
            style={{ backgroundColor: targetHex }}
          />
        )}
      </div>

      {/* 轨道面板 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        {mode === 'ALL' ? (
          <>
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={userH}
              max={360}
              unit="°"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetH}
              userVal={userAnswer?.userHSV?.[0] ?? userH}
              isHit={userAnswer?.isHit}
              onValChange={setUserH}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={(hVal) => setAllHoverVals((prev) => ({ ...prev, H: hVal }))}
              onDraggingStateChange={(isDrag) => setDraggingLabel(isDrag ? 'H' : null)}
            />
            <HsvTrackSlider
              label="S"
              gradient={satGradient}
              val={userS}
              max={100}
              unit="%"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetS}
              userVal={userAnswer?.userHSV?.[1] ?? userS}
              isHit={userAnswer?.isHit}
              onValChange={setUserS}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={(hVal) => setAllHoverVals((prev) => ({ ...prev, S: hVal }))}
              onDraggingStateChange={(isDrag) => setDraggingLabel(isDrag ? 'S' : null)}
            />
            <HsvTrackSlider
              label="V"
              gradient={valGradient}
              val={userV}
              max={100}
              unit="%"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetV}
              userVal={userAnswer?.userHSV?.[2] ?? userV}
              isHit={userAnswer?.isHit}
              onValChange={setUserV}
              allUserHSV={[userH, userS, userV]}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
              onHoverStateChange={(hVal) => setAllHoverVals((prev) => ({ ...prev, V: hVal }))}
              onDraggingStateChange={(isDrag) => setDraggingLabel(isDrag ? 'V' : null)}
            />
          </>
        ) : (
          <>
            {/* 单维度模式 H 轨 */}
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={targetH}
              max={360}
              unit="°"
              targetHSV={targetHSV}
              difficultyLevel={difficultyLevel}
              showAnswer={showAnswer}
              targetVal={targetH}
              userVal={userAnswer?.userValue}
              isHit={userAnswer?.isHit}
              onValChange={(v) => {
                if (mode === 'H' && !showAnswer && !disabled) onAnswer(v);
              }}
              disabled={disabled || mode !== 'H'}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand && mode === 'H'}
            />

            {/* 单维度模式 S 轨 */}
            {mode === 'S' && (
              <HsvTrackSlider
                label="S"
                gradient={satGradient}
                val={targetS}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetS}
                userVal={userAnswer?.userValue}
                isHit={userAnswer?.isHit}
                onValChange={(v) => {
                  if (!showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand}
              />
            )}

            {/* 单维度模式 V 轨 */}
            {(mode === 'V' || mode === 'S') && (
              <HsvTrackSlider
                label="V"
                gradient={valGradient}
                val={targetV}
                max={100}
                unit="%"
                targetHSV={targetHSV}
                difficultyLevel={difficultyLevel}
                showAnswer={showAnswer}
                targetVal={targetV}
                userVal={mode === 'V' ? userAnswer?.userValue : targetV}
                isHit={mode === 'V' ? userAnswer?.isHit : undefined}
                onValChange={(v) => {
                  if (mode === 'V' && !showAnswer && !disabled) onAnswer(v);
                }}
                disabled={disabled || mode !== 'V'}
                hitMargin={hitMargin}
                showToleranceBand={showToleranceBand && mode === 'V'}
              />
            )}
          </>
        )}
      </div>

      {/* ALL 模式确认提交按钮 */}
      {mode === 'ALL' && !showAnswer && (
        <button
          type="button"
          onClick={handleSubmitAll}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </div>
  );
}
~~~~~

### 下一步建议
1. **类型检查与测试验证**：运行 `npm run check`（Biome）和 `npm run test`（Vitest）验证本次架构瘦身后的代码一致性与自动化测试用例是否全部通过。
2. **提交 Git 变更**：测试验证无误后，创建 `[COMMIT]` 计划以归档本次架构精简与体积优化成果。

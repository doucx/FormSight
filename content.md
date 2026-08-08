好的，我们现在开始进行 **支线二：主页框架重构**。

我将为你建立全新的 `FormSight` 顶部主页，平滑升级 IndexedDB 数据库结构（为后续色感模块留出独立表），并将数据管理（导入/导出/清空）提升至全局主页设置中，同时为各训练模块增加“返回主页”导航和动态页面 Title 支持。

## [WIP] refactor: 重构应用框架与新增 FormSight 主页

### 用户需求
1. 重构系统为多模块平台架构，新增 FormSight 主页，作为“寻星练习”与“色感练习”的统一入口。
2. 将数据导入/导出、清空等全局数据管理功能平滑迁移至主页全局设置中。
3. 升级 IndexedDB 数据库至 v3，新增色感模块专用的对象存储，确保现有寻星练习数据完全不受影响。
4. 在寻星练习 Dashboard 中增加“返回主页”按钮，并根据当前模块动态更新浏览器标签页 `document.title`。

### 评论
将单一应用拓展为多模块训练平台是极其合理的架构升级。通过统一全局导航、状态管理与数据库升级，不仅改善了 UX，也为接下来干净、无耦合地引入“色感识别训练”奠定了坚实的基础。

### 目标
1. 升级 `db.ts` 中的 `DB_VERSION` 至 `3`，新增 `color_sessions`、`color_records` 和 `color_profiles` 三张表。
2. 创建 `GlobalSettingsModal.tsx`，集中管理数据导入/导出与全局清空逻辑。
3. 创建 `Home.tsx` 视图，提供精致的视觉入口卡片（寻星练习与色感练习）。
4. 修改 `Dashboard.tsx`，添加“返回主页”按钮并收拢局部按钮。
5. 修改 `app.tsx`，实现全局路由 (`home` | `star-hopping` | `color-sense`) 和动态页面标题设置。

### 基本原理
1. **数据库版本迁移策略**：在 IndexedDB 的 `upgrade` 钩子中，仅在 `oldVersion < 3` 时针对新增对象存储做 `createObjectStore` 增量操作，完全不触动旧有的 `sessions`、`records` 和 `user_profiles` 表，实现无损升级。
2. **两层 View 路由架构**：`app.tsx` 掌控最高层级 `currentApp` 路由 (`home` | `star-hopping` | `color-sense`)，各子应用独立掌控内部视图。这样各模块间互不干扰。
3. **动态 Title**：使用 Preact 的 `useEffect` 钩子，根据 `currentApp` 的切换同步更改 `document.title`。

### 标签
#intent/architect #intent/build #intent/refine #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/homepage-and-db-migration #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 升级数据库架构 (IndexedDB v3)

升级 `src/utils/db.ts` 至版本 3，并为“色感练习”定义增量数据类型与 Schema 表。

~~~~~act
patch_file
src/utils/db.ts
~~~~~
~~~~~typescript.old
export interface UserProfileData {
  mode: TrainingMode;
  currentLevel: number; // 当前维持的难度 Level
  bestLevel: number; // 历史最高难度 Level
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

interface StarHoppingDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: SessionData;
  };
  records: {
    key: string;
    value: TrialRecord;
    indexes: {
      'by-session': string;
      'by-mode': string;
    };
  };
  user_profiles: {
    key: TrainingMode;
    value: UserProfileData;
  };
}

const DB_NAME = 'StarHoppingDB';
const DB_VERSION = 2; // 升级版本号以支撑 Level 难度重构

let dbPromise: Promise<IDBPDatabase<StarHoppingDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<StarHoppingDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<StarHoppingDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 2) {
          // 清理旧版本以 px 为单位的数据结构，避免层阶混淆
          if (db.objectStoreNames.contains('sessions')) {
            db.deleteObjectStore('sessions');
          }
          if (db.objectStoreNames.contains('records')) {
            db.deleteObjectStore('records');
          }
          if (db.objectStoreNames.contains('user_profiles')) {
            db.deleteObjectStore('user_profiles');
          }
        }

        // 1. 会话表
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }

        // 2. 试题点击日志表
        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id' });
          recordStore.createIndex('by-session', 'sessionId');
          recordStore.createIndex('by-mode', 'mode');
        }

        // 3. 用户模式能力表
        if (!db.objectStoreNames.contains('user_profiles')) {
          db.createObjectStore('user_profiles', { keyPath: 'mode' });
        }
      },
    });
  }
  return dbPromise;
}
~~~~~
~~~~~typescript.new
export interface UserProfileData {
  mode: TrainingMode;
  currentLevel: number; // 当前维持的难度 Level
  bestLevel: number; // 历史最高难度 Level
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

export interface ColorSessionData {
  id: string;
  mode: 'H' | 'S' | 'V';
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface ColorTrialRecord {
  id: string;
  sessionId: string;
  mode: 'H' | 'S' | 'V';
  timestamp: number;
  difficultyLevel: number;
  targetHSV: [number, number, number];
  userHSV: [number, number, number];
  isHit: boolean;
  errorValue: number;
  responseTimeMs: number;
}

export interface ColorProfileData {
  mode: 'H' | 'S' | 'V';
  currentLevel: number;
  bestLevel: number;
  totalTrainedCards: number;
  totalHits: number;
  updatedAt: number;
}

interface FormSightDBSchema extends DBSchema {
  // === 寻星练习数据表 ===
  sessions: {
    key: string;
    value: SessionData;
  };
  records: {
    key: string;
    value: TrialRecord;
    indexes: {
      'by-session': string;
      'by-mode': string;
    };
  };
  user_profiles: {
    key: TrainingMode;
    value: UserProfileData;
  };

  // === 色感练习数据表 (v3 新增) ===
  color_sessions: {
    key: string;
    value: ColorSessionData;
  };
  color_records: {
    key: string;
    value: ColorTrialRecord;
    indexes: {
      'by-session': string;
      'by-mode': string;
    };
  };
  color_profiles: {
    key: 'H' | 'S' | 'V';
    value: ColorProfileData;
  };
}

const DB_NAME = 'StarHoppingDB';
const DB_VERSION = 3; // v3: 支持色感训练与全局平台

let dbPromise: Promise<IDBPDatabase<FormSightDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<FormSightDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FormSightDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains('sessions')) db.deleteObjectStore('sessions');
          if (db.objectStoreNames.contains('records')) db.deleteObjectStore('records');
          if (db.objectStoreNames.contains('user_profiles')) db.deleteObjectStore('user_profiles');
        }

        // 1. 寻星练习会话表
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }

        // 2. 寻星试题日志表
        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id' });
          recordStore.createIndex('by-session', 'sessionId');
          recordStore.createIndex('by-mode', 'mode');
        }

        // 3. 寻星用户能力表
        if (!db.objectStoreNames.contains('user_profiles')) {
          db.createObjectStore('user_profiles', { keyPath: 'mode' });
        }

        // === v3 新增：色感练习表 ===
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('color_sessions')) {
            db.createObjectStore('color_sessions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('color_records')) {
            const colorRecordStore = db.createObjectStore('color_records', { keyPath: 'id' });
            colorRecordStore.createIndex('by-session', 'sessionId');
            colorRecordStore.createIndex('by-mode', 'mode');
          }
          if (!db.objectStoreNames.contains('color_profiles')) {
            db.createObjectStore('color_profiles', { keyPath: 'mode' });
          }
        }
      },
    });
  }
  return dbPromise;
}
~~~~~

#### Acts 2: 创建全局设置与数据管理弹窗组件

新建 `src/components/GlobalSettingsModal.tsx`，集中管理数据导出、导入与清空功能。

~~~~~act
write_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~tsx
import { Download, Sliders, Trash2, Upload, X } from 'lucide-preact';
import { useRef } from 'preact/hooks';
import { clearAllData, exportAllData, importAllData } from '../utils/db';

interface GlobalSettingsModalProps {
  onClose: () => void;
  onDataChanged: () => void;
}

export function GlobalSettingsModal({ onClose, onDataChanged }: GlobalSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formsight_data_${new Date().toISOString().slice(0, 10)}.json`;
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
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">FormSight 全局设置</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 数据管理 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">数据备份与恢复</div>
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
      </div>
    </div>
  );
}
~~~~~

#### Acts 3: 创建 FormSight 主页视图 (Home.tsx)

新建 `src/views/Home.tsx` 页面，展示系统导航卡片（寻星练习、色感练习）。

~~~~~act
write_file
src/views/Home.tsx
~~~~~
~~~~~tsx
import { ArrowRight, Clock, Compass, Palette, Sliders, Sparkles } from 'lucide-preact';
import { formatTotalTime } from '../utils/db';

interface HomeProps {
  totalTimeMs: number;
  onNavigate: (app: 'star-hopping' | 'color-sense') => void;
  onOpenGlobalSettings: () => void;
}

export function Home({ totalTimeMs, onNavigate, onOpenGlobalSettings }: HomeProps) {
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
              FormSight <span className="text-xs font-extrabold px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">v0.2.0</span>
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
            onClick={onOpenGlobalSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5"
            title="全局设置"
          >
            <Sliders className="w-4 h-4" />
            全局设置
          </button>
        </div>
      </div>

      {/* 模块选择区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 1. 寻星练习 */}
        <div
          onClick={() => onNavigate('star-hopping')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Compass className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                可练习
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">寻星练习 (Star-Hopping)</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">单锚点</span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">水平双锚点</span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">旋转双锚点</span>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
            <span>进入寻星练习看板</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* 2. 色感练习 */}
        <div
          onClick={() => onNavigate('color-sense')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                <Palette className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                色感核心 (HSV)
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">色感训练 (Color Recognition)</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation) 的分级递进识别，全面建立微小色彩差异感知力。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">1-色相 (Hue)</span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">2-明度 (Val)</span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">3-饱和度 (Sat)</span>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
            <span>进入色感练习看板</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 4: 调整 Dashboard 添加“返回主页”导航

修改 `src/views/Dashboard.tsx`，在左上角提供“返回主页”按钮，并将原本多余的导出/导入数据按钮调整归纳。

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript.old
export function Dashboard({
  profiles,
  totalTimeMs,
  onStart,
  onRefreshProfiles,
  onOpenSettings,
  onOpenAnalytics,
}: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `star_hopping_data_${new Date().toISOString().slice(0, 10)}.json`;
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
        onRefreshProfiles();
      } else {
        alert('❌ 导入失败，数据格式不匹配。');
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* 极简 Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            寻星练习 <span className="text-indigo-600 font-light text-xl">Star-Hopping</span>
          </h1>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>{formatTotalTime(totalTimeMs)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAnalytics()}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="弱点分析"
          >
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            弱点分析
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="偏好设置"
          >
            <Sliders className="w-4 h-4" />
            设置
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all"
            title="导出数据"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all"
            title="导入数据"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>
~~~~~
~~~~~typescript.new
interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  totalTimeMs: number;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: (mode?: TrainingMode) => void;
  onBackToHome?: () => void;
}

export function Dashboard({
  profiles,
  totalTimeMs,
  onStart,
  onOpenSettings,
  onOpenAnalytics,
  onBackToHome,
}: DashboardProps) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
            >
              ← 返回主页
            </button>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              寻星练习 <span className="text-indigo-600 font-light text-xl">Star-Hopping</span>
            </h1>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>{formatTotalTime(totalTimeMs)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAnalytics()}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="弱点分析"
          >
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            弱点分析
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="偏好设置"
          >
            <Sliders className="w-4 h-4" />
            偏好设置
          </button>
        </div>
      </div>
~~~~~

#### Acts 5: 修改系统主入口 (app.tsx)

更新 `src/app.tsx` 实现顶级路由、`GlobalSettingsModal` 整合与动态 `document.title` 控制。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
import { useCallback, useEffect, useState } from 'preact/hooks';
import { AnalyticsModal } from './components/AnalyticsModal';
import { SettingsModal } from './components/SettingsModal';
import type { TrainingMode } from './types';
import { type UserProfileData, getAllUserProfiles, getTotalTrainingTimeMs } from './utils/db';
import { type UserSettings, loadSettings } from './utils/settings';
import { Dashboard } from './views/Dashboard';
import { TrainingView } from './views/TrainingView';

export function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const [profiles, setProfiles] = useState<Record<TrainingMode, UserProfileData | null>>({
    single: null,
    double_h: null,
    double_r: null,
  });
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);

  // 刷新用户能力度数与总练习时长
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const timeMs = await getTotalTrainingTimeMs();
    setProfiles(data);
    setTotalTimeMs(timeMs);
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  // 打开弱点分析
  const handleOpenAnalytics = (mode?: TrainingMode) => {
    setAnalyticsMode(mode || 'all');
    setIsAnalyticsOpen(true);
  };

  // 启动训练
  const handleStartTraining = (mode: TrainingMode, type: 'training' | 'benchmark') => {
    setActiveMode(mode);
    setSessionType(type);
    setCurrentView('training');
  };

  // 退出训练返回主页
  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const activeLevel = profiles[activeMode]?.currentLevel || 5;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentView === 'dashboard' ? (
        <Dashboard
          profiles={profiles}
          totalTimeMs={totalTimeMs}
          onStart={handleStartTraining}
          onRefreshProfiles={refreshProfiles}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAnalytics={handleOpenAnalytics}
        />
      ) : (
        <TrainingView
          mode={activeMode}
          sessionType={sessionType}
          initialLevel={activeLevel}
          settings={settings}
          onExit={handleExitTraining}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
          onDataCleared={refreshProfiles}
        />
      )}

      {isAnalyticsOpen && (
        <AnalyticsModal initialMode={analyticsMode} onClose={() => setIsAnalyticsOpen(false)} />
      )}
    </div>
  );
}
~~~~~
~~~~~typescript.new
import { useCallback, useEffect, useState } from 'preact/hooks';
import { AnalyticsModal } from './components/AnalyticsModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { SettingsModal } from './components/SettingsModal';
import type { TrainingMode } from './types';
import { type UserProfileData, getAllUserProfiles, getTotalTrainingTimeMs } from './utils/db';
import { type UserSettings, loadSettings } from './utils/settings';
import { Dashboard } from './views/Dashboard';
import { Home } from './views/Home';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense';

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [analyticsMode, setAnalyticsMode] = useState<TrainingMode | 'all'>('all');
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const [profiles, setProfiles] = useState<Record<TrainingMode, UserProfileData | null>>({
    single: null,
    double_h: null,
    double_r: null,
  });
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);

  // 刷新用户能力度数与总练习时长
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const timeMs = await getTotalTrainingTimeMs();
    setProfiles(data);
    setTotalTimeMs(timeMs);
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  // 动态同步页面标题 Document Title
  useEffect(() => {
    if (currentApp === 'home') {
      document.title = 'FormSight - 造型构图与色彩感知训练系统';
    } else if (currentApp === 'star-hopping') {
      document.title = '寻星练习 (Star-Hopping) - FormSight';
    } else if (currentApp === 'color-sense') {
      document.title = '色感训练 (Color Recognition) - FormSight';
    }
  }, [currentApp]);

  // 打开弱点分析
  const handleOpenAnalytics = (mode?: TrainingMode) => {
    setAnalyticsMode(mode || 'all');
    setIsAnalyticsOpen(true);
  };

  // 启动训练
  const handleStartTraining = (mode: TrainingMode, type: 'training' | 'benchmark') => {
    setActiveMode(mode);
    setSessionType(type);
    setCurrentView('training');
  };

  // 退出训练返回寻星 Dashboard
  const handleExitTraining = () => {
    setCurrentView('dashboard');
    refreshProfiles();
  };

  const activeLevel = profiles[activeMode]?.currentLevel || 5;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentApp === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          onNavigate={(app) => setCurrentApp(app)}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
        />
      )}

      {currentApp === 'star-hopping' &&
        (currentView === 'dashboard' ? (
          <Dashboard
            profiles={profiles}
            totalTimeMs={totalTimeMs}
            onStart={handleStartTraining}
            onRefreshProfiles={refreshProfiles}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAnalytics={handleOpenAnalytics}
            onBackToHome={() => setCurrentApp('home')}
          />
        ) : (
          <TrainingView
            mode={activeMode}
            sessionType={sessionType}
            initialLevel={activeLevel}
            settings={settings}
            onExit={handleExitTraining}
          />
        ))}

      {currentApp === 'color-sense' && (
        <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm flex flex-col items-center gap-6">
          <div className="w-full flex justify-between items-center border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={() => setCurrentApp('home')}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all"
            >
              ← 返回主页
            </button>
            <h1 className="text-xl font-bold text-slate-800">色感训练 (Color Recognition)</h1>
            <div className="w-20" />
          </div>
          <div className="py-16 text-center space-y-3">
            <div className="text-indigo-600 font-black text-2xl">色感模块开发准备中</div>
            <p className="text-slate-400 text-xs">基础架构与数据库已就绪，即将支持 H/S/V 分级算法与滑块识别！</p>
          </div>
        </div>
      )}

      {isGlobalSettingsOpen && (
        <GlobalSettingsModal
          onClose={() => setIsGlobalSettingsOpen(false)}
          onDataChanged={refreshProfiles}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => setSettings(newSettings)}
          onDataCleared={refreshProfiles}
        />
      )}

      {isAnalyticsOpen && (
        <AnalyticsModal initialMode={analyticsMode} onClose={() => setIsAnalyticsOpen(false)} />
      )}
    </div>
  );
}
~~~~~

### 下一步建议
1. **测试框架与数据平滑性**：请在浏览器中验证主页效果、标题切换、备份/清空数据功能，以及从寻星练习返回主页的流畅度。
2. **启动支线一 (色感识别功能开发)**：接下来我们可以开始构建 `colorUtils.ts` (HSV 难度映射与目标色生成) 以及 `ColorDashboard` / `ColorTrainingView` 组件。

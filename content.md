好的，我已经分析了需求。我们将在 IndexedDB 中计算所有历史训练 session 的累积时长，并格式化为 `天-小时-分钟`（例如 `0天0小时15分钟`），然后将该指标展示在 Dashboard 主页顶栏标题“寻星练习 Star-Hopping”的右侧。

## [WIP] feat: 在顶栏新增总练习时长统计展示 (天-小时-分钟)

### 用户需求
在主界面 Header 中“寻星练习”标题右侧添加记录总练习时长的功能，以“天-小时-分钟”为单位进行计量。

### 评论
该功能能够给用户提供清晰的累计练习成就感与直观的数据反馈，增强产品的训练沉浸感和可视化效果。

### 目标
1. 在 `src/utils/db.ts` 中增加计算 IndexedDB 中累积训练总时长 (`getTotalTrainingTimeMs`) 和时间格式化工具函数 (`formatTotalTime`)。
2. 在 `src/app.tsx` 中扩展数据获取逻辑，在刷新 Dashboard 数据时同步加载总练习时长。
3. 在 `src/views/Dashboard.tsx` 顶栏“寻星练习 Star-Hopping”右侧添加高亮 Badge 胶囊组件显示 `X天Y小时Z分钟`。

### 基本原理
我们在后台读取 IndexedDB 中的 `sessions` 列表，统计每个带有 `endTimestamp` 的有效会话时长（`endTimestamp - startTimestamp`）。通过将毫秒数转换为总分钟数，进而按 24小时/天、60分钟/小时 拆解为 `天`、`小时` 和 `分钟` 字符串展现。

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/total-training-time #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 在 `src/utils/db.ts` 中新增总练习时长统计与格式化工具函数

~~~~~act
patch_file
src/utils/db.ts
~~~~~
~~~~~ts.old
// === API 7: 获取历史做答日志（支持按模式筛选） ===
export async function getAllTrialRecords(
  mode?: TrainingMode
): Promise<TrialRecord[]> {
  const db = await getDB();
  if (mode) {
    return await db.getAllFromIndex('records', 'by-mode', mode);
  }
  return await db.getAll('records');
}
~~~~~
~~~~~ts.new
// === API 7: 获取历史做答日志（支持按模式筛选） ===
export async function getAllTrialRecords(
  mode?: TrainingMode
): Promise<TrialRecord[]> {
  const db = await getDB();
  if (mode) {
    return await db.getAllFromIndex('records', 'by-mode', mode);
  }
  return await db.getAll('records');
}

// === API 8: 获取累积练习总时长 (ms) 与格式化辅助 ===
export function formatTotalTime(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}天${hours}小时${minutes}分钟`;
}

export async function getTotalTrainingTimeMs(): Promise<number> {
  const db = await getDB();
  const sessions = await db.getAll('sessions');
  let totalMs = 0;
  for (const s of sessions) {
    if (s.endTimestamp && s.endTimestamp > s.startTimestamp) {
      totalMs += s.endTimestamp - s.startTimestamp;
    }
  }
  return totalMs;
}
~~~~~

#### Acts 2: 更新 `src/views/Dashboard.tsx` 视图显示总练习时长

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~ts.old
import {
  Compass,
  Crosshair,
  RotateCw,
  Download,
  Upload,
  Play,
  Target,
  TrendingUp,
  Award,
  Sliders,
  BarChart2,
} from 'lucide-preact';
import { TrainingMode } from '../types';
import { UserProfileData, exportAllData, importAllData } from '../utils/db';

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: (mode?: TrainingMode) => void;
}
~~~~~
~~~~~ts.new
import {
  Compass,
  Crosshair,
  RotateCw,
  Download,
  Upload,
  Play,
  Target,
  TrendingUp,
  Award,
  Sliders,
  BarChart2,
  Clock,
} from 'lucide-preact';
import { TrainingMode } from '../types';
import { UserProfileData, exportAllData, importAllData, formatTotalTime } from '../utils/db';

interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  totalTimeMs: number;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: (mode?: TrainingMode) => void;
}
~~~~~

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~ts.old
export function Dashboard({
  profiles,
  onStart,
  onRefreshProfiles,
  onOpenSettings,
  onOpenAnalytics,
}: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
~~~~~
~~~~~ts.new
export function Dashboard({
  profiles,
  totalTimeMs,
  onStart,
  onRefreshProfiles,
  onOpenSettings,
  onOpenAnalytics,
}: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
~~~~~

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~ts.old
      {/* 极简 Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          寻星练习 <span className="text-indigo-600 font-light text-xl">Star-Hopping</span>
        </h1>

        <div className="flex items-center gap-2">
~~~~~
~~~~~ts.new
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
~~~~~

#### Acts 3: 在 `src/app.tsx` 中关联总时长状态并传递给 Dashboard

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~ts.old
import { getAllUserProfiles, UserProfileData } from './utils/db';
import { UserSettings, loadSettings } from './utils/settings';

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

  // 刷新用户能力度数
  const refreshProfiles = async () => {
    const data = await getAllUserProfiles();
    setProfiles(data);
  };
~~~~~
~~~~~ts.new
import { getAllUserProfiles, getTotalTrainingTimeMs, UserProfileData } from './utils/db';
import { UserSettings, loadSettings } from './utils/settings';

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
  const refreshProfiles = async () => {
    const data = await getAllUserProfiles();
    const timeMs = await getTotalTrainingTimeMs();
    setProfiles(data);
    setTotalTimeMs(timeMs);
  };
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~ts.old
      {currentView === 'dashboard' ? (
        <Dashboard
          profiles={profiles}
          onStart={handleStartTraining}
          onRefreshProfiles={refreshProfiles}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAnalytics={handleOpenAnalytics}
        />
      ) : (
~~~~~
~~~~~ts.new
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
~~~~~

### 下一步建议
1. 建议在开发环境中运行 `npm run dev` 验证 Dashboard 顶栏是否已成功渲染总时长 Badge。
2. 可进一步在设置或弱点分析中增加按月/周/各模式拆分精细化统计时长的图表展示。

好的！我已经将时间统计逻辑进行了独立解耦：

1. **主页 (`Home.tsx`)**：展示全系统的**总练习时间**（寻星练习时间 + 色感训练时间之和）。
2. **寻星练习 (`Dashboard.tsx`)**：仅计算并展示**寻星练习**累积的时长。
3. **色感训练 (`ColorDashboard.tsx`)**：仅计算并展示**色感训练**累积的时长。

## [WIP] refactor(stats): 独立分离寻星与色感训练时长统计

### 用户需求
分离寻星与色感的训练时长，各模块 Dashboard 仅显示本模块时长的累积，FormSight 主页显示全局总时长。

### 评论
模块间数据统计的分离让用户的能力反馈更精确，不相互干扰，符合多模块训练平台的统一设计原则。

### 目标
1. 修改 `src/utils/db.ts`：提供 `getStarHoppingTotalTimeMs()` 与 `getColorTotalTimeMs()` 方法，并让 `getTotalTrainingTimeMs()` 返回两者的总和。
2. 修改 `src/app.tsx`：分别拉取两个模块的时长状态并分发传递给相应的视图组件。

### 基本原理
* 从 `sessions` 表计算寻星练习总时长，从 `color_sessions` 表计算色感练习总时长。
* 主页接收两者相加的 `totalTimeMs`，各模块 Dashboard 接收各自的专用时长变量。

### 标签
#intent/refine #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/separate-training-time-stats #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 在 db.ts 中拆分模块时长统计 API

更新 `src/utils/db.ts`。

~~~~~act
patch_file
src/utils/db.ts
~~~~~
~~~~~typescript.old
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
~~~~~typescript.new
export async function getStarHoppingTotalTimeMs(): Promise<number> {
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

export async function getColorTotalTimeMs(): Promise<number> {
  const db = await getDB();
  const sessions = await db.getAll('color_sessions');
  let totalMs = 0;
  for (const s of sessions) {
    if (s.endTimestamp && s.endTimestamp > s.startTimestamp) {
      totalMs += s.endTimestamp - s.startTimestamp;
    }
  }
  return totalMs;
}

export async function getTotalTrainingTimeMs(): Promise<number> {
  const starMs = await getStarHoppingTotalTimeMs();
  const colorMs = await getColorTotalTimeMs();
  return starMs + colorMs;
}
~~~~~

#### Acts 2: 在 app.tsx 中分别分发模块专属时长

更新 `src/app.tsx`。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
import {
  type ColorProfileData,
  type UserProfileData,
  getAllColorProfiles,
  getAllUserProfiles,
  getTotalTrainingTimeMs,
} from './utils/db';
import { type UserSettings, loadSettings } from './utils/settings';
import { ColorDashboard } from './views/ColorDashboard';
import { ColorTrainingView } from './views/ColorTrainingView';
import { Dashboard } from './views/Dashboard';
import { Home } from './views/Home';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense';

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');

  // 寻星状态
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  // 色感状态
  const [activeColorMode, setActiveColorMode] = useState<ColorMode>('H');
  const [colorSessionType, setColorSessionType] = useState<'training' | 'benchmark'>('training');

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
  const [colorProfiles, setColorProfiles] = useState<Record<ColorMode, ColorProfileData | null>>({
    H: null,
    S: null,
    V: null,
  });
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);

  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const timeMs = await getTotalTrainingTimeMs();
    setProfiles(data);
    setColorProfiles(cData);
    setTotalTimeMs(timeMs);
  }, []);
~~~~~
~~~~~typescript.new
import {
  type ColorProfileData,
  type UserProfileData,
  getAllColorProfiles,
  getAllUserProfiles,
  getColorTotalTimeMs,
  getStarHoppingTotalTimeMs,
} from './utils/db';
import { type UserSettings, loadSettings } from './utils/settings';
import { ColorDashboard } from './views/ColorDashboard';
import { ColorTrainingView } from './views/ColorTrainingView';
import { Dashboard } from './views/Dashboard';
import { Home } from './views/Home';
import { TrainingView } from './views/TrainingView';

type GlobalApp = 'home' | 'star-hopping' | 'color-sense';

export function App() {
  const [currentApp, setCurrentApp] = useState<GlobalApp>('home');
  const [currentView, setCurrentView] = useState<'dashboard' | 'training'>('dashboard');

  // 寻星状态
  const [activeMode, setActiveMode] = useState<TrainingMode>('single');
  const [sessionType, setSessionType] = useState<'training' | 'benchmark'>('training');

  // 色感状态
  const [activeColorMode, setActiveColorMode] = useState<ColorMode>('H');
  const [colorSessionType, setColorSessionType] = useState<'training' | 'benchmark'>('training');

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
  const [colorProfiles, setColorProfiles] = useState<Record<ColorMode, ColorProfileData | null>>({
    H: null,
    S: null,
    V: null,
  });
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);
  const [starHoppingTimeMs, setStarHoppingTimeMs] = useState<number>(0);
  const [colorTimeMs, setColorTimeMs] = useState<number>(0);

  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const starMs = await getStarHoppingTotalTimeMs();
    const colorMs = await getColorTotalTimeMs();

    setProfiles(data);
    setColorProfiles(cData);
    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
    setTotalTimeMs(starMs + colorMs);
  }, []);
>>>>~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
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

      {currentApp === 'color-sense' &&
        (currentView === 'dashboard' ? (
          <ColorDashboard
            profiles={colorProfiles}
            totalTimeMs={totalTimeMs}
            onStart={handleStartColorTraining}
            onBackToHome={() => setCurrentApp('home')}
          />
        ) : (
          <ColorTrainingView
            mode={activeColorMode}
            sessionType={colorSessionType}
            initialLevel={activeColorLevel}
            settings={settings}
            onExit={handleExitTraining}
          />
        ))}
~~~~~
~~~~~typescript.new
      {currentApp === 'star-hopping' &&
        (currentView === 'dashboard' ? (
          <Dashboard
            profiles={profiles}
            totalTimeMs={starHoppingTimeMs}
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

      {currentApp === 'color-sense' &&
        (currentView === 'dashboard' ? (
          <ColorDashboard
            profiles={colorProfiles}
            totalTimeMs={colorTimeMs}
            onStart={handleStartColorTraining}
            onBackToHome={() => setCurrentApp('home')}
          />
        ) : (
          <ColorTrainingView
            mode={activeColorMode}
            sessionType={colorSessionType}
            initialLevel={activeColorLevel}
            settings={settings}
            onExit={handleExitTraining}
          />
        ))}
~~~~~

### 下一步建议
1. 现在寻星练习与色感训练各自拥有干净的时长统计，且主页会自动显示全局合并训练时长。
2. 试着在两个模块下分别练习几题，验证各自的计时器和累积时长是否准确隔离。

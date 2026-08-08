好的，我将按需求重构时间统计逻辑与界面展示：

1. 在数据库工具层区分“寻星练习”与“色感训练”的独立时长统计，并将两者的累加值作为总练习时长。
2. 隐藏 `Dashboard`（寻星练习看板）与 `ColorDashboard`（色感训练看板）顶部的计时组件。
3. 在 `Home` 主页顶栏显示全站总时长，并在寻星练习卡片和色感训练卡片上分别展示对应的模块累计时长。

下面是详细的调整计划与代码指令。

## [WIP] refactor(ui): 调整训练时长显示位置至主页与模块卡片

### 用户需求
将色感识别和寻星练习视图内的顶部时间统计隐藏，移至主页统一显示：主页顶端展示总时长，两个模块卡片分别显示各自的累计练习时间。

### 评论
将时间维度整合到主页并分模块展示，能够让用户在选择训练模块时一目了然地了解自己在各维度的投入与偏好，同时减少训练看板内的视觉噪点，使得子页面更加专注。

### 目标
1. 扩展 `src/utils/db.ts`，增加寻星练习时长 (`getStarHoppingTrainingTimeMs`) 与色感训练时长 (`getColorTrainingTimeMs`) 的独立计算函数，并更新 `getTotalTrainingTimeMs` 为两者之和。
2. 更新 `src/app.tsx` 状态管理，获取并传递分模块时长数据。
3. 在 `src/views/Home.tsx` 顶栏保留总时间，并在两个练习模块卡片内增加各自模块的时长展示。
4. 移除 `src/views/Dashboard.tsx` 和 `src/views/ColorDashboard.tsx` 顶栏的时间徽章。

### 基本原理
1. 寻星练习与色感训练分别使用 IndexedDB 中的 `sessions` 与 `color_sessions` 对象仓库记录会话。通过独立查询两个仓库并累加起止时间差，可精确获得各模块的时长。
2. 修改各 View 组件的 Props 接口与 JSX 布局，保持 UI 风格一致。

### 标签
#intent/refine #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/training-time-display #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 扩展数据库时长统计函数 (`src/utils/db.ts`)

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
export async function getStarHoppingTrainingTimeMs(): Promise<number> {
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

export async function getColorTrainingTimeMs(): Promise<number> {
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
  const starMs = await getStarHoppingTrainingTimeMs();
  const colorMs = await getColorTrainingTimeMs();
  return starMs + colorMs;
}
~~~~~

#### Acts 2: 更新主页组件 (`src/views/Home.tsx`) 展示分模块时长

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
interface HomeProps {
  totalTimeMs: number;
  onNavigate: (app: 'star-hopping' | 'color-sense') => void;
  onOpenGlobalSettings: () => void;
}

export function Home({ totalTimeMs, onNavigate, onOpenGlobalSettings }: HomeProps) {
~~~~~
~~~~~typescript.new
interface HomeProps {
  totalTimeMs: number;
  starHoppingTimeMs: number;
  colorTimeMs: number;
  onNavigate: (app: 'star-hopping' | 'color-sense') => void;
  onOpenGlobalSettings: () => void;
}

export function Home({
  totalTimeMs,
  starHoppingTimeMs,
  colorTimeMs,
  onNavigate,
  onOpenGlobalSettings,
}: HomeProps) {
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                单锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                水平双锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                旋转双锚点
              </span>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
            <span>进入寻星练习看板</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>

        {/* 2. 色感练习 */}
        <button
          type="button"
          onClick={() => onNavigate('color-sense')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
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
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                色感训练 (Color Recognition)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation)
                的分级递进识别，全面建立微小色彩差异感知力。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                1-色相 (Hue)
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                2-明度 (Val)
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                3-饱和度 (Sat)
              </span>
            </div>
          </div>
~~~~~
~~~~~typescript.new
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                单锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                水平双锚点
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                旋转双锚点
              </span>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>累计练习: {formatTotalTime(starHoppingTimeMs)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>进入寻星练习看板</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* 2. 色感练习 */}
        <button
          type="button"
          onClick={() => onNavigate('color-sense')}
          className="group cursor-pointer bg-white border border-slate-200/80 hover:border-indigo-400 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
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
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                色感训练 (Color Recognition)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation)
                的分级递进识别，全面建立微小色彩差异感知力。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                1-色相 (Hue)
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                2-明度 (Val)
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                3-饱和度 (Sat)
              </span>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform border-t border-slate-100 mt-4">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>累计练习: {formatTotalTime(colorTimeMs)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>进入色感练习看板</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
~~~~~

#### Acts 3: 从 `Dashboard.tsx` 顶栏隐藏时间统计

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript.old
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
~~~~~
~~~~~typescript.new
interface DashboardProps {
  profiles: Record<TrainingMode, UserProfileData | null>;
  onStart: (mode: TrainingMode, type: 'training' | 'benchmark') => void;
  onRefreshProfiles: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics: (mode?: TrainingMode) => void;
  onBackToHome?: () => void;
}

export function Dashboard({
  profiles,
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
          </div>
        </div>
~~~~~

#### Acts 4: 从 `ColorDashboard.tsx` 顶栏隐藏时间统计

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  totalTimeMs: number;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
}
~~~~~
~~~~~typescript.new
interface ColorDashboardProps {
  profiles: Record<ColorMode, ColorProfileData | null>;
  onStart: (mode: ColorMode, type: 'training' | 'benchmark') => void;
  onBackToHome: () => void;
}
~~~~~

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
export function ColorDashboard({
  profiles,
  totalTimeMs,
  onStart,
  onBackToHome,
}: ColorDashboardProps) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToHome}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
          >
            ← 返回主页
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              色感训练 <span className="text-indigo-600 font-light text-xl">Color Recognition</span>
            </h1>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>{formatTotalTime(totalTimeMs)}</span>
            </div>
          </div>
        </div>
      </div>
~~~~~
~~~~~typescript.new
export function ColorDashboard({
  profiles,
  onStart,
  onBackToHome,
}: ColorDashboardProps) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-6 py-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToHome}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
          >
            ← 返回主页
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              色感训练 <span className="text-indigo-600 font-light text-xl">Color Recognition</span>
            </h1>
          </div>
        </div>
      </div>
~~~~~

#### Acts 5: 在 `app.tsx` 中导入新数据库接口并绑定状态数据

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
~~~~~
~~~~~typescript.new
import {
  type ColorProfileData,
  type UserProfileData,
  getAllColorProfiles,
  getAllUserProfiles,
  getColorTrainingTimeMs,
  getStarHoppingTrainingTimeMs,
} from './utils/db';
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
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
  const [colorProfiles, setColorProfiles] = useState<Record<ColorMode, ColorProfileData | null>>({
    H: null,
    S: null,
    V: null,
  });
  const [starHoppingTimeMs, setStarHoppingTimeMs] = useState<number>(0);
  const [colorTimeMs, setColorTimeMs] = useState<number>(0);

  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    setProfiles(data);
    setColorProfiles(cData);
    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
  }, []);
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
      {currentApp === 'home' && (
        <Home
          totalTimeMs={totalTimeMs}
          onNavigate={(app) => {
            setCurrentApp(app);
            setCurrentView('dashboard');
          }}
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
      {currentApp === 'home' && (
        <Home
          totalTimeMs={starHoppingTimeMs + colorTimeMs}
          starHoppingTimeMs={starHoppingTimeMs}
          colorTimeMs={colorTimeMs}
          onNavigate={(app) => {
            setCurrentApp(app);
            setCurrentView('dashboard');
          }}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
        />
      )}

      {currentApp === 'star-hopping' &&
        (currentView === 'dashboard' ? (
          <Dashboard
            profiles={profiles}
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
1. 启动项目开发服务 (`npm run dev`) 验证页面改动：检查主页顶部是否正确显示总用时，以及卡片底部是否显示分模块练习时长。
2. 确认在进入“寻星练习看板”和“色感训练看板”时，顶栏的用时徽章已被隐藏，视图更加整洁。

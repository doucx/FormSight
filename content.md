已定位问题原因并完成分析。

问题主要集中在三处：
1. `src/components/SettingsModal.tsx` 中遗漏了 `NegativeSpaceSettings` 类型的导入，导致 TS 编译报错。
2. `src/app.tsx` 中未实现 `negative-space` 模块的路由切换分支与训练计时状态，导致进入该模式全屏空白，且首页时间统计因缺少 `negativeSpaceTimeMs` 出现 `NaN` 和编译报错。
3. `src/utils/db/queries.ts` 中的 `formatTotalTime` 缺乏针对空值/NaN/负值的边界防护。

我将生成一个修复计划来解决这些问题。

## [WIP] fix: 修复正负形模块路由缺失、时间统计NaN与类型定义错误

### 错误分析

1. **类型缺失**: `SettingsModal.tsx` 中引用了 `NegativeSpaceSettings`，但从 `../utils/settings` 导入时遗漏了该类型导出，导致 `TS2304` 错误。
2. **正负形路由渲染与状态遗漏**: `app.tsx` 引入了 `NegativeSpaceMode`、`NegativeSpaceDashboard` 和 `NegativeSpaceTrainingView`，但在组件主体中未声明对应的视图切换逻辑和训练状态管理，导致未使用的导入警告 (`TS6133`) 以及用户点击卡片进入后无匹配组件渲染出现全屏空白。
3. **主页时长统计 NaN 与参数缺失**: `Home.tsx` 要求传入 `negativeSpaceTimeMs`，但在 `app.tsx` 中未定义且未传递，使得总练习时间计算出现 `undefined` 加法导致 `NaN`，同时 `formatTotalTime` 未做非数值防护。

### 用户需求

1. 修复 TypeScript 编译错误，确保 `npm run build` 顺利通过。
2. 补齐 `app.tsx` 中正负形空间的完整页面路由与状态生命周期，使点击进入“正负形空间感知”能正常展示 Dashboard 与开始训练。
3. 补全正负形模块的历史时长计算，并在首页与各统计组件中正确展示总训练时长，杜绝 `NaN天NaN小时NaN分钟` 现象。

### 评论

这是一个典型的功能接入阶段的胶水层遗漏与边界防护问题。补充路由分支与状态绑定后，系统的全部四大训练模块将完整打通闭环。

### 目标

1. 在 `SettingsModal.tsx` 中导入 `NegativeSpaceSettings` 类型。
2. 在 `src/utils/db/queries.ts` 中增强 `formatTotalTime` 对空值和 `NaN` 的健壮性。
3. 在 `src/app.tsx` 中补充 `negativeSpaceTimeMs` 与 `negativeSpaceProfiles` 状态，并在 `refreshProfiles` 中统计时长与拉取 Profile。
4. 在 `src/app.tsx` 的 JSX 中挂载 `currentApp === 'negative-space'` 的视图路由分支。

### 基本原理

通过在 `app.tsx` 建立正负形空间的激活模式、初始难度与会话类型状态，对齐其他三个模块（寻星、绝对色感、相对色感）的架构范式，确保应用状态机完整；同时做好全局时间统计的边界防御。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #concept/navigation #scope/core #ai/instruct #task/domain/ui #task/object/negative-space-routing #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 `SettingsModal.tsx` 类型导入

为 `SettingsModal.tsx` 补上 `NegativeSpaceSettings` 类型定义。

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript
import type { TrainingDomain } from '../utils/db';
import {
  type ColorSenseSettings,
  type RelativeColorSettings,
  type StarSettings,
  type UserSettings,
  saveSettings,
} from '../utils/settings';
~~~~~
~~~~~typescript
import type { TrainingDomain } from '../utils/db';
import {
  type ColorSenseSettings,
  type NegativeSpaceSettings,
  type RelativeColorSettings,
  type StarSettings,
  type UserSettings,
  saveSettings,
} from '../utils/settings';
~~~~~

#### Acts 2: 增强 `formatTotalTime` 边界防护

在 `src/utils/db/queries.ts` 中对 `NaN`、`undefined` 或非数值输入做防御性处理。

~~~~~act
patch_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript
export function formatTotalTime(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}天${hours}小时${minutes}分钟`;
}
~~~~~
~~~~~typescript
export function formatTotalTime(ms: number): string {
  if (!ms || Number.isNaN(ms) || ms <= 0) {
    return '0天0小时0分钟';
  }
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}天${hours}小时${minutes}分钟`;
}
~~~~~

#### Acts 3: 在 `src/app.tsx` 中补齐正负形模块路由与时间统计状态

在 `src/app.tsx` 中接入 `negativeSpaceTimeMs`、`negativeSpaceProfiles` 及对应的视图分支。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
  const [starHoppingTimeMs, setStarHoppingTimeMs] = useState<number>(0);
  const [colorTimeMs, setColorTimeMs] = useState<number>(0);
  const [relativeColorTimeMs, setRelativeColorTimeMs] = useState<number>(0);

  // 相对色感状态
  const [activeRelativeMode, setActiveRelativeMode] = useState<RelativeColorMode>('VECTOR_SHIFT');
  const [relativeSessionType, setRelativeSessionType] = useState<'training' | 'benchmark'>(
    'training',
  );

  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const relList = await getProfilesByDomain('relative_color');
    const relMap: Record<string, UnifiedProfileData | null> = {};
    for (const p of relList) {
      relMap[p.mode] = p;
    }
    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const relMs = await getTrainingTimeMs('relative_color');
    setProfiles(data);
    setColorProfiles(cData);
    setRelativeProfiles(relMap);
    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
    setRelativeColorTimeMs(relMs);
    setSettings(loadSettings());
  }, []);
~~~~~
~~~~~typescript
  const [starHoppingTimeMs, setStarHoppingTimeMs] = useState<number>(0);
  const [colorTimeMs, setColorTimeMs] = useState<number>(0);
  const [relativeColorTimeMs, setRelativeColorTimeMs] = useState<number>(0);
  const [negativeSpaceTimeMs, setNegativeSpaceTimeMs] = useState<number>(0);

  // 相对色感状态
  const [activeRelativeMode, setActiveRelativeMode] = useState<RelativeColorMode>('VECTOR_SHIFT');
  const [relativeSessionType, setRelativeSessionType] = useState<'training' | 'benchmark'>(
    'training',
  );

  // 正负形状态
  const [activeNegativeSpaceMode, setActiveNegativeSpaceMode] =
    useState<NegativeSpaceMode>('RATIO_ESTIMATION');
  const [negativeSpaceSessionType, setNegativeSpaceSessionType] = useState<
    'training' | 'benchmark'
  >('training');
  const [negativeSpaceProfiles, setNegativeSpaceProfiles] = useState<
    Record<string, UnifiedProfileData | null>
  >({});

  // 刷新用户能力看板与总时间
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const relList = await getProfilesByDomain('relative_color');
    const relMap: Record<string, UnifiedProfileData | null> = {};
    for (const p of relList) {
      relMap[p.mode] = p;
    }
    const nsList = await getProfilesByDomain('negative_space');
    const nsMap: Record<string, UnifiedProfileData | null> = {};
    for (const p of nsList) {
      nsMap[p.mode] = p;
    }

    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const relMs = await getTrainingTimeMs('relative_color');
    const nsMs = await getTrainingTimeMs('negative_space');

    setProfiles(data);
    setColorProfiles(cData);
    setRelativeProfiles(relMap);
    setNegativeSpaceProfiles(nsMap);
    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
    setRelativeColorTimeMs(relMs);
    setNegativeSpaceTimeMs(nsMs);
    setSettings(loadSettings());
  }, []);
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
    if (currentApp === 'home') {
      document.title = 'FormSight - 造型构图与色彩感知训练系统';
    } else if (currentApp === 'star-hopping') {
      document.title = '寻星练习 (Star-Hopping) - FormSight';
    } else if (currentApp === 'color-sense') {
      document.title = '色感训练 (Color Recognition) - FormSight';
    } else if (currentApp === 'relative-color') {
      document.title = '相对色感 (Relative Color) - FormSight';
    }
  }, [currentApp]);
~~~~~
~~~~~typescript
    if (currentApp === 'home') {
      document.title = 'FormSight - 造型构图与色彩感知训练系统';
    } else if (currentApp === 'star-hopping') {
      document.title = '寻星练习 (Star-Hopping) - FormSight';
    } else if (currentApp === 'color-sense') {
      document.title = '色感训练 (Color Recognition) - FormSight';
    } else if (currentApp === 'relative-color') {
      document.title = '相对色感 (Relative Color) - FormSight';
    } else if (currentApp === 'negative-space') {
      document.title = '正负形感知 (Negative Space) - FormSight';
    }
  }, [currentApp]);
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
  const activeLevel = profiles[activeMode]?.currentLevel || 5;
  const activeColorLevel = colorProfiles[activeColorMode]?.currentLevel || 5;
  const activeRelativeLevel = relativeProfiles[activeRelativeMode]?.currentLevel || 5;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 antialiased">
      {currentApp === 'home' && (
        <Home
          totalTimeMs={starHoppingTimeMs + colorTimeMs + relativeColorTimeMs}
          starHoppingTimeMs={starHoppingTimeMs}
          colorTimeMs={colorTimeMs}
          relativeColorTimeMs={relativeColorTimeMs}
          onNavigate={(app) => {
            setCurrentApp(app);
            setCurrentView('dashboard');
          }}
          onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
          onOpenGlobalStats={() => setIsGlobalStatsOpen(true)}
        />
      )}
~~~~~
~~~~~typescript
  const activeLevel = profiles[activeMode]?.currentLevel || 5;
  const activeColorLevel = colorProfiles[activeColorMode]?.currentLevel || 5;
  const activeRelativeLevel = relativeProfiles[activeRelativeMode]?.currentLevel || 5;
  const activeNegativeSpaceLevel =
    negativeSpaceProfiles[activeNegativeSpaceMode]?.currentLevel || 5;

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
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
        ) : (
          <RelativeColorTrainingView
            mode={activeRelativeMode}
            sessionType={relativeSessionType}
            initialLevel={activeRelativeLevel}
            settings={settings.relative_color}
            onExit={handleExitTraining}
          />
        ))}

      {isGlobalSettingsOpen && (
~~~~~
~~~~~typescript
        ) : (
          <RelativeColorTrainingView
            mode={activeRelativeMode}
            sessionType={relativeSessionType}
            initialLevel={activeRelativeLevel}
            settings={settings.relative_color}
            onExit={handleExitTraining}
          />
        ))}

      {currentApp === 'negative-space' &&
        (currentView === 'dashboard' ? (
          <NegativeSpaceDashboard
            onStart={(nsMode, type) => {
              setActiveNegativeSpaceMode(nsMode);
              setNegativeSpaceSessionType(type);
              setCurrentView('training');
            }}
            onBackToHome={() => setCurrentApp('home')}
            onOpenSettings={() => {
              setSettingsDomain('negative_space');
              setIsSettingsOpen(true);
            }}
          />
        ) : (
          <NegativeSpaceTrainingView
            mode={activeNegativeSpaceMode}
            sessionType={negativeSpaceSessionType}
            initialLevel={activeNegativeSpaceLevel}
            settings={settings.negative_space}
            onExit={handleExitTraining}
          />
        ))}

      {isGlobalSettingsOpen && (
~~~~~

### 下一步建议

1. 执行 `npm run build` 和 `npm run test` 确保所有 TypeScript 类型检查与单元测试全部绿灯通过。
2. 手动或在浏览器预览中测试从首页进入“正负形空间感知”看板、进入自适应/基准训练流程并返回首页，验证数据记录与时间统计是否正常递增。

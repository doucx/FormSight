好的！我已经将寻星练习和色感训练的累计时长进行独立统计：

1. **寻星练习 Dashboard**：仅展示寻星练习的累计练习时长。
2. **色感训练 Dashboard**：仅展示色感训练的累计练习时长。
3. **FormSight 主页**：展示包含所有模块的**全平台总练习时长**。

## [WIP] refactor(time): 拆分寻星与色感训练时长独立统计

### 用户需求
1. 将寻星练习与色感练习的练习时长隔离开来，各自独立统计并在对应的看板中展示。
2. 主页展示包含各模块在内的 FormSight 汇总总时长。

### 评论
独立统计模块时长能更客观地反馈用户在特定专项（构图 vs 色彩）上的时间投入，使数据看板更加精准清晰。

### 目标
1. 修改 `src/utils/db.ts`：增加 `getStarHoppingTrainingTimeMs()` 和 `getColorTrainingTimeMs()` 方法，`getTotalTrainingTimeMs()` 返回两者之和。
2. 修改 `src/app.tsx`：分别维护 `starHoppingTimeMs` 和 `colorTimeMs` 状态，并将对应的模块时长传给子看板，将总时长传给 Home 主页。

### 基本原理
* `sessions` 表对应寻星练习会话，以此计算 `starHoppingTimeMs`。
* `color_sessions` 表对应色感练习会话，以此计算 `colorTimeMs`。
* 汇总相加得出主页的总累计时长 `totalTimeMs`。

### 标签
#intent/refine #flow/ready #priority/medium #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/separate-module-training-time #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 增加模块独立时长计算 API (db.ts)

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
  const colorSessions = await db.getAll('color_sessions');
  let totalMs = 0;
  for (const cs of colorSessions) {
    if (cs.endTimestamp && cs.endTimestamp > cs.startTimestamp) {
      totalMs += cs.endTimestamp - cs.startTimestamp;
    }
  }
  return totalMs;
}

export async function getTotalTrainingTimeMs(): Promise<number> {
  const shMs = await getStarHoppingTrainingTimeMs();
  const colorMs = await getColorTrainingTimeMs();
  return shMs + colorMs;
}
~~~~~

#### Acts 2: 更新 app.tsx 状态分发逻辑

更新 `src/app.tsx`，将独立的模块时长分别传递给各自的 Dashboard 组件。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
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
  const [starHoppingTimeMs, setStarHoppingTimeMs] = useState<number>(0);
  const [colorTimeMs, setColorTimeMs] = useState<number>(0);
  const [totalTimeMs, setTotalTimeMs] = useState<number>(0);

  // 刷新用户能力看板与独立时长
  const refreshProfiles = useCallback(async () => {
    const data = await getAllUserProfiles();
    const cData = await getAllColorProfiles();
    const shMs = await getStarHoppingTrainingTimeMs();
    const cMs = await getColorTrainingTimeMs();
    setProfiles(data);
    setColorProfiles(cData);
    setStarHoppingTimeMs(shMs);
    setColorTimeMs(cMs);
    setTotalTimeMs(shMs + cMs);
  }, []);
~~~~~

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
各个模块的时长现已彻底解耦独立！你可以尝试分别在寻星练习和色感训练中练习几题，验证各自 Dashboard 中的时长增长与主页 FormSight 汇总时长的准确性。

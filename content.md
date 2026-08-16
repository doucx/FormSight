好的，我将生成修复计划，补全 `src/app.tsx` 中相对色感的 Profile 状态管理与实时等级读取逻辑。

## [WIP] fix: 修复相对色感模式下重新开始训练时难度等级重置为 5 的问题

### 错误分析

在相对色感（Relative Color）模式下，每次从看板重新进入训练时，能力难度等级（Level）总是重置为默认值 `5`。

1. **错误定位**：`src/app.tsx` 中将 `<RelativeColorTrainingView />` 的 `initialLevel` 属性硬编码为了数字 `5`。
2. **状态缺失**：`src/app.tsx` 声明了 `profiles`（寻星）和 `colorProfiles`（绝对色感）的状态，但缺乏对 `relative_color` 域名的 Profile 状态（`relativeProfiles`）的持久化读取与维护。
3. **对比**：`RelativeColorDashboard.tsx` 会直接从 IndexedDB 获取完整 Profile 并正确显示（如 Level 8），但点击“开始自适应训练”后，`App.tsx` 传递给训练视图的硬编码 `5` 覆盖了数据库保存的实际等级。

### 用户需求

确保在相对色感模式训练终止后，数据库记录的最高/当前能力等级（Level）能够在再次开启训练时正确延续，而不是重置为默认值 5。

### 评论

这是一个状态继承层面的瑕疵。修复此问题将使全站三大训练模块的难度继承行为保持完全一致，提升整体练习体验。

### 目标

1. 在 `src/app.tsx` 中添加 `relativeProfiles` 状态，并在 `refreshProfiles` 函数中查询 `relative_color` 的 Profile 记录。
2. 计算 `activeRelativeLevel = relativeProfiles[activeRelativeMode]?.currentLevel || 5`。
3. 将 `<RelativeColorTrainingView>` 的 `initialLevel` 替换为动态读取的 `activeRelativeLevel`。

### 基本原理

通过在顶层组件 `App.tsx` 中补齐 `relative_color` 领域的 Profiles 状态拉取和映射，使得入口组件可以在传参给 `RelativeColorTrainingView` 时动态取得当前模式的最优/当前 Level，保证数据库记录值能够无缝打通至训练视图。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #concept/state #scope/ux #ai/instruct #task/domain/ui #task/object/relative-color-level-persistence #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修复 `src/app.tsx` 中的相对色感 Level 继承问题

我们将对 `src/app.tsx` 进行精准替换，导入 `getProfilesByDomain` 和 `UnifiedProfileData`，添加 `relativeProfiles` 状态，并在挂载 `<RelativeColorTrainingView>` 时动态传入当前的 `activeRelativeLevel`。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
import {
  type ColorProfileData,
  type TrainingDomain,
  type UserProfileData,
  getAllColorProfiles,
  getAllUserProfiles,
  getColorTrainingTimeMs,
  getStarHoppingTrainingTimeMs,
  getTrainingTimeMs,
} from './utils/db';
~~~~~
~~~~~typescript.new
import {
  type ColorProfileData,
  type TrainingDomain,
  type UnifiedProfileData,
  type UserProfileData,
  getAllColorProfiles,
  getAllUserProfiles,
  getColorTrainingTimeMs,
  getProfilesByDomain,
  getStarHoppingTrainingTimeMs,
  getTrainingTimeMs,
} from './utils/db';
~~~~~

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
    ALL: null,
  });
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
    const starMs = await getStarHoppingTrainingTimeMs();
    const colorMs = await getColorTrainingTimeMs();
    const relMs = await getTrainingTimeMs('relative_color');
    setProfiles(data);
    setColorProfiles(cData);
    setStarHoppingTimeMs(starMs);
    setColorTimeMs(colorMs);
    setRelativeColorTimeMs(relMs);
    setSettings(loadSettings());
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
    ALL: null,
  });
  const [relativeProfiles, setRelativeProfiles] = useState<
    Record<string, UnifiedProfileData | null>
  >({});
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

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
  const activeLevel = profiles[activeMode]?.currentLevel || 5;
  const activeColorLevel = colorProfiles[activeColorMode]?.currentLevel || 5;

  return (
~~~~~
~~~~~typescript.new
  const activeLevel = profiles[activeMode]?.currentLevel || 5;
  const activeColorLevel = colorProfiles[activeColorMode]?.currentLevel || 5;
  const activeRelativeLevel = relativeProfiles[activeRelativeMode]?.currentLevel || 5;

  return (
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
        ) : (
          <RelativeColorTrainingView
            mode={activeRelativeMode}
            sessionType={relativeSessionType}
            initialLevel={5}
            settings={settings.relative_color}
            onExit={handleExitTraining}
          />
        ))}
~~~~~
~~~~~typescript.new
        ) : (
          <RelativeColorTrainingView
            mode={activeRelativeMode}
            sessionType={relativeSessionType}
            initialLevel={activeRelativeLevel}
            settings={settings.relative_color}
            onExit={handleExitTraining}
          />
        ))}
~~~~~

### 下一步建议

1. **运行测试**：执行 `npm test` 验证已有测试套件是否全部通过。
2. **提交修改**：验证无误后，可在后续独立 Plan 中提交 Git Commit。

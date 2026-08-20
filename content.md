这是由于在直接访问或刷新训练路由（`#/train/...`）时，系统尚未从 IndexedDB 异步读取该卡片已保存的能力档案（`user_profiles`），导致视图在首轮挂载时直接使用了兜底的初始难度等级 `5`，且后续数据到位后 `AdaptiveEngine` 实例并未重新以此等级初始化。

下面是修复此问题的计划与具体修改补丁。

## [WIP] fix(app): 修复页面刷新时训练等级重置为默认值的问题

### 错误分析
1. **数据加载时机**: 在 `src/app.tsx` 中，`refreshProfiles` 原先仅在 `route.type === 'dashboard'` 时才从 IndexedDB 查询 `user_profiles` 并填充 `currentDomainProfiles`，在 `route.type === 'train'` 下该字典始终为空对象。
2. **状态竞态**: 即使路由包含数据加载，页面初次加载时异步读取数据库存在微小延迟。在 profile 就绪前，`GenericTrainingView` 已经用默认等级 `5` 完成了挂载并初始化了 `useTrainingSession` 中的 `AdaptiveEngine`，导致等级被固定在 5。

### 用户需求
用户直接刷新特定训练项 URL（如 `http://localhost:5173/#/train/color_hue?type=training`）时，系统应能正确读取该卡片已达到的历史能力层阶（`currentLevel`），从该等级继续训练。

### 评论
该问题直接影响了训练体验的连贯性和历史进度持久性。统一全局能力层阶数据的预载机制并增加数据就绪等待守卫，可以彻底杜绝初次挂载时的等级回退问题。

### 目标
1. 在 `src/app.tsx` 中统一预载所有领域的 profile 数据，确保无论处于何种路由下都能获取到各卡片的当前层阶。
2. 引入 `profilesLoaded` 状态，在直接进入训练路由且数据库数据就绪后，再挂载 `GenericTrainingView`。

### 基本原理
通过在 `refreshProfiles` 中并行拉取各模块的 `user_profiles`，将所有卡片的进度同步至全局状态；在训练视图挂载前增加数据就绪守卫，确保 `GenericTrainingView` 在构造 `AdaptiveEngine` 时获得的是来自本地数据库的真实 `currentLevel`。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/state #scope/ux #ai/instruct #task/domain/storage #task/object/user-profile-persistence #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 在 app.tsx 中统一预载能力档案并添加训练就绪守卫

修改 `src/app.tsx`，在数据加载完成后再挂载训练视图，保证难度等级正确恢复。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
  const [activeAnalyticsDomain, setActiveAnalyticsDomain] = useState<TrainingDomain | null>(null);
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });

  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshProfiles = useCallback(async () => {
    const timesEntries = await Promise.all(
      ALL_DOMAINS.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    setDomainTimes(timesMap);
    setSettings(loadSettings());

    if (route.type === 'dashboard') {
      const pList = await getProfilesByDomain(route.domain);
      const pMap: Record<string, UnifiedProfileData> = {};
      for (const p of pList) {
        pMap[p.cardId] = p;
      }
      setCurrentDomainProfiles(pMap);
    }
  }, [route]);
~~~~~
~~~~~typescript
  const [activeAnalyticsDomain, setActiveAnalyticsDomain] = useState<TrainingDomain | null>(null);
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState<boolean>(false);

  const [domainTimes, setDomainTimes] = useState<Record<TrainingDomain, number>>({
    star: 0,
    color: 0,
    relative_color: 0,
    negative_space: 0,
  });

  const [currentDomainProfiles, setCurrentDomainProfiles] = useState<
    Record<string, UnifiedProfileData>
  >({});

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshProfiles = useCallback(async () => {
    const timesEntries = await Promise.all(
      ALL_DOMAINS.map(async (d) => [d, await getTrainingTimeMs(d)] as const),
    );
    const timesMap = Object.fromEntries(timesEntries) as Record<TrainingDomain, number>;

    const allProfilesList = await Promise.all(
      ALL_DOMAINS.map((d) => getProfilesByDomain(d)),
    );
    const pMap: Record<string, UnifiedProfileData> = {};
    for (const list of allProfilesList) {
      for (const p of list) {
        pMap[p.cardId] = p;
      }
    }

    setDomainTimes(timesMap);
    setCurrentDomainProfiles(pMap);
    setSettings(loadSettings());
    setProfilesLoaded(true);
  }, []);
~~~~~

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript
      {route.type === 'train' &&
        (() => {
          const activeCard = getCardById(route.cardId);
          if (!activeCard) {
            navigate({ type: 'home' });
            return null;
          }
          const plugin = CARD_PLUGINS[activeCard.id];
          const activeLevel = currentDomainProfiles[activeCard.id]?.currentLevel || 5;

          return (
            <GenericTrainingView
              key={`${activeCard.id}-${route.sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={route.sessionType}
              initialLevel={activeLevel}
              settings={settings[activeCard.settingsKey]}
              onExit={() => navigate({ type: 'dashboard', domain: activeCard.legacyDomain })}
            />
          );
        })()}
~~~~~
~~~~~typescript
      {route.type === 'train' &&
        (() => {
          if (!profilesLoaded) {
            return (
              <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold">
                正在同步能力层阶与训练数据...
              </div>
            );
          }
          const activeCard = getCardById(route.cardId);
          if (!activeCard) {
            navigate({ type: 'home' });
            return null;
          }
          const plugin = CARD_PLUGINS[activeCard.id];
          const activeLevel = currentDomainProfiles[activeCard.id]?.currentLevel || 5;

          return (
            <GenericTrainingView
              key={`${activeCard.id}-${route.sessionType}`}
              card={activeCard}
              plugin={plugin}
              sessionType={route.sessionType}
              initialLevel={activeLevel}
              settings={settings[activeCard.settingsKey]}
              onExit={() => navigate({ type: 'dashboard', domain: activeCard.legacyDomain })}
            />
          );
        })()}
~~~~~

### 下一步建议
1. 执行本计划应用修改。
2. 在浏览器中打开并刷新 `http://localhost:5173/#/train/color_hue?type=training`，验证难度等级（`Level`）是否正确保持为已达到的等级。

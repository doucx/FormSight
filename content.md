我已定位到该问题：在 `AppRouter.tsx` 中，`OfficialPlansView` 的 `onExit` 目前被固定连接到了主页路由缓存（`lastHomeRoute`，默认指向 `#/`），导致从计划编排页面（`#/plan-editor`）进入后点击退出被重定向到了首页。

我将生成一个修复计划，在路由系统中引入前驱路由上下文跟踪，并在官方计划页面中实现智能回退，确保优先返回来源页面（如 `#/plan-editor`），在独立打开时默认回退到计划中心。

## [WIP] fix(routing): 修复从计划编辑器进入官方计划库后点击退出错误跳至主页的问题

### 错误分析
1. **根本原因**：在 `AppRouter.tsx` 中，`OfficialPlansView` 的 `onExit` 回调绑定的是 `() => navigate(lastHomeRoute)`。而 `lastHomeRoute` 仅在用户访问 `home` 或 `discovery` 时才更新，当用户处于 `plan-editor` 时该变量仍保留为默认的 `{ type: 'home' }`。
2. **行为冲突**：因此，用户在 `#/plan-editor` 中点击按钮进入 `#/official-plans` 时，触发“退出”会错误跳转到首页 `#/`，违反了计划流转的层级心智。

### 用户需求
从 `http://localhost:5173/#/plan-editor` 进入 `http://localhost:5173/#/official-plans` 后，点击“退出”应当返回 `http://localhost:5173/#/plan-editor`，而不是返回系统主页 `http://localhost:5173/#/`。

### 评论
该问题直接影响计划模块各子视图之间的流转连贯性。官方计划库属于训练计划领域下的功能，退出时应当具有上下文感知能力，优先返回前驱页面；在无来源上下文时默认归位于计划编排中心，契合用户预期。

### 目标
1. 在 `useHashRoute.ts` 中增加前驱路由跟踪状态 `previousRoute`。
2. 在 `AppRouter.tsx` 中更新 `OfficialPlansView` 的退出逻辑：优先导航回上一站内页面（如 `plan-editor`），在无历史记录时默认回退至 `{ type: 'plan-editor' }`。

### 基本原理
通过在 `useHashRoute` 内部维护 `previousRouteRef`，在每次路由跳转（无论是通过 `navigate` 编程式调用还是用户前进后退触发 `hashchange`）前精准捕获上一站内路由对象。`OfficialPlansView` 在响应退出时，判定前驱路由如果有效且不是 `official-plans` 自身，则安全回退；若为空（如直接新标签页打开）则回退至计划中心主界面 `plan-editor`。

### 标签
#intent/fix #flow/ready #priority/medium
#comp/cli #concept/navigation #scope/ux
#ai/refine
#task/domain/plans
#task/object/route-back-navigation
#task/action/bug-fix
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 在 `useHashRoute` 中增加站内前驱路由跟踪

记录上一个站内有效路由，使子页面能够感知来源并准确返回。

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
export function useHashRoute() {
  const [route, setRoute] = useState<RouteLocation>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { type: 'home' },
  );

  const scrollPositionsRef = useRef<Record<string, number>>({});
  const currentHashRef = useRef<string>(
    typeof window !== 'undefined' ? window.location.hash || '#/' : '#/',
  );

  useEffect(() => {
    const handleScroll = () => {
      const currentKey = currentHashRef.current || '#/';
      scrollPositionsRef.current[currentKey] = window.scrollY;
    };

    const handleHashChange = () => {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;

      const newHash = window.location.hash || '#/';
      currentHashRef.current = newHash;
      setRoute(parseHash(newHash));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetY = scrollPositionsRef.current[newHash] ?? 0;
          window.scrollTo(0, targetY);
        });
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = useCallback((target: RouteLocation, options?: { replace?: boolean }) => {
    const newHash = stringifyRoute(target);
    if (window.location.hash !== newHash) {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;
      if (options?.replace) {
        const url = new URL(window.location.href);
        url.hash = newHash;
        window.history.replaceState(null, '', url.toString());
        currentHashRef.current = newHash;
        setRoute(parseHash(newHash));
      } else {
        window.location.hash = newHash;
      }
    }
  }, []);

  return { route, navigate };
}
~~~~~
~~~~~typescript
export function useHashRoute() {
  const [route, setRoute] = useState<RouteLocation>(() =>
    typeof window !== 'undefined' ? parseHash(window.location.hash) : { type: 'home' },
  );
  const previousRouteRef = useRef<RouteLocation | null>(null);

  const scrollPositionsRef = useRef<Record<string, number>>({});
  const currentHashRef = useRef<string>(
    typeof window !== 'undefined' ? window.location.hash || '#/' : '#/',
  );

  useEffect(() => {
    const handleScroll = () => {
      const currentKey = currentHashRef.current || '#/';
      scrollPositionsRef.current[currentKey] = window.scrollY;
    };

    const handleHashChange = () => {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;
      previousRouteRef.current = parseHash(prevHash);

      const newHash = window.location.hash || '#/';
      currentHashRef.current = newHash;
      setRoute(parseHash(newHash));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetY = scrollPositionsRef.current[newHash] ?? 0;
          window.scrollTo(0, targetY);
        });
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = useCallback((target: RouteLocation, options?: { replace?: boolean }) => {
    const newHash = stringifyRoute(target);
    if (window.location.hash !== newHash) {
      const prevHash = currentHashRef.current || '#/';
      scrollPositionsRef.current[prevHash] = window.scrollY;
      previousRouteRef.current = parseHash(prevHash);

      if (options?.replace) {
        const url = new URL(window.location.href);
        url.hash = newHash;
        window.history.replaceState(null, '', url.toString());
        currentHashRef.current = newHash;
        setRoute(parseHash(newHash));
      } else {
        window.location.hash = newHash;
      }
    }
  }, []);

  return { route, navigate, previousRoute: previousRouteRef.current };
}
~~~~~

#### Acts 2: 修正 `AppRouter.tsx` 中官方计划库的退出导航路径

当用户在官方计划库中点击退出时，优先返回进入前的前驱路由（如 `plan-editor`），在无来源或来源为自身时默认回退到 `plan-editor`。

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~old
interface AppRouterProps {
  route: RouteLocation;
  navigate: (target: RouteLocation, options?: { replace?: boolean }) => void;
  lastHomeRoute: RouteLocation;
  onOpenCardSettings: (cardId: string) => void;
  onOpenGlobalSettings: () => void;
}

export function AppRouter({
  route,
  navigate,
  lastHomeRoute,
  onOpenCardSettings,
  onOpenGlobalSettings,
}: AppRouterProps) {
~~~~~
~~~~~new
interface AppRouterProps {
  route: RouteLocation;
  navigate: (target: RouteLocation, options?: { replace?: boolean }) => void;
  lastHomeRoute: RouteLocation;
  previousRoute?: RouteLocation | null;
  onOpenCardSettings: (cardId: string) => void;
  onOpenGlobalSettings: () => void;
}

export function AppRouter({
  route,
  navigate,
  lastHomeRoute,
  previousRoute,
  onOpenCardSettings,
  onOpenGlobalSettings,
}: AppRouterProps) {
~~~~~

~~~~~act
patch_file
src/components/routing/AppRouter.tsx
~~~~~
~~~~~old
    if (route.type === 'official-plans') {
      return (
        <OfficialPlansView
          userPlans={allPlansList}
          onExit={() => navigate(lastHomeRoute)}
          onNavigateToMyPlans={() => navigate({ type: 'plan-editor' })}
          onAdoptPlan={async (preset, startImmediately) => {
~~~~~
~~~~~new
    if (route.type === 'official-plans') {
      const exitTargetRoute: RouteLocation =
        previousRoute && previousRoute.type !== 'official-plans'
          ? previousRoute
          : { type: 'plan-editor' };

      return (
        <OfficialPlansView
          userPlans={allPlansList}
          onExit={() => navigate(exitTargetRoute)}
          onNavigateToMyPlans={() => navigate({ type: 'plan-editor' })}
          onAdoptPlan={async (preset, startImmediately) => {
~~~~~

#### Acts 3: 在 `App.tsx` 中透传 `previousRoute`

确保 `AppRouter` 能够接收到 `useHashRoute` 提供的 `previousRoute`。

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~old
export function App() {
  const { route, navigate } = useHashRoute();
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);

  const { lastHomeRoute } = useAppBootstrap(route);

  // 挂载夜间模式全局响应与监听
  useTheme($settings.value);

  const activeSettingsCard = activeSettingsCardId
    ? registry.getCardById(activeSettingsCardId)
    : null;

  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground antialiased">
      <AppRouter
        route={route}
        navigate={navigate}
        lastHomeRoute={lastHomeRoute}
        onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
        onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
      />
~~~~~
~~~~~new
export function App() {
  const { route, navigate, previousRoute } = useHashRoute();
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [activeSettingsCardId, setActiveSettingsCardId] = useState<string | null>(null);

  const { lastHomeRoute } = useAppBootstrap(route);

  // 挂载夜间模式全局响应与监听
  useTheme($settings.value);

  const activeSettingsCard = activeSettingsCardId
    ? registry.getCardById(activeSettingsCardId)
    : null;

  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground antialiased">
      <AppRouter
        route={route}
        navigate={navigate}
        lastHomeRoute={lastHomeRoute}
        previousRoute={previousRoute}
        onOpenCardSettings={(cardId) => setActiveSettingsCardId(cardId)}
        onOpenGlobalSettings={() => setIsGlobalSettingsOpen(true)}
      />
~~~~~

### 下一步建议
1. **行为验证**：
   - 打开 `http://localhost:5173/#/plan-editor`，点击“官方计划库”进入 `#/official-plans`。
   - 点击左上角“退出”按钮，确认页面精确返回至 `http://localhost:5173/#/plan-editor`。
   - 在新标签页直接打开 `http://localhost:5173/#/official-plans`，点击“退出”，确认默认回退至计划中心 `#/plan-editor` 而不是主页。
2. **提交代码**：确认符合预期后，创建 `[COMMIT]` 计划将此次修复提交到代码仓库。

你的分析非常敏锐，找到了导致跳动的直接根因：在每次组件重渲染时，`registry.getAnalyticsPluginByCardId` 都会返回一个全新构造的对象引用，而 `WeaknessAnalyticsModal` 中的数据加载 `useEffect` 将该 `plugin` 对象作为了依赖项，导致状态变更 $\to$ 重渲染 $\to$ 引用变化 $\to$ 重新触发 `setLoading(true)` 和数据获取的无限递归循环。

我将生成一个修复计划来解决此问题。

## [WIP] fix: 修复卡片统计弹窗由于引用变化导致的死循环重新渲染与页面跳动

### 错误分析
1. **死循环根因**：`registry.getAnalyticsPluginByCardId(card.id)` 在每次调用时均返回动态拼装的 `CardAnalyticsPlugin` 新对象。在 `WeaknessAnalyticsModal.tsx` 中，`useEffect` 将该 `plugin` 作为了依赖项；
2. **连锁反应**：当 `fetchRecords` 执行完成并调用 `setLoading(false)` 和 `setRecords` 时，组件触发重渲染；重渲染时重新获取 `plugin`（新对象引用），使得 `useEffect` 误判为依赖发生变动，再次将 `loading` 设为 `true` 并重新发起请求，从而在“加载中”和“内容渲染”两种高度不同的 UI 间高速死循环切换，造成 Modal 剧烈上下跳动。

### 用户需求
修复点击卡片统计后 Modal 不断闪烁、在“正在分析历史数据”与内容之间来回跳动的问题，确保数据仅在卡片 ID 切换或首次打开时平稳加载一次。

### 评论
依赖项管理中将“工厂函数返回的对象字面量”放入 `useEffect` 是经典的前端闭环死循环陷阱。通过固定依赖维度为基础类型 `card.id`，并在组件内部稳定缓存插件实例，即可彻底消除此隐患。

### 目标
1. 在 `WeaknessAnalyticsModal.tsx` 中使用 `useMemo` 稳定 `plugin` 实例。
2. 将数据获取的 `useEffect` 依赖项收敛为稳定的 `card.id`，彻底斩断循环触发链路。

### 基本原理
将数据抓取副作用的触发条件精确约束在 `card.id` 发生实质性变更时，避免由工厂函数构造的浅层对象引用变化引发非预期重执行。

### 标签
#intent/fix #flow/ready #priority/critical #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/modal-analytics-render-loop #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 稳定插件实例与数据加载依赖

我们将修改 `src/components/WeaknessAnalyticsModal.tsx`，使用 `useMemo` 缓存 `plugin`，并将数据获取 `useEffect` 的触发依赖精确收敛至 `card.id`。

~~~~~act
patch_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~old
export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const { t } = useTranslation();
  const plugin = registry.getAnalyticsPluginByCardId(card.id);
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeViewIndex, setActiveViewIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = getCardTitle(card, t);

  const views = plugin?.views ?? [];
  const currentView = views[activeViewIndex] || views[0];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (plugin) {
      plugin.fetchRecords(card.id).then((data: UnifiedTrialRecord[]) => {
        if (isMounted) {
          setRecords(data);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [plugin, card.id]);
~~~~~
~~~~~new
export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const { t } = useTranslation();
  const plugin = useMemo(() => registry.getAnalyticsPluginByCardId(card.id), [card.id]);
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeViewIndex, setActiveViewIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = getCardTitle(card, t);

  const views = plugin?.views ?? [];
  const currentView = views[activeViewIndex] || views[0];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (plugin) {
      plugin.fetchRecords(card.id).then((data: UnifiedTrialRecord[]) => {
        if (isMounted) {
          setRecords(data);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [card.id]);
~~~~~

### 下一步建议
1. 在浏览器中点击任意卡片的统计图标，验证弹窗已稳定加载且不再上下跳动。
2. 点击多 Tab 切换（如 SAT 速度-准确率、难度抗压分析、领域专属分析），验证图表渲染与切换响应顺畅。

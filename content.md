你的定位非常精准。原先 `I18nManager.t` 仅对 `typeof text === 'string'` 进行了有效求值，当解析到 JSON 中的数组字段（如 `stats.heatmapMonths`）时，会被 `typeof text !== 'string'` 分支直接拦截至回退字符串 `key`，进而导致组件中的 `Array.isArray(raw)` 判断为假并降级为硬编码的英文月份。

我将更新 `src/core/i18n.ts` 让 `t` 支持泛型以及数组项的模板插值，并让 `ActivityHeatmapCard.tsx` 联动响应语言切换。

## [WIP] fix(i18n): 扩展翻译引擎以支持数组类型键值解析与热力图月份本地化

### 错误分析
1. **根本原因**：在 `src/core/i18n.ts` 中，`I18nManager.prototype.t` 的实现逻辑强制要求 `text` 必须是 `string` 类型（`if (typeof text !== 'string') return key;`）。
2. **故障链路**：当组件调用 `t('stats.heatmapMonths')` 时，底层字典虽然正确解析到了包含 12 个中文月份的数组 `["一月", "二月", ...]`，但在类型检查阶段被判定为非字符串而直接返回了原始键名字符串 `"stats.heatmapMonths"`。
3. **表现现象**：在 `ActivityHeatmapCard.tsx` 中，`Array.isArray("stats.heatmapMonths")` 计算为 `false`，从而无条件触发了保底逻辑并返回了英文简写月份数组 `['Jan', 'Feb', ...]`。

### 用户需求
1. 增强 `i18n.ts` 的解析能力，使其能够识别并透传数组类型的字典值（如 `heatmapMonths`、`heatmapWeekdays` 等），同时支持对数组内字符串进行插值参数替换。
2. 修复热力图卡片 `ActivityHeatmapCard.tsx`，确保中文环境下正确显示“一月”、“二月”等中文月份，并在切换语言时实时响应重新渲染。

### 评论
国际化字典中存在大量序列化标签（如月份、星期、难度阶梯名、图例列表等），让 `t` 方法直接支持数组和泛型返回是标准的 i18n 基础设施规范，避免了在各业务组件中自行分拆下标和拼接 Key。

### 目标
1. 重构 `I18nManager.prototype.t` 为泛型方法，新增对 `Array.isArray(result)` 的处理与遍历插值支持。
2. 在 `ActivityHeatmapCard.tsx` 中引入 `locale` 依赖以确保月份和星期在动态切换语言时即时刷新。

### 基本原理
1. 在 `t` 方法中，当通过 `resolvePath` 获取到的节点为数组时，遍历处理其可能包含的 `{{param}}` 插值并返回 `T` 类型。
2. 非字符串且非数组的其他未知结构仍保持向后兼容（返回原始 `key`）。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/ui #scope/dx #scope/ux #ai/instruct #task/domain/i18n #task/object/array-localization #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 升级 i18n 核心模块支持泛型与数组解析

修改 `src/core/i18n.ts`，为 `t` 函数增加对数组类型的解析、插值与泛型类型推断。

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~typescript.old
  /** 核心翻译查表方法，支持深层路径解析与模板插值 */
  public t = (key: string, params?: Record<string, string | number>): string => {
    const activeDict =
      this.dictionaries[this.currentLocale] || this.dictionaries[this.fallbackLocale] || {};
    const text =
      this.resolvePath(activeDict, key) ??
      this.resolvePath(this.dictionaries[this.fallbackLocale], key);

    if (typeof text !== 'string') {
      return key;
    }

    if (!params) return text;
    return text.replace(/\{\{(\w+)\}\}/g, (_, match) => String(params[match] ?? `{{${match}}}`));
  };
~~~~~
~~~~~typescript.new
  /** 核心翻译查表方法，支持深层路径解析、数组透传与模板插值 */
  public t = <T = string>(key: string, params?: Record<string, string | number>): T => {
    const activeDict =
      this.dictionaries[this.currentLocale] || this.dictionaries[this.fallbackLocale] || {};
    const result =
      this.resolvePath(activeDict, key) ??
      this.resolvePath(this.dictionaries[this.fallbackLocale], key);

    if (Array.isArray(result)) {
      if (!params) return result as unknown as T;
      return result.map((item) =>
        typeof item === 'string'
          ? item.replace(/\{\{(\w+)\}\}/g, (_, match) => String(params[match] ?? `{{${match}}}`))
          : item,
      ) as unknown as T;
    }

    if (typeof result !== 'string') {
      return key as unknown as T;
    }

    if (!params) return result as unknown as T;
    return result.replace(
      /\{\{(\w+)\}\}/g,
      (_, match) => String(params[match] ?? `{{${match}}}`),
    ) as unknown as T;
  };
~~~~~

#### Acts 2: 绑定 ActivityHeatmapCard 月份计算依赖

更新 `ActivityHeatmapCard.tsx`，将 `locale` 纳入 `monthNames` 的依赖计算中，确保语言切换时月份文本即时响应更新。

~~~~~act
patch_file
src/components/stats/ActivityHeatmapCard.tsx
~~~~~
~~~~~typescript.old
export function ActivityHeatmapCard({ heatmapData }: ActivityHeatmapCardProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. 构建日期-答题量映射表
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of heatmapData) {
      map.set(item.date, (map.get(item.date) || 0) + item.count);
    }
    return map;
  }, [heatmapData]);

  // 2. 解析多语言月份数组
  const monthNames = useMemo(() => {
    const raw = t('stats.heatmapMonths');
    if (Array.isArray(raw)) return raw as string[];
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }, [t]);
~~~~~
~~~~~typescript.new
export function ActivityHeatmapCard({ heatmapData }: ActivityHeatmapCardProps) {
  const { t, locale } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. 构建日期-答题量映射表
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of heatmapData) {
      map.set(item.date, (map.get(item.date) || 0) + item.count);
    }
    return map;
  }, [heatmapData]);

  // 2. 解析多语言月份数组
  const monthNames = useMemo(() => {
    const raw = t<string[]>('stats.heatmapMonths');
    if (Array.isArray(raw)) return raw;
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }, [t, locale]);
~~~~~

### 下一步建议
- **测试验证**：在全局设置中切换界面语言（中文 / English），观察热力图顶部的月份标识是否由“一月、二月”无缝切换为“Jan, Feb”，左侧周标是否由“周一、周三、周五”切换为“Mon, Wed, Fri”。

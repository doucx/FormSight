我已定位这 5 处 TypeScript 编译报错：
1. `src/app.tsx`: 未使用的 `locale` 变量解构。
2. `src/core/i18n.ts`: `reduce` 缺乏泛型参数 `<unknown>` 导致类型推导重载不匹配。
3. `src/core/registry.ts`: `c.title` 和 `c.desc` 的可选链空值安全保护。
4. `src/packs/star/analytics.tsx` & `src/packs/star/index.ts`: 移除未使用的 `titleKey` 参数。

我将生成一个修复计划并进行代码修正。

## [WIP] fix: 修复 TypeScript 严格类型检查与未读变量错误

### 错误分析
- `src/app.tsx` 解构了未使用的 `locale`。
- `src/core/i18n.ts` 中的 `Array.prototype.reduce` 初始值类型为 `unknown`，未显式指定泛型参数 `<unknown>` 导致 TypeScript 无法匹配正确的重载签名。
- `src/core/registry.ts` 对 `c.title` / `c.desc` 进行搜索过滤时未做 `undefined` 防御。
- `src/packs/star/analytics.tsx` 中的工厂函数包含未使用的废弃入参 `titleKey`。

### 用户需求
修复 `tsc --noEmit` 报出的 5 处类型错误，使 `npm run checkf` 顺利通过。

### 评论
修复这些类型问题将提高代码在严格编译模式（`noUnusedLocals`, `noUnusedParameters`, `strict`）下的健壮性。

### 目标
1. 移除 `app.tsx` 中多余的 `locale` 解构。
2. 为 `i18n.ts` 的 `resolvePath` 添加 `reduce<unknown>` 泛型注解。
3. 为 `registry.ts` 搜索过滤逻辑增加安全访问。
4. 清理 `src/packs/star/analytics.tsx` 和 `src/packs/star/index.ts` 中的冗余参数。

### 基本原理
通过精确的类型断言和空值防卫，满足 TypeScript 严格类型检查标准。

### 标签
#intent/fix #flow/ready #priority/high #comp/runtime #concept/history #scope/core #ai/instruct #task/domain/testing #task/object/type-safety #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修复 `app.tsx`、`i18n.ts` 与 `registry.ts` 的类型问题

~~~~~act
patch_file
src/app.tsx
~~~~~
~~~~~typescript.old
export function App() {
  const { t, locale } = useTranslation();
  const { route, navigate } = useHashRoute();
~~~~~
~~~~~typescript.new
export function App() {
  const { t } = useTranslation();
  const { route, navigate } = useHashRoute();
~~~~~

~~~~~act
patch_file
src/core/i18n.ts
~~~~~
~~~~~typescript.old
  private resolvePath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce((acc, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }
~~~~~
~~~~~typescript.new
  private resolvePath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript.old
    if (options.searchKeyword) {
      const kw = options.searchKeyword.trim().toLowerCase();
      if (kw) {
        results = results.filter(
          (c) =>
            c.title.toLowerCase().includes(kw) ||
            c.desc.toLowerCase().includes(kw) ||
            c.id.toLowerCase().includes(kw),
        );
      }
    }
~~~~~
~~~~~typescript.new
    if (options.searchKeyword) {
      const kw = options.searchKeyword.trim().toLowerCase();
      if (kw) {
        results = results.filter(
          (c) =>
            (c.title && c.title.toLowerCase().includes(kw)) ||
            (c.desc && c.desc.toLowerCase().includes(kw)) ||
            c.id.toLowerCase().includes(kw),
        );
      }
    }
~~~~~

#### Acts 2: 修复 `star/analytics.tsx` 与 `star/index.ts` 中的未读参数

~~~~~act
patch_file
src/packs/star/analytics.tsx
~~~~~
~~~~~typescript.old
export function createStarAnalyticsPlugin(cardId: string, titleKey: string): CardAnalyticsPlugin {
  return {
    cardId,
    fetchRecords: async (id) => getTrialRecordsByCard(id),
~~~~~
~~~~~typescript.new
export function createStarAnalyticsPlugin(cardId: string): CardAnalyticsPlugin {
  return {
    cardId,
    fetchRecords: async (id) => getTrialRecordsByCard(id),
~~~~~

~~~~~act
patch_file
src/packs/star/index.ts
~~~~~
~~~~~typescript.old
  analyticsPlugins: {
    star_single: createStarAnalyticsPlugin('star_single', 'star_single'),
    star_double_h: createStarAnalyticsPlugin('star_double_h', 'star_double_h'),
    star_double_r: createStarAnalyticsPlugin('star_double_r', 'star_double_r'),
  },
~~~~~
~~~~~typescript.new
  analyticsPlugins: {
    star_single: createStarAnalyticsPlugin('star_single'),
    star_double_h: createStarAnalyticsPlugin('star_double_h'),
    star_double_r: createStarAnalyticsPlugin('star_double_r'),
  },
~~~~~

### 下一步建议
运行 `npm run checkf` 与 `python scripts/check_i18n.py` 验证 TypeScript 编译与代码格式。

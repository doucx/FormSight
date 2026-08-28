好的，我将为你优化 `FilterEngine` 与路由持久化逻辑：点击“清空”时保持面板展开状态；点击“收起高级筛选”时，正确收起面板并完整保留当前选中的所有筛选维度。

## [WIP] fix(discovery): 优化高级筛选折叠与清空交互行为

### 用户需求
1. **清空不关闭面板**：当高级筛选处于展开状态时，点击“清空”按钮仅重置筛选条件，面板保持展开，不自动折叠。
2. **收起保留筛选状态**：点击“收起高级筛选”时折叠面板，但完整保留已勾选的各维度标签与筛选结果，且通过 URL 参数（`adv=0`）保持收起状态。

### 错误分析
1. 之前的 `handleResetFilters` 直接将 query 重置为 `{}`，导致 `showAdvanced` 丢失并触发默认折叠。
2. 之前展开状态使用了 `query.showAdvanced ?? hasActiveAdvancedDimensions` 的回退计算，当有筛选标签选中时，若用户点击收起，如果没有对 `showAdvanced: false` 进行严格的显式判定并序列化（`adv=0`），会导致面板无法被强制收起。

### 目标
1. 修改 `src/hooks/useHashRoute.ts`，支持对 `adv=0`（显式收起）和 `adv=1`（显式展开）的完整双向序列化。
2. 改造 `src/components/discovery/FilterEngine.tsx`：
   - 严格以 `query.showAdvanced` 显式布尔值为准（未声明时默认 `false` 收起）。
   - 点击“清空”时，保留当前的 `showAdvanced` 开关状态。
   - 点击“收起高级筛选”时，将 `showAdvanced` 设为 `false`，所有筛选字段保持不变。

### 基本原理
- 将 UI 面板可见性（`showAdvanced`）与数据过滤逻辑（`domains`, `paths`, `packId` 等）严格解耦。
- 在 URL 查询字符串中准确记录 `adv=0` 与 `adv=1`，确保用户的界面意图与数据状态独立且精确地持久化。

### 标签
#intent/fix #flow/ready #priority/high #comp/discovery #concept/navigation #scope/ux #ai/instruct #task/domain/discovery #task/object/filter-engine #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 完善 `useHashRoute.ts` 中 `adv` 参数的双向序列化

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~ts.old
    if (route.query.searchKeyword?.trim()) {
      params.set('q', route.query.searchKeyword.trim());
    }
    if (route.query.showAdvanced) {
      params.set('adv', '1');
    }
    const qs = params.toString();
~~~~~
~~~~~ts.new
    if (route.query.searchKeyword?.trim()) {
      params.set('q', route.query.searchKeyword.trim());
    }
    if (route.query.showAdvanced === true) {
      params.set('adv', '1');
    } else if (route.query.showAdvanced === false) {
      params.set('adv', '0');
    }
    const qs = params.toString();
~~~~~

#### Acts 2: 修复 `FilterEngine.tsx` 中的清空与收起逻辑

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~tsx.old
  // 若 query 中明确声明，或已勾选了任意高级五维标签，则保持展开状态；否则默认收起
  const hasActiveAdvancedDimensions = Boolean(
    (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0),
  );

  const isAdvancedOpen = query.showAdvanced ?? hasActiveAdvancedDimensions;

  const toggleAdvancedOpen = () => {
    onChange({
      ...query,
      showAdvanced: !isAdvancedOpen,
    });
  };
~~~~~
~~~~~tsx.new
  // 严格以显式 showAdvanced 状态为准，默认保持折叠 (false)
  const isAdvancedOpen = Boolean(query.showAdvanced);

  const toggleAdvancedOpen = () => {
    onChange({
      ...query,
      showAdvanced: !isAdvancedOpen,
    });
  };
~~~~~

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~tsx.old
  const handleResetFilters = () => {
    onChange({});
  };
~~~~~
~~~~~tsx.new
  const handleResetFilters = () => {
    onChange(
      isAdvancedOpen
        ? { showAdvanced: true }
        : {}
    );
  };
~~~~~

### 下一步建议
1. **测试验收**：
   - 展开高级筛选并勾选多个维度，点击“收起高级筛选”：验证面板已平滑折叠，但大盘卡片仍保持过滤，URL 包含 `adv=0` 与各维度参数。
   - 在高级筛选展开并勾选条件时，点击右上角的“清空”按钮：验证所有选中的标签被清除，而高级筛选面板依然保持展开。

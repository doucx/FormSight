我已定位该异常原因。在之前的重构中，`DomainMeta` 的 `modes` 数组已被升级为基于卡片注册表派生的 `cards` 属性，而 `GlobalStatsModal.tsx` 中的下拉筛选菜单和标签解析函数仍在使用旧的 `meta.modes`，导致读取 `undefined.map` 抛出运行时异常。

## [WIP] fix(stats): 修复全局统计弹窗读取 meta.modes 的未定义错误

### 错误分析
在重构 `DomainMeta`（`src/config/domains.ts`）时，原有的 `modes: ModeConfig[]` 属性被重命名并迁移为动态计算属性 `cards: CardDefinition[]`。而在 `GlobalStatsModal.tsx` 的第 68 行（`getCurrentFilterLabel`）和第 198 行（`<select>` 下拉选项渲染）中，仍尝试访问 `meta.modes.find` 和 `meta.modes.map`。由于 `meta.modes` 为 `undefined`，直接触发了 `TypeError: Cannot read properties of undefined (reading 'map')`。

**解决方案**：
将 `GlobalStatsModal.tsx` 中对 `meta.modes` 的引用适配为 `meta.cards`，并使用 `card.legacyMode` 与 `card.title` 进行项目筛选与标题渲染。

### 用户需求
修复全局统计弹窗（GlobalStatsModal）在打开和切换筛选维度时崩溃报错的问题，使其正确展示所有 14 个卡片模式的下拉项与统计图表。

### 评论
修复该引用后，全局统计模块将与扁平卡片注册表体系无缝兼容，同时保持原有的 `domain:mode` 数据筛选逻辑不变。

### 目标
1. 修改 `src/components/GlobalStatsModal.tsx` 中 `getCurrentFilterLabel` 函数，使用 `meta.cards.find(c => c.legacyMode === mode)` 获取卡片标题。
2. 修改 `src/components/GlobalStatsModal.tsx` 的 `<select>` 渲染逻辑，将 `meta.modes.map` 改为 `meta.cards.map`。
3. 运行代码检查与单元测试，验证无类型与运行时报错。

### 基本原理
通过将 `GlobalStatsModal` 中的模式遍历统一重构为对 `meta.cards` 的访问，完全适配了 Phase 3 的虚拟集合（Virtual Collections）接口，消除了残留的废弃属性依赖。

### 标签
#intent/fix #flow/ready #priority/critical #comp/interfaces #concept/ui #scope/core #ai/instruct #task/domain/stats #task/object/global-stats-modal #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 适配 `src/components/GlobalStatsModal.tsx` 中的卡片访问

更新筛选标签解析与选项渲染逻辑，使用 `meta.cards` 替代已废弃的 `meta.modes`。

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
  // 获取当前筛选标签名
  const getCurrentFilterLabel = () => {
    if (selectedFilter === 'all') return '全部练习项目';
    if (selectedFilter.endsWith('_all')) {
      const d = selectedFilter.replace('_all', '') as TrainingDomain;
      return `${DOMAINS_CONFIG[d]?.title || d} (全部)`;
    }
    const [domain, mode] = selectedFilter.split(':') as [TrainingDomain, string];
    const meta = DOMAINS_CONFIG[domain];
    const modeConfig = meta?.modes.find((m) => m.id === mode);
    return `${meta?.title || domain} • ${modeConfig?.title || mode}`;
  };
~~~~~
~~~~~typescript
  // 获取当前筛选标签名
  const getCurrentFilterLabel = () => {
    if (selectedFilter === 'all') return '全部练习项目';
    if (selectedFilter.endsWith('_all')) {
      const d = selectedFilter.replace('_all', '') as TrainingDomain;
      return `${DOMAINS_CONFIG[d]?.title || d} (全部)`;
    }
    const [domain, mode] = selectedFilter.split(':') as [TrainingDomain, string];
    const meta = DOMAINS_CONFIG[domain];
    const card = meta?.cards.find((c) => c.legacyMode === mode);
    return `${meta?.title || domain} • ${card?.title || mode}`;
  };
~~~~~

~~~~~act
patch_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~typescript
                <option value="all">全部练习项目</option>
                {Object.values(DOMAINS_CONFIG).map((meta) => (
                  <optgroup key={meta.domain} label={meta.title}>
                    <option value={`${meta.domain}_all`}>{meta.title} (全部)</option>
                    {meta.modes.map((m) => (
                      <option key={`${meta.domain}:${m.id}`} value={`${meta.domain}:${m.id}`}>
                        {m.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
~~~~~
~~~~~typescript
                <option value="all">全部练习项目</option>
                {Object.values(DOMAINS_CONFIG).map((meta) => (
                  <optgroup key={meta.domain} label={meta.title}>
                    <option value={`${meta.domain}_all`}>{meta.title} (全部)</option>
                    {meta.cards.map((card) => (
                      <option
                        key={`${meta.domain}:${card.legacyMode}`}
                        value={`${meta.domain}:${card.legacyMode}`}
                      >
                        {card.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
~~~~~

### 下一步建议
- 在浏览器中打开「统计」弹窗，验证下拉框内各模块选项是否正常展开与切换，并确认热力图与演进曲线正常渲染。

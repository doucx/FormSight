修复 `universalViews.tsx` 中的 Biome `noNonNullAssertion` 报错。

## [WIP] fix(analytics): 修复 universalViews.tsx 中的非空断言报错

### 用户需求
修复 Biome 检查中检测到的 `lint/style/noNonNullAssertion` 错误，避免在 `universalViews.tsx` 第 230 行使用非空断言 `!`。

### 评论
Biome 默认禁止使用 TypeScript 的非空断言 (`!`)，我们需要将 `levelMap.get(l)!` 重构为安全的查找或条件保护。

### 目标
1. 修改 `./src/core/analytics/universalViews.tsx` 文件，移除 `levelMap.get(l)!` 的非空断言。
2. 确保在严格类型检查和 Biome 检查下全部通过。

### 基本原理
在 `calculateLevelStats` 函数中，`levels` 是通过 `levelMap.keys()` 获取并排序得到的，因此对于 `levels` 中的每一个 `l`，`levelMap.get(l)` 必定存在。然而为了满足 Biome 的规范，可以通过 `const data = levelMap.get(l); if (!data) continue;` 或者利用断言保护来规避 `!` 符号。

### 标签
#intent/fix #flow/ready #priority/high #comp/engine #concept/config #scope/core #ai/instruct #task/domain/analytics #task/object/universal-views #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 修复 universalViews.tsx 中的非空断言

~~~~~act
patch_file
src/core/analytics/universalViews.tsx
~~~~~
~~~~~typescript.old
  const levels = Array.from(levelMap.keys()).sort((a, b) => a - b);
  return levels.map((l) => {
    const data = levelMap.get(l)!;
    return {
      level: l,
      total: data.total,
      hits: data.hits,
      accuracy: Math.round((data.hits / data.total) * 100),
    };
  });
~~~~~
~~~~~typescript.new
  const levels = Array.from(levelMap.keys()).sort((a, b) => a - b);
  return levels
    .map((l) => {
      const data = levelMap.get(l);
      if (!data) return null;
      return {
        level: l,
        total: data.total,
        hits: data.hits,
        accuracy: Math.round((data.hits / data.total) * 100),
      };
    })
    .filter((item): item is LevelBinStat => item !== null);
~~~~~

### 下一步建议

修改完成后，建议运行 `npm run checkf` 再次验证 Biome 和 TypeScript 检查是否完全通过。

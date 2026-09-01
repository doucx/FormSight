我现在将生成 Quipu 计划来修复搜索功能中因卡片多语言解耦导致的标题与描述搜索失效问题。

## [WIP] fix: 修复卡片多维搜索中的多语言标题与描述匹配失效问题

### 错误分析

在卡片一等公民重构中，卡片元数据（标题 `title`、描述 `desc`、玩法要领 `instruction`）由全局集中管理改为内聚在卡片独立的 `locales/*.json` 词典中，并通过 `i18n` 运行时提供解析。而在 `src/core/registry.ts` 的 `queryCards` 方法中，依然直接读取了 `CardDefinition` 的 `c.title` 与 `c.desc`（均为 `undefined`），导致在按中文名（如“动态”、“单锚点”）搜索时匹配失效，必须输入卡片英文 ID 才能搜出。

### 用户需求

修复探索大盘和计划编辑器的搜索过滤功能，使得用户输入卡片中文名称、描述关键词、卡片 ID 或要领文本时均能正常高亮匹配并筛选出对应模块。

### 评论

这是一个关键的可用性与用户体验 (UX) 修复。通过在 `registry.queryCards` 中引入动态多语言解析，彻底打通了卡片私有词典与全局多维检索引擎。

### 目标

1. 在 `src/core/registry.ts` 中导入 `getCardTitle`、`getCardDesc` 与 `i18n`。
2. 升级 `queryCards` 中的关键词过滤逻辑，使其同时对卡片 ID、当前语言下的卡片标题、卡片描述与指令文本进行全面模糊匹配。

### 基本原理

利用 `getCardTitle(c)` 和 `getCardDesc(c)` 在查询过滤执行时即时解析当前激活语言（如 `zh-CN` 或 `en-US`）下的本地化文本，并与用户输入的关键词统一小写化匹配，保证搜索结果准确全面。

### 标签

#intent/fix #flow/ready #priority/high #comp/engine #concept/ui #scope/ux #scope/core #ai/instruct #task/domain/discovery #task/object/search-engine #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 升级 `src/core/registry.ts` 的搜索过滤逻辑

导入 `getCardTitle` 与 `getCardDesc`，并在 `queryCards` 中支持多语言标题、描述及玩法说明的匹配。

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
import { UNIVERSAL_ANALYTICS_VIEWS } from './analytics/universalViews';
import type { CardManifest, CardAnalyticsView as FlatCardAnalyticsView } from './cardContract';
import type { CardAnalyticsPlugin } from './contracts';
import { i18n } from './i18n';
~~~~~
~~~~~typescript
import { UNIVERSAL_ANALYTICS_VIEWS } from './analytics/universalViews';
import type { CardManifest, CardAnalyticsView as FlatCardAnalyticsView } from './cardContract';
import type { CardAnalyticsPlugin } from './contracts';
import { getCardDesc, getCardTitle, i18n } from './i18n';
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
    if (options.searchKeyword) {
      const kw = options.searchKeyword.trim().toLowerCase();
      if (kw) {
        results = results.filter(
          (c) =>
            c.title?.toLowerCase().includes(kw) ||
            c.desc?.toLowerCase().includes(kw) ||
            c.id.toLowerCase().includes(kw),
        );
      }
    }
~~~~~
~~~~~typescript
    if (options.searchKeyword) {
      const kw = options.searchKeyword.trim().toLowerCase();
      if (kw) {
        results = results.filter((c) => {
          if (c.id.toLowerCase().includes(kw)) return true;

          const title = getCardTitle(c).toLowerCase();
          if (title.includes(kw)) return true;

          const desc = getCardDesc(c).toLowerCase();
          if (desc.includes(kw)) return true;

          const instructionKey = `cards.${c.id}.instruction`;
          const instruction = i18n.t(instructionKey);
          if (instruction !== instructionKey && instruction.toLowerCase().includes(kw)) {
            return true;
          }

          return false;
        });
      }
    }
~~~~~

### 下一步建议

1. 在探索大盘（Discovery Hub）和计划中心测试搜索关键词（例如搜索“动态”、“色相”、“单锚点”以及“abs”），确认能准确即时匹配出相应卡片。
2. 切换应用语言至英文，测试输入“gesture”、“hue”、“single”等英文关键词时的搜索匹配效果。

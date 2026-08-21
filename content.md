错误原因已定位：`src/config/cards.ts` 引入了 `registry.ts`，而 `registry.ts` 在自动扫描并加载各个 `domains/*/index.ts` 时，领域入口又反向从 `src/config/cards.ts` 导入了 `SLIDER_COMMON_SCHEMAS` 等常量，形成了**循环依赖**导致 TDZ（暂时性死区）。

我们将把通用 Setting Schemas 独立抽取到无循环依赖的 `src/config/schemas.ts` 中，彻底解耦。

## [WIP] fix(config): 解除 Setting Schemas 与 Registry 之间的循环依赖

### 错误分析

1. **报错现象**：
   浏览器运行时抛出 `Uncaught ReferenceError: Cannot access 'SLIDER_COMMON_SCHEMAS' before initialization at index.ts:22:21`。
2. **根因分析**：
   - 依赖链：`src/config/cards.ts` $\rightarrow$ `src/core/registry.ts` $\rightarrow$ `src/domains/*/index.ts` $\rightarrow$ `src/config/cards.ts`。
   - `registry.ts` 在顶层执行 `import.meta.glob` 立即加载 `domains/*/index.ts`。当各领域的 `index.ts` 尝试从尚未完成顶层初始化的 `cards.ts` 中读取 `SLIDER_COMMON_SCHEMAS` 时，由于处于 ES 模块的 TDZ（暂时性死区），触发了 `ReferenceError`。

### 用户需求
修复 `SLIDER_COMMON_SCHEMAS` 循环依赖导致的初始化报错，使应用能正常加载并运行。

### 评论
模块循环依赖是在集中式配置向去中心化 Registry 演进过程中最常见的问题。将无副作用的纯 Schema 数据定义独立出来，是消除依赖循环的标准解法。

### 目标
1. 创建独立的 `src/config/schemas.ts`，承载所有通用的 `SettingFieldSchema` 常量。
2. 更新所有 `src/domains/*/index.ts`，改为从 `src/config/schemas.ts` 导入 schemas。
3. `src/config/cards.ts` 重新导出这些 schemas 以保持向后兼容。
4. 运行 `check` 与单元测试确保零报错。

### 基本原理
通过将 Schema 配置常量的定义从包含逻辑/Registry 引用的 `cards.ts` 中下沉到叶子节点模块 `schemas.ts`，破坏 `cards <-> registry <-> domains` 的闭环，使得依赖拓扑变为严格的有向无环图 (DAG)。

### 标签
#intent/fix #flow/ready #priority/critical #comp/build #comp/runtime #concept/config #scope/core #ai/instruct #task/domain/architecture #task/object/circular-dependency #task/action/bug-fix #task/state/continue #task/status/active

---

### Script

#### Acts 1: 创建独立的 `src/config/schemas.ts`

~~~~~act
write_file
src/config/schemas.ts
~~~~~
~~~~~ts
import {
  COLOR_SECTORS,
  STAR_SECTORS,
  type SettingFieldSchema,
} from '../components/settings/DynamicDomainSettings';

export const STAR_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'buttonGroup',
    key: 'gridSize',
    title: '干扰点网格大小',
    options: [
      { label: '2x2', value: 2 },
      { label: '3x3', value: 3 },
      { label: '4x4', value: 4 },
      { label: '5x5', value: 5 },
    ],
    gridCols: 'grid-cols-4',
  },
  {
    type: 'targeting',
    modeKey: 'targetingMode',
    sectorsKey: 'manualTargetSectors',
    title: '弱点专项靶向强化',
    subTitle: '选择需要靶向强化的角度扇区：',
    sectors: STAR_SECTORS,
    gridCols: 'grid-cols-4',
  },
];

export const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const HUE_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'targeting',
    modeKey: 'targetingMode',
    sectorsKey: 'manualTargetSectors',
    title: '色相弱点专项靶向强化',
    subTitle: '选择需要靶向强化的色相扇区：',
    sectors: COLOR_SECTORS,
    gridCols: 'grid-cols-3',
  },
];

export const COLOR_ALL_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'toggle',
    key: 'enableHoverColorPreview',
    title: '综合拾色悬停颜色实时联动',
    description: '鼠标悬停滑块时右侧色块实时跟随试探预览',
  },
];
~~~~~

#### Acts 2: 更新 `src/config/cards.ts` 重新导出 schemas

~~~~~act
write_file
src/config/cards.ts
~~~~~
~~~~~ts
import { registry } from '../core/registry';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db';

export * from './schemas';

export function getCardById(id: string): CardDefinition | undefined {
  return registry.getCardById(id);
}

export function getCardsByDomain(domain: TrainingDomain): CardDefinition[] {
  return registry.getCardsByDomain(domain);
}
~~~~~

#### Acts 3: 更新各个 Domain 的 `index.ts` 依赖路径

将所有 domain 中的 schema 导入指向 `../../config/schemas`，打破循环依赖。

~~~~~act
patch_file
src/domains/abstraction/index.ts
~~~~~
~~~~~old
import { Eye, Maximize2, Palette, RotateCw, Sun } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import type { DomainManifest } from '../../core/contracts';
~~~~~
~~~~~new
import { Eye, Maximize2, Palette, RotateCw, Sun } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
~~~~~

~~~~~act
patch_file
src/domains/angle/index.ts
~~~~~
~~~~~old
import { Columns, Compass, Split } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import type { DomainManifest } from '../../core/contracts';
~~~~~
~~~~~new
import { Columns, Compass, Split } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
~~~~~

~~~~~act
patch_file
src/domains/color/index.ts
~~~~~
~~~~~old
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import { colorHueAnalyticsPlugin } from '../../config/analyticsPlugins';
import { COLOR_ALL_SCHEMAS, HUE_SCHEMAS, SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import type { DomainManifest } from '../../core/contracts';
~~~~~
~~~~~new
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import { colorHueAnalyticsPlugin } from '../../config/analyticsPlugins';
import { COLOR_ALL_SCHEMAS, HUE_SCHEMAS, SLIDER_COMMON_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
~~~~~

~~~~~act
patch_file
src/domains/negative_space/index.ts
~~~~~
~~~~~old
import { Columns, Crosshair, Maximize2, Sparkles } from 'lucide-preact';
import { negRatioAnalyticsPlugin } from '../../config/analyticsPlugins';
import { SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import type { DomainManifest } from '../../core/contracts';
~~~~~
~~~~~new
import { Columns, Crosshair, Maximize2, Sparkles } from 'lucide-preact';
import { negRatioAnalyticsPlugin } from '../../config/analyticsPlugins';
import { SLIDER_COMMON_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
~~~~~

~~~~~act
patch_file
src/domains/relative_color/index.ts
~~~~~
~~~~~old
import { Columns, Palette, Shuffle, Sun } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/cards';
import type { DomainManifest } from '../../core/contracts';
~~~~~
~~~~~new
import { Columns, Palette, Shuffle, Sun } from 'lucide-preact';
import { SLIDER_COMMON_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
~~~~~

~~~~~act
patch_file
src/domains/star/index.ts
~~~~~
~~~~~old
import { Compass, Crosshair, RotateCw, Target } from 'lucide-preact';
import { CARD_ANALYTICS_PLUGINS } from '../../config/analyticsPlugins';
import { STAR_SCHEMAS } from '../../config/cards';
import type { DomainManifest } from '../../core/contracts';
~~~~~
~~~~~new
import { Compass, Crosshair, RotateCw, Target } from 'lucide-preact';
import { CARD_ANALYTICS_PLUGINS } from '../../config/analyticsPlugins';
import { STAR_SCHEMAS } from '../../config/schemas';
import type { DomainManifest } from '../../core/contracts';
~~~~~

---

### 下一步建议
1. 刷新浏览器页面验证控制台是否已无任何 TDZ 循环依赖报错。
2. 确认自适应训练和基准测试正常工作后，即可提交本次变更。

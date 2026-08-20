## [WIP] fix(config): 修复 domains.ts 中重复的 star 配置语法错误

### 错误分析
在上一轮向 `src/config/domains.ts` 中写入 `abstraction` 配置时，合并补丁引入了重复冗余的 `star` 配置块，导致对象字面量花括号不匹配，引发 esbuild 编译错误 `Unexpected "{"`。

### 用户需求
修复 `src/config/domains.ts` 的语法错误，保证 Vite 能够正常编译运行。

### 评论
必须保持配置文件的整洁与完整，确保 5 个领域（`abstraction`, `star`, `color`, `relative_color`, `negative_space`）声明准确无冗余。

### 目标
重写 `src/config/domains.ts`，彻底移除残留的重复配置与异常花括号。

### 基本原理
通过 `write_file` 全量替换 `src/config/domains.ts`，确保文件格式和 TypeScript 语法完全合规。

### 标签
#intent/fix #flow/ready #priority/critical #comp/build #concept/config #scope/core #ai/delegate #task/domain/ui #task/object/domain-config #task/action/bug-fix #task/state/continue #task/status/active

---

### Script

#### Acts 1: 重新写入规范的 `domains.ts`

~~~~~act
write_file
src/config/domains.ts
~~~~~
~~~~~typescript
import { Compass, Eye, Maximize2, Palette, Shuffle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import type { CardDefinition } from '../types/card';
import type { TrainingDomain } from '../utils/db';
import { getCardsByDomain } from './cards';

export interface DomainMeta {
  domain: TrainingDomain;
  appId:
    | 'star-hopping'
    | 'color-sense'
    | 'relative-color'
    | 'negative-space'
    | 'visual-abstraction';
  title: string;
  subTitle: string;
  homeTitle: string;
  homeDesc: string;
  themeColor: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon: (props: { className?: string }) => ComponentChildren;
  hasWeaknessAnalytics?: boolean;
  get cards(): CardDefinition[];
}

export const DOMAINS_CONFIG: Record<TrainingDomain, DomainMeta> = {
  abstraction: {
    domain: 'abstraction',
    appId: 'visual-abstraction',
    title: '视知觉概括',
    subTitle: 'Visual Abstraction',
    homeTitle: '视知觉概括 (Visual Abstraction)',
    homeDesc:
      '过滤视觉噪点，双向训练动态势线提取、极简几何大形、素描黑白灰大关系与调性基底的本质提炼与透视匹配能力。',
    themeColor: 'indigo',
    icon: Eye,
    hasWeaknessAnalytics: false,
    get cards() {
      return getCardsByDomain('abstraction');
    },
  },
  star: {
    domain: 'star',
    appId: 'star-hopping',
    title: '寻星练习',
    subTitle: 'Star-Hopping',
    homeTitle: '寻星练习 (Star-Hopping)',
    homeDesc:
      '基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。',
    themeColor: 'indigo',
    icon: Compass,
    hasWeaknessAnalytics: true,
    get cards() {
      return getCardsByDomain('star');
    },
  },
  color: {
    domain: 'color',
    appId: 'color-sense',
    title: '色感训练',
    subTitle: 'Color Recognition',
    homeTitle: '绝对色感 (Color Recognition)',
    homeDesc:
      '拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation) 的分级递进识别，全面建立微小色彩差异感知力。',
    themeColor: 'amber',
    icon: Palette,
    hasWeaknessAnalytics: true,
    get cards() {
      return getCardsByDomain('color');
    },
  },
  relative_color: {
    domain: 'relative_color',
    appId: 'relative-color',
    title: '相对色感',
    subTitle: 'Relative Color',
    homeTitle: '相对色感 (Relative Color Perception)',
    homeDesc:
      '基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。',
    themeColor: 'purple',
    icon: Shuffle,
    hasWeaknessAnalytics: true,
    get cards() {
      return getCardsByDomain('relative_color');
    },
  },
  negative_space: {
    domain: 'negative_space',
    appId: 'negative-space',
    title: '正负形感知',
    subTitle: 'Negative Space',
    homeTitle: '正负形空间感知 (Negative Space)',
    homeDesc:
      '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
    hasWeaknessAnalytics: true,
    get cards() {
      return getCardsByDomain('negative_space');
    },
  },
};
~~~~~

### 下一步建议
重新执行 `npm run dev` 验证启动，确认 5 个领域的看板和卡片均能正常加载与运行。

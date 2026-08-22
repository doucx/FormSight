现在我们将执行**纯化重构（Domain 脱落与 Pack 规范全量收敛）**。

我们将统一把所有卡包收敛为纯粹的 `PackManifest` 规范，从 `CardDefinition`、`TrainingPlugin` 及应用层完全剥离 `card.domain`，移除遗留的 `GenericDashboard` 和 `DashboardShell` 组件，并将 `ModeCard` 归位至 `src/components/common/` 目录下。

## [WIP] refactor: 纯化本体架构，全面脱落 domain 遗留字段并统一 PackManifest 规范

### 用户需求
执行架构纯化重构：
1. 废除 `DomainManifest` 与 `DomainMeta`，全面收敛至 `PackManifest` 与 `PackMeta`。
2. 从 `CardDefinition`、`TrainingPlugin` 与上层视图中移除 `card.domain` 约束，卡片分类与发现完全由 `packId` 与三维 `tags` 接管。
3. 清理已废弃的领域看板组件 (`GenericDashboard.tsx`、`DashboardShell.tsx`、`src/config/domains.ts`)，并将 `ModeCard.tsx` 移至 `src/components/common/`。
4. 全量重构 7 大扩展包（`star`, `color`, `relative_color`, `negative_space`, `abstraction`, `concretization`, `angle`）的清单导出与卡片定义。

### 评论
这是 FormSight v0.4.x 演进路线图中的关键纯化步骤。随着大盘发现中心 (`Home.tsx` + `<FilterEngine />`) 的全面投产，废弃树状单向绑定的 `domain` 字段不仅消除了类型约束带来的硬编码瓶颈，更让未来任意新扩展包（如立体几何透视包、动态素描包）的接入实现真正的“零配置即插即用”。

### 目标
1. 统一 `src/core/contracts.ts`，仅保留 `PackManifest` 契约定义。
2. 更新 `src/types/card.ts`，移除 `domain`，使 `packId` 成为卡片的固有包归属标识。
3. 重构 `src/core/registry.ts`，移除 `domains` 映射及 `by-domain` 遗留查询接口，全力支持基于 `packId` 与标签矩阵的检索。
4. 移动并重构 `ModeCard.tsx` 至 `src/components/common/`，删除废弃看板及 `src/config/domains.ts`。
5. 更新 7 大 Pack 的入口文件 (`index.ts`) 与插件实现 (`plugin.tsx`)。
6. 调整底层数据库仓储层 (`schema.ts`, `queries.ts`, `repository.ts`, `importExport.ts`) 及训练视图。

### 基本原理
- **本体纯化**：将内容组织单元由互斥的 `Domain` 转换为扁平组合式的 `Pack`，卡片与训练流完全通过 `tags: { target, skill, interaction }` 进行语义关联。
- **数据解耦**：所有数据表主键（能力档案、日聚合、答题记录）均已建立在 `cardId` 基础之上，将 `schema.ts` 中的 `TrainingDomain` 泛化为字符串，保证存量历史数据平滑兼容的同时解耦上层业务逻辑。

### 标签
#intent/refine #flow/ready #priority/high
#comp/runtime #comp/interfaces #comp/ui #scope/core #scope/api
#ai/instruct
#task/domain/core #task/object/pack-manifest-refactor #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 移动 ModeCard 并删除废弃的 Dashboard 遗留文件

~~~~~act
move_file
src/components/dashboard/ModeCard.tsx
src/components/common/ModeCard.tsx
~~~~~

~~~~~act
delete_file
src/components/dashboard/GenericDashboard.tsx
~~~~~

~~~~~act
delete_file
src/components/dashboard/DashboardShell.tsx
~~~~~

~~~~~act
delete_file
src/config/domains.ts
~~~~~

#### Acts 2: 更新核心契约接口与类型定义

~~~~~act
write_file
src/types/card.ts
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { SettingFieldSchema } from '../components/settings/DynamicDomainSettings';

export type SensoryTargetTag =
  | 'geometry'
  | 'color'
  | 'relative_color'
  | 'negative_space'
  | 'abstraction'
  | 'concretization'
  | 'angle';

export type CognitiveSkillTag =
  | 'spatial_orientation'
  | 'color_fidelity'
  | 'illusion_invariance'
  | 'proportion'
  | 'visual_memory'
  | 'abstraction'
  | 'gesture_flow'
  | 'notan_grouping';

export type InteractionTag = 'continuous_slider' | 'point_click' | 'choice_2afc' | 'choice_nafc';

export interface CardTags {
  target: SensoryTargetTag[];
  skill: CognitiveSkillTag[];
  interaction: InteractionTag[];
}

export interface CardDefinition {
  id: string;
  packId: string;
  mode: string;
  title: string;
  desc: string;
  instruction?: string;
  icon: (props: { className?: string }) => ComponentChildren;
  tags: CardTags;
  hasWeaknessAnalytics?: boolean;
  settingSchemas?: SettingFieldSchema[];
  isExperimental?: boolean;
}

export interface PackMeta {
  id: string;
  title: string;
  subTitle?: string;
  desc: string;
  version?: string;
  author?: string;
  themeColor?: 'indigo' | 'amber' | 'purple' | 'emerald';
  icon?: (props: { className?: string }) => ComponentChildren;
}

export interface CardQueryOptions {
  packId?: string;
  targets?: SensoryTargetTag[];
  skills?: CognitiveSkillTag[];
  interactions?: InteractionTag[];
  includeExperimental?: boolean;
  searchKeyword?: string;
}
~~~~~

~~~~~act
write_file
src/config/trainingPlugins.tsx
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { Point } from '../types';
import type {
  AbstractionSettings,
  BaseModuleSettings,
  ColorSenseSettings,
  NegativeSpaceSettings,
  RelativeColorSettings,
  StarSettings,
} from '../utils/settings';

export interface TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings> {
  question: TQuestion;
  showAnswer: boolean;
  userAnswer: THitResult | null;
  onAnswer: (val: TAnswerVal) => void;
  disabled: boolean;
  isIdle: boolean;
  settings: TSettings;
}

export interface TrainingPlugin<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  packId?: string;
  title: string;
  getModeBadge: (mode: string) => string;
  isTargeting?: (mode: string, settings: TSettings) => boolean;
  generateQuestion: (mode: string, level: number, settings: TSettings) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion, mode: string) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  getQuestionLevel: (question: TQuestion) => number;
  extractRecordDetails: (
    question: TQuestion,
    hitResult: THitResult,
    userVal: TAnswerVal,
    mode: string,
  ) => Record<string, unknown>;
  renderCanvas: (
    props: TrainingCanvasProps<TQuestion, THitResult, TAnswerVal, TSettings>,
  ) => ComponentChildren;
}

export type StarPlugin = TrainingPlugin<
  unknown,
  unknown,
  { clickPoint: Point; hitResult: unknown },
  StarSettings
>;

export type ColorPlugin = TrainingPlugin<
  unknown,
  unknown,
  number | [number, number, number],
  ColorSenseSettings
>;

export type RelativeColorPlugin = TrainingPlugin<
  unknown,
  unknown,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
>;

export type NegativeSpacePlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
>;

export type AbstractionPlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B',
  AbstractionSettings
>;

export type AnglePlugin = TrainingPlugin<
  unknown,
  unknown,
  number | 'A' | 'B',
  BaseModuleSettings
>;

export type AnyDomainPlugin =
  | StarPlugin
  | ColorPlugin
  | RelativeColorPlugin
  | NegativeSpacePlugin
  | AbstractionPlugin
  | AnglePlugin;

export type AnyTrainingPlugin = TrainingPlugin;
~~~~~

~~~~~act
write_file
src/core/contracts.ts
~~~~~
~~~~~typescript
import type { ComponentChildren } from 'preact';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type { CardDefinition, PackMeta } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db/schema';
import type { BaseModuleSettings } from '../utils/settings';

export interface CardAnalyticsView<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  id: string;
  tabLabel: string;
  title: string;
  subTitle: string;
  icon?: (props: { className?: string }) => ComponentChildren;
  renderVisualizer: (canvas: HTMLCanvasElement, records: TRecord[]) => void;
  renderDiagnostics: (records: TRecord[]) => ComponentChildren;
  getOverallStats?: (records: TRecord[]) => {
    accuracy: number;
    total: number;
    customSummary?: ComponentChildren;
  };
}

export interface CardAnalyticsPlugin<TRecord extends UnifiedTrialRecord = UnifiedTrialRecord> {
  cardId: string;
  fetchRecords: (cardId: string) => Promise<TRecord[]>;
  views: CardAnalyticsView<TRecord>[];
}

/**
 * 扩展包清单 (Pack Manifest)
 * v0.4.x 核心插件规范：任何独立内容扩展包（Pack）均遵循此清单
 */
export interface PackManifest {
  packId: string;
  meta: PackMeta;
  cards: CardDefinition[];
  trainingPlugin: AnyTrainingPlugin;
  analyticsPlugins?: Record<string, CardAnalyticsPlugin>;
  defaultCardSettings?: Record<string, Partial<BaseModuleSettings>>;
}

export type AnyManifest = PackManifest;
~~~~~

~~~~~act
write_file
src/core/registry.ts
~~~~~
~~~~~typescript
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type {
  CardDefinition,
  CardQueryOptions,
  CognitiveSkillTag,
  InteractionTag,
  PackMeta,
  SensoryTargetTag,
} from '../types/card';
import type { CardAnalyticsPlugin, PackManifest } from './contracts';

class InvertedCardIndex {
  private targetMap = new Map<SensoryTargetTag, Set<string>>();
  private skillMap = new Map<CognitiveSkillTag, Set<string>>();
  private interactionMap = new Map<InteractionTag, Set<string>>();
  private packMap = new Map<string, Set<string>>();

  public clear(): void {
    this.targetMap.clear();
    this.skillMap.clear();
    this.interactionMap.clear();
    this.packMap.clear();
  }

  public indexCard(card: CardDefinition): void {
    const id = card.id;

    if (card.packId) {
      let set = this.packMap.get(card.packId);
      if (!set) {
        set = new Set();
        this.packMap.set(card.packId, set);
      }
      set.add(id);
    }

    if (card.tags) {
      for (const t of card.tags.target || []) {
        let set = this.targetMap.get(t);
        if (!set) {
          set = new Set();
          this.targetMap.set(t, set);
        }
        set.add(id);
      }

      for (const s of card.tags.skill || []) {
        let set = this.skillMap.get(s);
        if (!set) {
          set = new Set();
          this.skillMap.set(s, set);
        }
        set.add(id);
      }

      for (const i of card.tags.interaction || []) {
        let set = this.interactionMap.get(i);
        if (!set) {
          set = new Set();
          this.interactionMap.set(i, set);
        }
        set.add(id);
      }
    }
  }

  public getCardIdsByTarget(target: SensoryTargetTag): Set<string> {
    return this.targetMap.get(target) || new Set();
  }

  public getCardIdsBySkill(skill: CognitiveSkillTag): Set<string> {
    return this.skillMap.get(skill) || new Set();
  }

  public getCardIdsByInteraction(interaction: InteractionTag): Set<string> {
    return this.interactionMap.get(interaction) || new Set();
  }

  public getCardIdsByPack(packId: string): Set<string> {
    return this.packMap.get(packId) || new Set();
  }
}

class SystemDomainRegistry {
  private packs = new Map<string, PackManifest>();
  private cardMap = new Map<string, CardDefinition>();
  private cardPluginMap = new Map<string, AnyTrainingPlugin>();
  private cardAnalyticsMap = new Map<string, CardAnalyticsPlugin>();
  private invertedIndex = new InvertedCardIndex();

  constructor() {
    this.autoDiscover();
  }

  /**
   * 自动扫描 src/packs/*\/index.ts 零配置注册
   */
  private autoDiscover(): void {
    const packModules = import.meta.glob<{ default: PackManifest }>('../packs/*/index.ts', {
      eager: true,
    });

    for (const path in packModules) {
      const manifest = packModules[path]?.default;
      if (manifest) this.register(manifest);
    }
  }

  public register(manifest: PackManifest): void {
    this.packs.set(manifest.packId, manifest);

    for (const card of manifest.cards) {
      const normalizedCard: CardDefinition = {
        ...card,
        packId: manifest.packId,
      };

      this.cardMap.set(card.id, normalizedCard);
      this.cardPluginMap.set(card.id, manifest.trainingPlugin);
      this.invertedIndex.indexCard(normalizedCard);
    }

    if (manifest.analyticsPlugins) {
      for (const [cardId, plugin] of Object.entries(manifest.analyticsPlugins)) {
        this.cardAnalyticsMap.set(cardId, plugin);
      }
    }
  }

  /**
   * 基于倒排索引的高性能多维条件卡片查询
   */
  public queryCards(options: CardQueryOptions = {}): CardDefinition[] {
    let candidateIds: Set<string> | null = null;

    const intersect = (set: Set<string>) => {
      if (candidateIds === null) {
        candidateIds = new Set(set);
      } else {
        const next = new Set<string>();
        for (const id of candidateIds) {
          if (set.has(id)) next.add(id);
        }
        candidateIds = next;
      }
    };

    if (options.packId) {
      intersect(this.invertedIndex.getCardIdsByPack(options.packId));
    }

    if (options.targets && options.targets.length > 0) {
      const targetUnion = new Set<string>();
      for (const t of options.targets) {
        for (const id of this.invertedIndex.getCardIdsByTarget(t)) {
          targetUnion.add(id);
        }
      }
      intersect(targetUnion);
    }

    if (options.skills && options.skills.length > 0) {
      const skillUnion = new Set<string>();
      for (const s of options.skills) {
        for (const id of this.invertedIndex.getCardIdsBySkill(s)) {
          skillUnion.add(id);
        }
      }
      intersect(skillUnion);
    }

    if (options.interactions && options.interactions.length > 0) {
      const interactionUnion = new Set<string>();
      for (const i of options.interactions) {
        for (const id of this.invertedIndex.getCardIdsByInteraction(i)) {
          interactionUnion.add(id);
        }
      }
      intersect(interactionUnion);
    }

    const idsToFilter =
      candidateIds === null ? Array.from(this.cardMap.keys()) : Array.from(candidateIds);
    let results = idsToFilter
      .map((id) => this.cardMap.get(id))
      .filter((card): card is CardDefinition => Boolean(card));

    if (!options.includeExperimental) {
      results = results.filter((c) => !c.isExperimental);
    }

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

    return results;
  }

  // === Pack 访问接口 ===
  public getAllPacks(): PackManifest[] {
    return Array.from(this.packs.values());
  }

  public getPack(packId: string): PackManifest | undefined {
    return this.packs.get(packId);
  }

  public getAllPackMetas(): PackMeta[] {
    return Array.from(this.packs.values()).map((p) => p.meta);
  }

  // === 卡片直查接口 ===
  public getAllCards(): CardDefinition[] {
    return Array.from(this.cardMap.values());
  }

  public getCardById(cardId: string): CardDefinition | undefined {
    return this.cardMap.get(cardId);
  }

  public getPluginByCardId(cardId: string): AnyTrainingPlugin | undefined {
    return this.cardPluginMap.get(cardId);
  }

  public getAnalyticsPluginByCardId(cardId: string): CardAnalyticsPlugin | undefined {
    return this.cardAnalyticsMap.get(cardId);
  }
}

export const registry = new SystemDomainRegistry();
~~~~~

#### Acts 3: 纯化 7 大扩展包入口与插件实现

~~~~~act
write_file
src/packs/star/index.ts
~~~~~
~~~~~typescript
import { Compass, Crosshair, RotateCw, Target } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { createStarAnalyticsPlugin } from './analytics';
import { starPlugin } from './plugin';

export const STAR_SECTORS = [
  '正东(0°)',
  '东北(45°)',
  '正北(90°)',
  '西北(135°)',
  '正西(180°)',
  '西南(225°)',
  '正南(270°)',
  '东南(315°)',
];

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

export const starCards: CardDefinition[] = [
  {
    id: 'star_single',
    packId: 'star',
    mode: 'single',
    title: '单锚点模式',
    desc: '单一中心锚点，评估基本极坐标方位与距离感知力',
    instruction: '观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位',
    icon: Target,
    tags: {
      target: ['geometry'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_h',
    packId: 'star',
    mode: 'double_h',
    title: '水平双锚点',
    desc: '水平线段两端锚点，评估两点比例与正交投影判定力',
    instruction: '观察左侧水平双锚点几何关系，在右侧点阵中盲打定位',
    icon: Crosshair,
    tags: {
      target: ['geometry'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
  {
    id: 'star_double_r',
    packId: 'star',
    mode: 'double_r',
    title: '旋转双锚点',
    desc: '带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力',
    instruction: '观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位',
    icon: RotateCw,
    tags: {
      target: ['geometry'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: STAR_SCHEMAS,
  },
];

export const starPack: PackManifest = {
  packId: 'star',
  meta: {
    id: 'star',
    title: '寻星练习',
    subTitle: 'Star-Hopping',
    desc: '基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。',
    themeColor: 'indigo',
    icon: Compass,
  },
  cards: starCards,
  trainingPlugin: starPlugin,
  analyticsPlugins: {
    star_single: createStarAnalyticsPlugin('star_single', '单锚点'),
    star_double_h: createStarAnalyticsPlugin('star_double_h', '水平双锚点'),
    star_double_r: createStarAnalyticsPlugin('star_double_r', '旋转双锚点'),
  },
};

export default starPack;
~~~~~

~~~~~act
patch_file
src/packs/star/plugin.tsx
~~~~~
~~~~~typescript.old
export const starPlugin: TrainingPlugin<
  QuestionData,
  HitResult,
  { clickPoint: Point; hitResult: HitResult },
  StarSettings
> = {
  domain: 'star',
  title: '寻星练习',
~~~~~
~~~~~typescript.new
export const starPlugin: TrainingPlugin<
  QuestionData,
  HitResult,
  { clickPoint: Point; hitResult: HitResult },
  StarSettings
> = {
  packId: 'star',
  title: '寻星练习',
~~~~~

~~~~~act
write_file
src/packs/color/index.ts
~~~~~
~~~~~typescript
import { Droplet, Palette, RotateCw, Sun } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { colorHueAnalyticsPlugin } from './analytics';
import { colorPlugin } from './plugin';

export const COLOR_SECTORS = [
  '红 (0°-30°)',
  '橙 (30°-60°)',
  '黄 (60°-90°)',
  '黄绿 (90°-120°)',
  '绿 (120°-150°)',
  '青绿 (150°-180°)',
  '青 (180°-210°)',
  '蓝 (210°-240°)',
  '蓝紫 (240°-270°)',
  '紫 (270°-300°)',
  '品红 (300°-330°)',
  '紫红 (330°-360°)',
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

export const colorCards: CardDefinition[] = [
  {
    id: 'color_hue',
    packId: 'color',
    mode: 'H',
    title: '色相 (Hue)',
    desc: '识别颜色在色相环上的具体角度 (0°~360°)',
    instruction: '定位上方色块在 360° 色相环上的精准角度',
    icon: RotateCw,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: HUE_SCHEMAS,
  },
  {
    id: 'color_val',
    packId: 'color',
    mode: 'V',
    title: '明度 (Value)',
    desc: '已知色相，评估颜色的素描明暗程度 (0%~100%)',
    instruction: '评估上方色块的素描明度深浅比例 (0%~100%)',
    icon: Sun,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_sat',
    packId: 'color',
    mode: 'S',
    title: '饱和度 (Sat)',
    desc: '已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)',
    instruction: '评估上方色块的鲜艳纯度比例 (0%~100%)',
    icon: Droplet,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'color_all',
    packId: 'color',
    mode: 'ALL',
    title: '综合拾色 (Match)',
    desc: '同时调整色相、饱和度与明度，逼近真理色彩',
    instruction: '同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色',
    icon: Palette,
    tags: {
      target: ['color'],
      skill: ['color_fidelity'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: COLOR_ALL_SCHEMAS,
  },
];

export const colorPack: PackManifest = {
  packId: 'color',
  meta: {
    id: 'color',
    title: '绝对色感',
    subTitle: 'Color Recognition',
    desc: '拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation) 的分级递进识别，全面建立微小色彩差异感知力。',
    themeColor: 'amber',
    icon: Palette,
  },
  cards: colorCards,
  trainingPlugin: colorPlugin,
  analyticsPlugins: {
    color_hue: colorHueAnalyticsPlugin,
  },
};

export default colorPack;
~~~~~

~~~~~act
patch_file
src/packs/color/plugin.tsx
~~~~~
~~~~~typescript.old
export const colorPlugin: TrainingPlugin<
  ColorQuestionData,
  ColorHitResult,
  number | [number, number, number],
  ColorSenseSettings
> = {
  domain: 'color',
  title: '色感训练',
~~~~~
~~~~~typescript.new
export const colorPlugin: TrainingPlugin<
  ColorQuestionData,
  ColorHitResult,
  number | [number, number, number],
  ColorSenseSettings
> = {
  packId: 'color',
  title: '色感训练',
~~~~~

~~~~~act
write_file
src/packs/relative_color/index.ts
~~~~~
~~~~~typescript
import { Columns, Palette, Shuffle, Sun } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { relativeColorPlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const relativeColorCards: CardDefinition[] = [
  {
    id: 'rel_vector_shift',
    packId: 'relative_color',
    mode: 'VECTOR_SHIFT',
    title: '色彩矢量迁移',
    desc: '保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。',
    instruction: '观察上方 A➔B 色彩推移，在下方候选项中找出符合 C➔D 的同向推移色',
    icon: Shuffle,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_lightness_induction',
    packId: 'relative_color',
    mode: 'LIGHTNESS_INDUCTION',
    title: '明度反差补偿',
    desc: '在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。',
    instruction: '调节右侧中心色块明度，使左右两块在不同背景下「视觉感知看起来完全一致」',
    icon: Sun,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'rel_hue_induction',
    packId: 'relative_color',
    mode: 'HUE_INDUCTION',
    title: '补色残像调和',
    desc: '在强色相与饱和度背景下，四选一选出逆向补偿后的目标色，训练环境光色感知调和力。',
    instruction: '观察左侧强色相背景下的基准色，选出右侧达成感知一致的补偿色 (键 1-4)',
    icon: Palette,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'rel_decontextual_2afc',
    packId: 'relative_color',
    mode: 'DECONTEXTUAL_2AFC',
    title: '环境穿透判别',
    desc: '穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。',
    instruction: '穿透背景视错觉干扰，二选一判别哪一侧中心色块「客观物理明度更高」',
    icon: Columns,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const relativeColorPack: PackManifest = {
  packId: 'relative_color',
  meta: {
    id: 'relative_color',
    title: '相对色感',
    subTitle: 'Relative Color Perception',
    desc: '基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。',
    themeColor: 'purple',
    icon: Shuffle,
  },
  cards: relativeColorCards,
  trainingPlugin: relativeColorPlugin,
};

export default relativeColorPack;
~~~~~

~~~~~act
patch_file
src/packs/relative_color/plugin.tsx
~~~~~
~~~~~typescript.old
export const relativeColorPlugin: TrainingPlugin<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
> = {
  domain: 'relative_color',
  title: '相对色感',
~~~~~
~~~~~typescript.new
export const relativeColorPlugin: TrainingPlugin<
  RelativeColorQuestionData,
  RelativeColorHitResult,
  [number, number, number] | 'A' | 'B',
  RelativeColorSettings
> = {
  packId: 'relative_color',
  title: '相对色感',
~~~~~

~~~~~act
write_file
src/packs/negative_space/index.ts
~~~~~
~~~~~typescript
import { Columns, Crosshair, Maximize2, Sparkles } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { negRatioAnalyticsPlugin } from './analytics';
import { negativeSpacePlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const negativeSpaceCards: CardDefinition[] = [
  {
    id: 'neg_ratio_estimation',
    packId: 'negative_space',
    mode: 'RATIO_ESTIMATION',
    title: '负形占比滑块评估',
    desc: '估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。',
    instruction: '估计黑色主体周围的白色留白（负形）占画面总面积的百分比',
    icon: Maximize2,
    tags: {
      target: ['negative_space'],
      skill: ['proportion'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'neg_area_comparison_2afc',
    packId: 'negative_space',
    mode: 'AREA_COMPARISON_2AFC',
    title: '负形面积二分判别',
    desc: '快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。',
    instruction: '二选一判别哪一侧画面的白色留白（负形）面积更大',
    icon: Columns,
    tags: {
      target: ['negative_space'],
      skill: ['proportion', 'spatial_orientation'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_vertex_fitting',
    packId: 'negative_space',
    mode: 'NEGATIVE_VERTEX_FITTING',
    title: '负形边界反切定点',
    desc: '观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。',
    instruction: '观察左侧完整参考的负形挤压轮廓，在右侧点阵中点击定位被截断的正形顶点',
    icon: Crosshair,
    tags: {
      target: ['negative_space'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'neg_shape_match_2afc',
    packId: 'negative_space',
    mode: 'SHAPE_MATCH_2AFC',
    title: '负形轮廓记忆匹配',
    desc: '瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。',
    instruction: '瞬时记忆负形空隙轮廓特征，在候选区二选一选出完全相同的形状',
    icon: Sparkles,
    tags: {
      target: ['negative_space'],
      skill: ['visual_memory', 'spatial_orientation'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const negativeSpacePack: PackManifest = {
  packId: 'negative_space',
  meta: {
    id: 'negative_space',
    title: '正负形空间感知',
    subTitle: 'Negative Space',
    desc: '切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。',
    themeColor: 'emerald',
    icon: Maximize2,
  },
  cards: negativeSpaceCards,
  trainingPlugin: negativeSpacePlugin,
  analyticsPlugins: {
    neg_ratio_estimation: negRatioAnalyticsPlugin,
  },
};

export default negativeSpacePack;
~~~~~

~~~~~act
patch_file
src/packs/negative_space/plugin.tsx
~~~~~
~~~~~typescript.old
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
> = {
  domain: 'negative_space',
  title: '正负形感知',
~~~~~
~~~~~typescript.new
export const negativeSpacePlugin: TrainingPlugin<
  NegativeSpaceQuestionData,
  NegativeSpaceHitResult,
  number | 'A' | 'B' | Point,
  NegativeSpaceSettings
> = {
  packId: 'negative_space',
  title: '正负形感知',
~~~~~

~~~~~act
write_file
src/packs/abstraction/index.ts
~~~~~
~~~~~typescript
import { Eye, Maximize2, Palette, RotateCw, Sun } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { abstractionPlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const abstractionCards: CardDefinition[] = [
  {
    id: 'abs_gesture_axis',
    packId: 'abstraction',
    mode: 'GESTURE_AXIS',
    title: '动态势线提取',
    desc: '从离散散点流向中提取第一主成分 PCA 势线角度，建立画面主导动势感知力。',
    instruction: '旋转调节主轴，对齐粒子群的主动态流向 (0°~180°)',
    icon: RotateCw,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'gesture_flow'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_polygon_decimation',
    packId: 'abstraction',
    mode: 'POLYGON_DECIMATION',
    title: '折线低模大形',
    desc: '从细碎繁复轮廓中穿透高频噪波，识别出其底层的最优关键折线大形框架。',
    instruction: '观察左侧细碎多边形，选择右侧保留了关键折线大形的概括项',
    icon: Maximize2,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_notan_threshold',
    packId: 'abstraction',
    mode: 'NOTAN_THRESHOLD',
    title: '黑白素描归组',
    desc: '调节二值化明度剪切阈值，过滤杂乱中间调，压榨出最坚固的 Notan 黑白大关系。',
    instruction: '调节二值化阈值滑块，达成黑白咬合最平衡的 Notan 状态',
    icon: Sun,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'abs_palette_clustering',
    packId: 'abstraction',
    mode: 'PALETTE_CLUSTERING',
    title: '主调色群提炼',
    desc: '穿透多色拼贴马赛克的混色噪点，四选一提炼出面积加权下的加权质心主色。',
    instruction: '在下方 4 个候选项中，选出代表画面全局主调的加权主色',
    icon: Palette,
    tags: {
      target: ['abstraction'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const abstractionPack: PackManifest = {
  packId: 'abstraction',
  meta: {
    id: 'abstraction',
    title: '概括感知',
    subTitle: 'Visual Abstraction',
    desc: '自底向上过滤繁琐细节，训练对动态势线、极简低模折线、素描黑白块面与加权主调的本质提炼能力。',
    themeColor: 'indigo',
    icon: Eye,
  },
  cards: abstractionCards,
  trainingPlugin: abstractionPlugin,
};

export default abstractionPack;
~~~~~

~~~~~act
patch_file
src/packs/abstraction/plugin.tsx
~~~~~
~~~~~typescript.old
export const abstractionPlugin: TrainingPlugin<
  AbstractionQuestionData,
  AbstractionHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  domain: 'abstraction',
  title: '视知觉概括',
~~~~~
~~~~~typescript.new
export const abstractionPlugin: TrainingPlugin<
  AbstractionQuestionData,
  AbstractionHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  packId: 'abstraction',
  title: '视知觉概括',
~~~~~

~~~~~act
write_file
src/packs/concretization/index.ts
~~~~~
~~~~~typescript
import { Columns, Droplet, Layers, Shuffle, Sparkles } from 'lucide-preact';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { abstractionPlugin } from '../abstraction/plugin';

export const concretizationCards: CardDefinition[] = [
  {
    id: 'abs_td_gesture_2afc',
    packId: 'concretization',
    mode: 'TD_GESTURE_2AFC',
    title: '动态势线寻源',
    desc: '给定抽象势线骨架，在两幅复杂点阵中透视判别谁长在该动势中 (2AFC)。',
    instruction: '观察上方提炼的势线骨架，判别哪侧复杂点阵符合该动势',
    icon: Shuffle,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'gesture_flow'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_hull_2afc',
    packId: 'concretization',
    mode: 'TD_HULL_2AFC',
    title: '几何大模寻形',
    desc: '给定极简低模多边形，在两个高细碎剪影中二选一辨识其具象原形 (2AFC)。',
    instruction: '观察上方极简低模外壳，二选一辨识哪侧剪影符合该大形',
    icon: Columns,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_notan_2afc',
    packId: 'concretization',
    mode: 'TD_NOTAN_2AFC',
    title: '黑白素描骨架',
    desc: '给定二值 Notan 剪影，透视辨识哪幅丰富灰阶素描拥有该黑白大结构 (2AFC)。',
    instruction: '观察上方 Notan 剪影，判别哪侧复杂画面拥有该黑白大结构',
    icon: Droplet,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'notan_grouping'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'abs_td_palette_2afc',
    packId: 'concretization',
    mode: 'TD_PALETTE_2AFC',
    title: '调性基底归位',
    desc: '给定抽象基准主调色，在四幅复杂混色拼贴图案中选出以此为基调的画面 (4AFC)。',
    instruction: '观察上方基准主调色，选出以此为色彩基底的拼贴画面',
    icon: Sparkles,
    tags: {
      target: ['concretization'],
      skill: ['abstraction', 'color_fidelity'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const concretizationPack: PackManifest = {
  packId: 'concretization',
  meta: {
    id: 'concretization',
    title: '细化感知',
    subTitle: 'Visual Refinement',
    desc: '自顶向下透视具象细节，训练基于势线骨架、几何大形、Notan 构图与调性基底在丰富画面中寻源辨识的能力。',
    themeColor: 'purple',
    icon: Layers,
  },
  cards: concretizationCards,
  trainingPlugin: abstractionPlugin,
};

export default concretizationPack;
~~~~~

~~~~~act
write_file
src/packs/angle/index.ts
~~~~~
~~~~~typescript
import { Columns, Compass, Split } from 'lucide-preact';
import type { SettingFieldSchema } from '../../components/settings/DynamicDomainSettings';
import type { PackManifest } from '../../core/contracts';
import type { CardDefinition } from '../../types/card';
import { anglePlugin } from './plugin';

const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: '显示滑块容错感应区',
    description: '在悬停光标两侧实时显示动态容错区间',
  },
];

export const angleCards: CardDefinition[] = [
  {
    id: 'angle_estimation',
    packId: 'angle',
    mode: 'ANGLE_ESTIMATION',
    title: '夹角大小估算',
    desc: '观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。',
    instruction: '观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)',
    icon: Compass,
    tags: {
      target: ['geometry', 'angle'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'angle_comparison_2afc',
    packId: 'angle',
    mode: 'ANGLE_COMPARISON_2AFC',
    title: '角度二分对比',
    desc: '在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。',
    instruction: '二选一快速判别哪一侧夹角更大 (键 1 / 2)',
    icon: Columns,
    tags: {
      target: ['geometry', 'angle'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'angle_parallel_2afc',
    packId: 'angle',
    mode: 'PARALLEL_ALIGNMENT_2AFC',
    title: '平行线基准辨识',
    desc: '观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。',
    instruction: '观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)',
    icon: Split,
    tags: {
      target: ['geometry', 'angle'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
  },
];

export const anglePack: PackManifest = {
  packId: 'angle',
  meta: {
    id: 'angle',
    title: '角度感知',
    subTitle: 'Angle Perception',
    desc: '以极简白底黑线剥离干扰，通过夹角大小估算、微小角度二分对比与平行线对偶辨识，构建坚实的正负形起形与角度感知直觉。',
    themeColor: 'indigo',
    icon: Compass,
  },
  cards: angleCards,
  trainingPlugin: anglePlugin,
};

export default anglePack;
~~~~~

~~~~~act
patch_file
src/packs/angle/plugin.tsx
~~~~~
~~~~~typescript.old
export const anglePlugin: TrainingPlugin<
  AngleQuestionData,
  AngleHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  domain: 'angle',
  title: '角度感知',
~~~~~
~~~~~typescript.new
export const anglePlugin: TrainingPlugin<
  AngleQuestionData,
  AngleHitResult,
  number | 'A' | 'B',
  BaseModuleSettings
> = {
  packId: 'angle',
  title: '角度感知',
~~~~~

#### Acts 4: 更新数据库层与仓储层

~~~~~act
write_file
src/utils/db/schema.ts
~~~~~
~~~~~typescript
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

export type TrainingDomain = string;

export interface UnifiedSessionData {
  id: string;
  cardId: string;
  domain?: string;
  mode: string;
  type: 'training' | 'benchmark';
  startTimestamp: number;
  endTimestamp?: number;
  totalTrials: number;
  hitTrials: number;
  startLevel: number;
  endLevel: number;
}

export interface UnifiedTrialRecord {
  id: string;
  sessionId: string;
  cardId: string;
  domain?: string;
  mode: string;
  timestamp: number;
  difficultyLevel: number;
  isHit: boolean;
  responseTimeMs: number;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UnifiedProfileData {
  cardId: string;
  domain?: string;
  mode: string;
  currentLevel: number;
  bestLevel: number;
  totalTrials: number;
  totalHits: number;
  updatedAt: number;
}

/**
 * 每日卡片级聚合统计物化视图数据模型
 */
export interface DailySummaryData {
  id: string; // 格式: `${date}_${cardId}` (例如 '2026-08-22_star_single')
  date: string; // 本地日期 'YYYY-MM-DD'
  cardId: string;
  domain?: string;
  mode: string;
  totalCount: number;
  hitCount: number;
  totalTimeMs: number;
  maxLevel: number;
  minLevel: number;
  lastLevel: number;
  updatedAt: number;
}

export interface FormSightDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: UnifiedSessionData;
    indexes: {
      'by-card': string;
      'by-domain': string;
      'by-domain-mode': [string, string];
    };
  };
  records: {
    key: string;
    value: UnifiedTrialRecord;
    indexes: {
      'by-card': string;
      'by-session': string;
      'by-domain': string;
      'by-domain-mode': [string, string];
      'by-mode': string;
      'by-card-timestamp': [string, number];
      'by-timestamp': number;
    };
  };
  daily_summaries: {
    key: string;
    value: DailySummaryData;
    indexes: {
      'by-date': string;
      'by-card': string;
      'by-domain': string;
      'by-date-card': [string, string];
      'by-date-domain': [string, string];
    };
  };
  user_profiles: {
    key: string;
    value: UnifiedProfileData;
    indexes: {
      'by-domain': string;
    };
  };
}

export const DB_NAME = 'FormSightDB';
export const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<FormSightDBSchema>> | null = null;

export function getLocalDateString(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getDB(): Promise<IDBPDatabase<FormSightDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FormSightDBSchema>(DB_NAME, DB_VERSION, {
      async upgrade(database, oldVersion, _newVersion, transaction) {
        // 1. sessions 表
        const sessionsStore = database.objectStoreNames.contains('sessions')
          ? transaction.objectStore('sessions')
          : database.createObjectStore('sessions', { keyPath: 'id' });

        if (!sessionsStore.indexNames.contains('by-card')) {
          sessionsStore.createIndex('by-card', 'cardId');
        }
        if (!sessionsStore.indexNames.contains('by-domain')) {
          sessionsStore.createIndex('by-domain', 'domain');
        }
        if (!sessionsStore.indexNames.contains('by-domain-mode')) {
          sessionsStore.createIndex('by-domain-mode', ['domain', 'mode']);
        }

        // 2. records 表
        const recordsStore = database.objectStoreNames.contains('records')
          ? transaction.objectStore('records')
          : database.createObjectStore('records', { keyPath: 'id' });

        if (!recordsStore.indexNames.contains('by-card')) {
          recordsStore.createIndex('by-card', 'cardId');
        }
        if (!recordsStore.indexNames.contains('by-session')) {
          recordsStore.createIndex('by-session', 'sessionId');
        }
        if (!recordsStore.indexNames.contains('by-domain')) {
          recordsStore.createIndex('by-domain', 'domain');
        }
        if (!recordsStore.indexNames.contains('by-domain-mode')) {
          recordsStore.createIndex('by-domain-mode', ['domain', 'mode']);
        }
        if (!recordsStore.indexNames.contains('by-mode')) {
          recordsStore.createIndex('by-mode', 'mode');
        }
        if (!recordsStore.indexNames.contains('by-card-timestamp')) {
          recordsStore.createIndex('by-card-timestamp', ['cardId', 'timestamp']);
        }
        if (!recordsStore.indexNames.contains('by-timestamp')) {
          recordsStore.createIndex('by-timestamp', 'timestamp');
        }

        // 3. user_profiles 表
        const profilesStore = database.objectStoreNames.contains('user_profiles')
          ? transaction.objectStore('user_profiles')
          : database.createObjectStore('user_profiles', { keyPath: 'cardId' });

        if (!profilesStore.indexNames.contains('by-domain')) {
          profilesStore.createIndex('by-domain', 'domain');
        }

        // 4. daily_summaries 表 (v2 新增物化日聚合)
        const dailyStore = database.objectStoreNames.contains('daily_summaries')
          ? transaction.objectStore('daily_summaries')
          : database.createObjectStore('daily_summaries', { keyPath: 'id' });

        if (!dailyStore.indexNames.contains('by-date')) {
          dailyStore.createIndex('by-date', 'date');
        }
        if (!dailyStore.indexNames.contains('by-card')) {
          dailyStore.createIndex('by-card', 'cardId');
        }
        if (!dailyStore.indexNames.contains('by-domain')) {
          dailyStore.createIndex('by-domain', 'domain');
        }
        if (!dailyStore.indexNames.contains('by-date-card')) {
          dailyStore.createIndex('by-date-card', ['date', 'cardId']);
        }
        if (!dailyStore.indexNames.contains('by-date-domain')) {
          dailyStore.createIndex('by-date-domain', ['date', 'domain']);
        }

        // 5. 存量历史记录迁移：升级时回填已有 records 至 daily_summaries
        if (oldVersion < 2) {
          try {
            const allRecords = await recordsStore.getAll();
            if (allRecords && allRecords.length > 0) {
              const summaryMap = new Map<string, DailySummaryData>();

              for (const r of allRecords) {
                const cardId = r.cardId || r.mode;
                const domain = r.domain || cardId;
                const date = getLocalDateString(r.timestamp);
                const summaryId = `${date}_${cardId}`;
                const respMs = Number(r.responseTimeMs) || 0;
                const level = Number(r.difficultyLevel) || 1;

                const existing = summaryMap.get(summaryId);
                if (!existing) {
                  summaryMap.set(summaryId, {
                    id: summaryId,
                    date,
                    cardId,
                    domain,
                    mode: r.mode,
                    totalCount: 1,
                    hitCount: r.isHit ? 1 : 0,
                    totalTimeMs: respMs,
                    maxLevel: level,
                    minLevel: level,
                    lastLevel: level,
                    updatedAt: r.timestamp,
                  });
                } else {
                  existing.totalCount += 1;
                  if (r.isHit) existing.hitCount += 1;
                  existing.totalTimeMs += respMs;
                  existing.maxLevel = Math.max(existing.maxLevel, level);
                  existing.minLevel = Math.min(existing.minLevel, level);
                  if (r.timestamp >= existing.updatedAt) {
                    existing.lastLevel = level;
                    existing.updatedAt = r.timestamp;
                  }
                }
              }

              for (const summary of summaryMap.values()) {
                await dailyStore.put(summary);
              }
            }
          } catch (e) {
            console.error('Failed to migrate legacy records to daily_summaries:', e);
          }
        }
      },
    });
  }
  return dbPromise;
}
~~~~~

~~~~~act
write_file
src/utils/db/queries.ts
~~~~~
~~~~~typescript
import { registry } from '../../core/registry';
import {
  type DailySummaryData,
  type UnifiedProfileData,
  type UnifiedSessionData,
  type UnifiedTrialRecord,
  getDB,
  getLocalDateString,
} from './schema';

/**
 * 原子化保存单次做答记录并写时累加物化日聚合与能力档案
 */
export async function saveTrialRecord(
  record: UnifiedTrialRecord,
  currentProfileLevel?: number,
): Promise<void> {
  const db = await getDB();
  const cardId = record.cardId || record.mode;
  const canonicalCard = registry.getCardById(cardId);
  const packId = canonicalCard ? canonicalCard.packId : record.domain || 'core';
  const targetProfileLevel = currentProfileLevel ?? record.difficultyLevel;

  const normalizedRecord: UnifiedTrialRecord = {
    ...record,
    cardId,
    domain: packId,
  };

  const dateStr = getLocalDateString(record.timestamp);
  const summaryId = `${dateStr}_${cardId}`;
  const respMs = Number(record.responseTimeMs) || 0;

  // 使用单一读写事务保证原子性
  const tx = db.transaction(['records', 'daily_summaries', 'user_profiles'], 'readwrite');

  // 1. 写入原始答题记录
  await tx.objectStore('records').put(normalizedRecord);

  // 2. 写时物化更新日聚合表 (daily_summaries)
  const dailyStore = tx.objectStore('daily_summaries');
  const existingDaily = await dailyStore.get(summaryId);

  if (!existingDaily) {
    const newSummary: DailySummaryData = {
      id: summaryId,
      date: dateStr,
      cardId,
      domain: packId,
      mode: record.mode,
      totalCount: 1,
      hitCount: record.isHit ? 1 : 0,
      totalTimeMs: respMs,
      maxLevel: targetProfileLevel,
      minLevel: targetProfileLevel,
      lastLevel: targetProfileLevel,
      updatedAt: record.timestamp,
    };
    await dailyStore.put(newSummary);
  } else {
    existingDaily.domain = packId;
    existingDaily.mode = record.mode;
    existingDaily.totalCount += 1;
    if (record.isHit) existingDaily.hitCount += 1;
    existingDaily.totalTimeMs += respMs;
    existingDaily.maxLevel = Math.max(existingDaily.maxLevel, targetProfileLevel);
    existingDaily.minLevel = Math.min(existingDaily.minLevel, targetProfileLevel);
    existingDaily.lastLevel = targetProfileLevel;
    existingDaily.updatedAt = record.timestamp;
    await dailyStore.put(existingDaily);
  }

  // 3. 更新用户能力档案 (user_profiles)
  const profileStore = tx.objectStore('user_profiles');
  const existingProfile = await profileStore.get(cardId);

  if (!existingProfile) {
    const newProfile: UnifiedProfileData = {
      cardId,
      domain: packId,
      mode: record.mode,
      currentLevel: targetProfileLevel,
      bestLevel: targetProfileLevel,
      totalTrials: 1,
      totalHits: record.isHit ? 1 : 0,
      updatedAt: Date.now(),
    };
    await profileStore.put(newProfile);
  } else {
    existingProfile.domain = packId;
    existingProfile.mode = record.mode;
    existingProfile.totalTrials += 1;
    if (record.isHit) existingProfile.totalHits += 1;
    existingProfile.currentLevel = targetProfileLevel;
    if (targetProfileLevel > existingProfile.bestLevel) {
      existingProfile.bestLevel = targetProfileLevel;
    }
    existingProfile.updatedAt = Date.now();
    await profileStore.put(existingProfile);
  }

  await tx.done;
}

export async function saveSession(session: UnifiedSessionData): Promise<void> {
  const db = await getDB();
  const cardId = session.cardId || session.mode;
  const canonicalCard = registry.getCardById(cardId);
  const packId = canonicalCard ? canonicalCard.packId : session.domain || 'core';
  await db.put('sessions', { ...session, cardId, domain: packId });
}

export async function getProfile(cardId: string): Promise<UnifiedProfileData | null> {
  const db = await getDB();
  const profile = await db.get('user_profiles', cardId);
  return profile || null;
}

export async function getAllProfiles(): Promise<UnifiedProfileData[]> {
  const db = await getDB();
  return db.getAll('user_profiles');
}

/**
 * 从 daily_summaries 快速检索聚合数据 (毫秒级)
 */
export async function getDailySummaries(options?: {
  cardId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}): Promise<DailySummaryData[]> {
  const db = await getDB();

  if (options?.date && options?.cardId) {
    const item = await db.get('daily_summaries', `${options.date}_${options.cardId}`);
    return item ? [item] : [];
  }

  if (options?.date) {
    return db.getAllFromIndex('daily_summaries', 'by-date', options.date);
  }

  if (options?.cardId) {
    return db.getAllFromIndex('daily_summaries', 'by-card', options.cardId);
  }

  let summaries = await db.getAll('daily_summaries');
  if (options?.startDate || options?.endDate) {
    summaries = summaries.filter((s) => {
      if (options.startDate && s.date < options.startDate) return false;
      if (options.endDate && s.date > options.endDate) return false;
      return true;
    });
  }

  return summaries;
}

/**
 * 快速获取今日所有卡片聚合数据
 */
export async function getTodaySummaries(): Promise<DailySummaryData[]> {
  const todayStr = getLocalDateString(Date.now());
  return getDailySummaries({ date: todayStr });
}

export async function getTrialRecordsByCard(
  cardId: string,
  limit?: number,
): Promise<UnifiedTrialRecord[]> {
  const db = await getDB();
  const rawRecords = await db.getAllFromIndex('records', 'by-card', cardId);
  const mapped = rawRecords.map((r) => ({
    ...r,
    ...(r.details || {}),
  }));
  return limit && mapped.length > limit ? mapped.slice(-limit) : mapped;
}

export async function getTrainingTimeMs(): Promise<number> {
  const db = await getDB();
  const summaries = await db.getAll('daily_summaries');

  let totalMs = 0;
  for (const s of summaries) {
    totalMs += Number(s.totalTimeMs) || 0;
  }
  return totalMs;
}

export function formatTotalTime(ms: number): string {
  if (!ms || Number.isNaN(ms) || ms <= 0) {
    return '0天0小时0分钟';
  }
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}天${hours}小时${minutes}分钟`;
}
~~~~~

~~~~~act
write_file
src/utils/db/repository.ts
~~~~~
~~~~~typescript
import { registry } from '../../core/registry';
import type { TrainingPlan } from '../../types/plan';
import {
  clonePlan,
  deletePlan,
  exportPlanToJson,
  importPlanFromJson,
  loadPlanStorageState,
  loadTrainingPlan,
  resetPlansToDefault,
  savePlanStorageState,
  saveTrainingPlan,
  setActivePlan,
  togglePlanFavorite,
} from '../planStorage';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  loadSettings,
  saveSettings,
} from '../settings';
import { clearAllData, exportAllData, exportAllDataStream, importAllData } from './importExport';
import { pruneColdRecords } from './prune';
import {
  formatTotalTime,
  getAllProfiles,
  getDailySummaries,
  getProfile,
  getTodaySummaries,
  getTrainingTimeMs,
  getTrialRecordsByCard,
  saveSession,
  saveTrialRecord,
} from './queries';
import type { UnifiedProfileData } from './schema';

export interface AppDataSummary {
  totalTimeMs: number;
  profiles: Record<string, UnifiedProfileData>;
  settings: UserSettings;
  trainingPlan: TrainingPlan;
  allPlans: TrainingPlan[];
}

/**
 * 聚合仓储层 (SystemRepository)
 * 统一收敛 IndexedDB、LocalStorage 及跨介质事务与稳态治理操作
 */
export class SystemRepository {
  // === 查询与聚合统计 ===
  public async getAppSummary(): Promise<AppDataSummary> {
    const totalTimeMs = await getTrainingTimeMs();
    const allProfilesList = await getAllProfiles();
    const profiles: Record<string, UnifiedProfileData> = {};

    for (const p of allProfilesList) {
      profiles[p.cardId] = p;
    }

    const settings = loadSettings();
    const planState = loadPlanStorageState();
    const trainingPlan = loadTrainingPlan();

    return {
      totalTimeMs,
      profiles,
      settings,
      trainingPlan,
      allPlans: planState.plans,
    };
  }

  // === 答题与会话持久化 ===
  public saveTrial = saveTrialRecord;
  public saveSession = saveSession;
  public getProfile = getProfile;
  public getAllProfiles = getAllProfiles;
  public getDailySummaries = getDailySummaries;
  public getTodaySummaries = getTodaySummaries;
  public getTrialRecordsByCard = getTrialRecordsByCard;
  public getTrainingTimeMs = getTrainingTimeMs;
  public formatTotalTime = formatTotalTime;

  // === 设置偏好管理 ===
  public getSettings = loadSettings;
  public saveSettings = saveSettings;
  public getCardSettings(cardId: string): BaseModuleSettings {
    const current = loadSettings();
    return getCardSettings(current, cardId);
  }

  // === 训练计划管理 ===
  public getPlanStorageState = loadPlanStorageState;
  public savePlanStorageState = savePlanStorageState;
  public getActivePlan = loadTrainingPlan;
  public savePlan = saveTrainingPlan;
  public setActivePlan = setActivePlan;
  public toggleFavorite = togglePlanFavorite;
  public deletePlan = deletePlan;
  public resetPlans = resetPlansToDefault;
  public clonePlan = clonePlan;
  public exportPlanJson = exportPlanToJson;
  public importPlanJson = importPlanFromJson;

  // === 全局备份恢复与稳态治理 ===
  public exportAllData = exportAllData;
  public exportAllDataStream = exportAllDataStream;
  public importAllData = importAllData;
  public clearAllData = clearAllData;
  public pruneColdRecords = pruneColdRecords;
}

export const repository = new SystemRepository();
~~~~~

~~~~~act
patch_file
src/utils/db/importExport.ts
~~~~~
~~~~~typescript.old
    // 1. 导入 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const tx = db.transaction('sessions', 'readwrite');
      for (const s of parsed.sessions) {
        const domain = (s.domain || 'star') as TrainingDomain;
        const cardId = s.cardId || s.mode;
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
      await tx.done;
    }

    // 2. 导入 profiles
    if (parsed.profiles && parsed.profiles.length > 0) {
      const tx = db.transaction('user_profiles', 'readwrite');
      for (const p of parsed.profiles) {
        const cardId = p.cardId || p.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.domain : ((p.domain || 'star') as TrainingDomain);
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
      await tx.done;
    }

    // 3. 分批写入海量 records (每 1500 条为一个独立事务批次)
    if (parsed.records && parsed.records.length > 0) {
      const BATCH_SIZE = 1500;
      for (let i = 0; i < parsed.records.length; i += BATCH_SIZE) {
        const batch = parsed.records.slice(i, i + BATCH_SIZE);
        const tx = db.transaction('records', 'readwrite');
        const store = tx.objectStore('records');
        for (const r of batch) {
          const domain = (r.domain || 'star') as TrainingDomain;
          const cardId = r.cardId || r.mode;
          await store.put({ ...r, domain, cardId });
        }
        await tx.done;
      }
    }
~~~~~
~~~~~typescript.new
    // 1. 导入 sessions
    if (parsed.sessions && parsed.sessions.length > 0) {
      const tx = db.transaction('sessions', 'readwrite');
      for (const s of parsed.sessions) {
        const cardId = s.cardId || s.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.packId : s.domain || 'core';
        await tx.objectStore('sessions').put({ ...s, domain, cardId });
      }
      await tx.done;
    }

    // 2. 导入 profiles
    if (parsed.profiles && parsed.profiles.length > 0) {
      const tx = db.transaction('user_profiles', 'readwrite');
      for (const p of parsed.profiles) {
        const cardId = p.cardId || p.mode;
        const card = registry.getCardById(cardId);
        const domain = card ? card.packId : p.domain || 'core';
        const totalTrials = p.totalTrials ?? 0;
        await tx.objectStore('user_profiles').put({ ...p, cardId, domain, totalTrials });
      }
      await tx.done;
    }

    // 3. 分批写入海量 records (每 1500 条为一个独立事务批次)
    if (parsed.records && parsed.records.length > 0) {
      const BATCH_SIZE = 1500;
      for (let i = 0; i < parsed.records.length; i += BATCH_SIZE) {
        const batch = parsed.records.slice(i, i + BATCH_SIZE);
        const tx = db.transaction('records', 'readwrite');
        const store = tx.objectStore('records');
        for (const r of batch) {
          const cardId = r.cardId || r.mode;
          const card = registry.getCardById(cardId);
          const domain = card ? card.packId : r.domain || 'core';
          await store.put({ ...r, domain, cardId });
        }
        await tx.done;
      }
    }
~~~~~

#### Acts 5: 更新视图与钩子

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript.old
import { ModeCard } from '../components/dashboard/ModeCard';
import { FilterEngine } from '../components/discovery/FilterEngine';
~~~~~
~~~~~typescript.new
import { ModeCard } from '../components/common/ModeCard';
import { FilterEngine } from '../components/discovery/FilterEngine';
~~~~~

~~~~~act
patch_file
src/views/GenericTrainingView.tsx
~~~~~
~~~~~typescript.old
  showExitButton = true,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
  const domain = card.domain;
  const mode = card.mode;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain,
    mode,
    sessionType,
~~~~~
~~~~~typescript.new
  showExitButton = true,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
  const packId = card.packId;
  const mode = card.mode;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain: packId,
    mode,
    sessionType,
~~~~~

~~~~~act
patch_file
src/hooks/useTodayStats.ts
~~~~~
~~~~~typescript.old
import { useEffect, useState } from 'preact/hooks';
import { type TrainingDomain, getTodaySummaries } from '../utils/db/index';

export function useTodayStats(domain?: TrainingDomain) {
  const [todayStats, setTodayStats] = useState<Record<string, { count: number; timeMs: number }>>(
    {},
  );

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      const summaries = await getTodaySummaries(domain);
      const stats: Record<string, { count: number; timeMs: number }> = {};
~~~~~
~~~~~typescript.new
import { useEffect, useState } from 'preact/hooks';
import { getTodaySummaries } from '../utils/db/index';

export function useTodayStats() {
  const [todayStats, setTodayStats] = useState<Record<string, { count: number; timeMs: number }>>(
    {},
  );

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      const summaries = await getTodaySummaries();
      const stats: Record<string, { count: number; timeMs: number }> = {};
~~~~~

~~~~~act
patch_file
src/hooks/useTodayStats.ts
~~~~~
~~~~~typescript.old
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [domain]);

  return todayStats;
}
~~~~~
~~~~~typescript.new
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return todayStats;
}
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
    if (card.domain === 'star') {
      cardConfig.gridSize = 3;
      cardConfig.targetingMode = 'off';
      cardConfig.manualTargetSectors = [];
    } else if (card.id === 'color_hue') {
      cardConfig.enableHoverColorPreview = true;
      cardConfig.targetingMode = 'off';
      cardConfig.manualTargetSectors = [];
    } else if (card.id === 'color_all') {
      cardConfig.enableHoverColorPreview = true;
    }
~~~~~
~~~~~typescript.new
    if (card.packId === 'star') {
      cardConfig.gridSize = 3;
      cardConfig.targetingMode = 'off';
      cardConfig.manualTargetSectors = [];
    } else if (card.id === 'color_hue') {
      cardConfig.enableHoverColorPreview = true;
      cardConfig.targetingMode = 'off';
      cardConfig.manualTargetSectors = [];
    } else if (card.id === 'color_all') {
      cardConfig.enableHoverColorPreview = true;
    }
~~~~~

~~~~~act
patch_file
src/components/plan/PlanEditorModal.tsx
~~~~~
~~~~~typescript.old
  const validPlanItems = currentPlan.items.filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );
  const totalTrials = validPlanItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  const availableCards = registry.getAllCards().filter((card) => {
    if (selectedDomainFilter === 'all') return true;
    return card.domain === selectedDomainFilter;
  });

  return (
~~~~~
~~~~~typescript.new
  const validPlanItems = currentPlan.items.filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );
  const totalTrials = validPlanItems.reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  const availableCards = registry.getAllCards().filter((card) => {
    if (selectedDomainFilter === 'all') return true;
    return card.packId === selectedDomainFilter;
  });

  return (
~~~~~

~~~~~act
patch_file
piconfig.json
~~~~~
~~~~~json.old
        "src/core/",
        "src/types/card.ts",
        "src/types/index.ts",
        "src/config/domains.ts",
        "src/config/trainingPlugins.tsx",
        "src/utils/settings.ts",
~~~~~
~~~~~json.new
        "src/core/",
        "src/types/card.ts",
        "src/types/index.ts",
        "src/config/trainingPlugins.tsx",
        "src/utils/settings.ts",
~~~~~

~~~~~act
patch_file
piconfig.json
~~~~~
~~~~~json.old
        "src/config/planTemplates.ts",
        "src/config/domains.ts",
        "src/config/trainingPlugins.tsx",
        "src/core/registry.ts",
~~~~~
~~~~~json.new
        "src/config/planTemplates.ts",
        "src/config/trainingPlugins.tsx",
        "src/core/registry.ts",
~~~~~

### 下一步建议
1. **类型检查与测试验证**：运行 `npm run check` 与 `npm test` 确认全系统类型检查 100% 通过且无回归错误。
2. **前瞻性演进 (v0.5 参数化自适应训练流)**：在 `TrainingPlan` 的数据结构中正式引入动态抽题规范 `dynamicQuery`（例如通过标签表达式动态组装每日训练流）。

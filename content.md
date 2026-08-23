现在将实施方案 C：将实验性卡片属性收敛为 `CardTags` 内的正交状态维度 `tags.status: CardStatusTag`，并同步重构倒排索引 `InvertedCardIndex`、多维筛选引擎与透视卡片定义。

## [WIP] refactor: 重构实验性卡片标记为正交状态标签维度

### 用户需求
将卡片的实验性标记从松散的顶层布尔字段（`isExperimental?: boolean`）重构为正交的强类型状态标签维度（`tags.status: CardStatusTag`），统一倒排索引检索管线，并更新透视卡片定义。

### 评论
将卡片生命周期与成熟度收敛为正交标签维度，消除了 `registry` 与 `FilterEngine` 中的特例判断，使系统标签架构在 DDD 层面高度对称统一，并为后续扩展 `deprecated` 或 `preview` 状态奠定了基础。

### 目标
1. 在 `src/types/card.ts` 中定义 `CardStatusTag = 'stable' | 'experimental' | 'deprecated'`，将其纳入 `CardTags` 与 `CardQueryOptions`。
2. 在 `src/core/registry.ts` 中将状态维度纳入 `InvertedCardIndex` 倒排索引，移除过程式过滤。
3. 在 `src/components/discovery/FilterEngine.tsx` 和 `src/hooks/useHashRoute.ts` 中升级状态筛选器与路由序列化逻辑。
4. 更新 `src/packs/perspective/index.ts` 中的透视卡片定义，将 `isExperimental: true` 迁移为 `tags.status: 'experimental'`。
5. 调整 `TrainingShell` 与 `Home` 视图对卡片状态的消费逻辑。

### 基本原理
通过在 `CardTags` 契约中定义状态维度并纳入倒排索引，所有标签维度的查询均统一为基于 Set 的交集运算，增强了类型安全与检索一致性，同时对未显式声明 `tags.status` 的卡片默认回退为 `'stable'`。

### 标签
#intent/refine #flow/ready #priority/high #comp/core #comp/cli #concept/config #scope/core #scope/api #ai/instruct #task/domain/architecture #task/object/status-tags #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 升级卡片与查询类型契约

~~~~~act
patch_file
src/types/card.ts
~~~~~
~~~~~typescript
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
  isExperimental?: boolean;
  searchKeyword?: string;
}
~~~~~
~~~~~typescript
export type InteractionTag = 'continuous_slider' | 'point_click' | 'choice_2afc' | 'choice_nafc';

export type CardStatusTag = 'stable' | 'experimental' | 'deprecated';

export interface CardTags {
  target: SensoryTargetTag[];
  skill: CognitiveSkillTag[];
  interaction: InteractionTag[];
  status?: CardStatusTag;
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
  statuses?: CardStatusTag[];
  searchKeyword?: string;
}
~~~~~

#### Acts 2: 在倒排索引与查询引擎中整合状态维度

~~~~~act
patch_file
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
~~~~~
~~~~~typescript
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import type {
  CardDefinition,
  CardQueryOptions,
  CardStatusTag,
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
  private statusMap = new Map<CardStatusTag, Set<string>>();
  private packMap = new Map<string, Set<string>>();

  public clear(): void {
    this.targetMap.clear();
    this.skillMap.clear();
    this.interactionMap.clear();
    this.statusMap.clear();
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

      const status: CardStatusTag = card.tags.status || 'stable';
      let stSet = this.statusMap.get(status);
      if (!stSet) {
        stSet = new Set();
        this.statusMap.set(status, stSet);
      }
      stSet.add(id);
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

  public getCardIdsByStatus(status: CardStatusTag): Set<string> {
    return this.statusMap.get(status) || new Set();
  }

  public getCardIdsByPack(packId: string): Set<string> {
    return this.packMap.get(packId) || new Set();
  }
}
~~~~~

~~~~~act
patch_file
src/core/registry.ts
~~~~~
~~~~~typescript
    if (options.interactions && options.interactions.length > 0) {
      const interactionUnion = new Set<string>();
      for (const i of options.interactions) {
        for (const id of this.invertedIndex.getCardIdsByInteraction(i)) {
          interactionUnion.add(id);
        }
      }
      intersect(interactionUnion);
    }

    const idsToFilter: string[] =
      candidateIds === null ? Array.from(this.cardMap.keys()) : Array.from(candidateIds);
    let results = idsToFilter
      .map((id) => this.cardMap.get(id))
      .filter((card): card is CardDefinition => Boolean(card));

    if (options.isExperimental !== undefined) {
      results = results.filter((c) => Boolean(c.isExperimental) === options.isExperimental);
    }

    if (options.searchKeyword) {
~~~~~
~~~~~typescript
    if (options.interactions && options.interactions.length > 0) {
      const interactionUnion = new Set<string>();
      for (const i of options.interactions) {
        for (const id of this.invertedIndex.getCardIdsByInteraction(i)) {
          interactionUnion.add(id);
        }
      }
      intersect(interactionUnion);
    }

    if (options.statuses && options.statuses.length > 0) {
      const statusUnion = new Set<string>();
      for (const st of options.statuses) {
        for (const id of this.invertedIndex.getCardIdsByStatus(st)) {
          statusUnion.add(id);
        }
      }
      intersect(statusUnion);
    }

    const idsToFilter: string[] =
      candidateIds === null ? Array.from(this.cardMap.keys()) : Array.from(candidateIds);
    let results = idsToFilter
      .map((id) => this.cardMap.get(id))
      .filter((card): card is CardDefinition => Boolean(card));

    if (options.searchKeyword) {
~~~~~

#### Acts 3: 更新透视卡片包定义

~~~~~act
patch_file
src/packs/perspective/index.ts
~~~~~
~~~~~typescript
export const perspectiveCards: CardDefinition[] = [
  {
    id: 'perspective_vp_convergence',
    packId: 'perspective',
    mode: 'VP_CONVERGENCE',
    title: '透视灭点汇聚感',
    desc: '观察已有倾角透视线，通过滑块调制第三条线段倾斜度，使其精准延长交汇于同一灭点 (VP)。',
    instruction: '观察已有透视线，调制滑块旋转第三条线使其交汇于同一灭点',
    icon: Sliders,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
    isExperimental: true,
  },
  {
    id: 'perspective_proportion_division',
    packId: 'perspective',
    mode: 'PROPORTION_DIVISION',
    title: '平面比例与黄金分割盲切',
    desc: '观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。',
    instruction: '观察线段并在指定比例位置单次点击',
    icon: Layers,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['proportion', 'spatial_orientation'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
    isExperimental: true,
  },
  {
    id: 'perspective_proportion_migration',
    packId: 'perspective',
    mode: 'PROPORTION_MIGRATION',
    title: '空间比例角度迁移',
    desc: '观察上方水平基准线上的任意比例目标点，在下方随机倾斜角度的线段上准确标出相同比例位置。',
    instruction: '观察上方基准线目标点，在下方倾斜线段上点选相同比例位置',
    icon: ArrowRightLeft,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['proportion', 'spatial_orientation', 'visual_memory'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
    isExperimental: true,
  },
  {
    id: 'perspective_gestalt_continuation_2afc',
    packId: 'perspective',
    mode: 'GESTALT_CONTINUATION_2AFC',
    title: '断线完形连续性辨识',
    desc: '基于格式塔完形心理学，二选一快速辨识穿透中间障碍物的真实延续线段 (2AFC)。',
    instruction: '二选一选出保持绝对连续贯穿的延伸线 (键 1 / 2)',
    icon: Eye,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['illusion_invariance', 'spatial_orientation'],
      interaction: ['choice_2afc'],
    },
    hasWeaknessAnalytics: false,
    isExperimental: true,
  },
  {
    id: 'perspective_structure_3d',
    packId: 'perspective',
    mode: 'STRUCTURE_PROJECTION_3D',
    title: '3D 结构空间翻转',
    desc: '观察正交三视图标点，在 3D 透视立方体点阵中定位对应的三维空间坐标点。',
    instruction: '结合三视图坐标，在 3D 立方体点阵中点选对应点',
    icon: Box,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['spatial_orientation', 'visual_memory'],
      interaction: ['point_click'],
    },
    hasWeaknessAnalytics: false,
    isExperimental: true,
  },
];
~~~~~
~~~~~typescript
export const perspectiveCards: CardDefinition[] = [
  {
    id: 'perspective_vp_convergence',
    packId: 'perspective',
    mode: 'VP_CONVERGENCE',
    title: '透视灭点汇聚感',
    desc: '观察已有倾角透视线，通过滑块调制第三条线段倾斜度，使其精准延长交汇于同一灭点 (VP)。',
    instruction: '观察已有透视线，调制滑块旋转第三条线使其交汇于同一灭点',
    icon: Sliders,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['spatial_orientation', 'proportion'],
      interaction: ['continuous_slider'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: true,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
  {
    id: 'perspective_proportion_division',
    packId: 'perspective',
    mode: 'PROPORTION_DIVISION',
    title: '平面比例与黄金分割盲切',
    desc: '观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。',
    instruction: '观察线段并在指定比例位置单次点击',
    icon: Layers,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['proportion', 'spatial_orientation'],
      interaction: ['point_click'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_proportion_migration',
    packId: 'perspective',
    mode: 'PROPORTION_MIGRATION',
    title: '空间比例角度迁移',
    desc: '观察上方水平基准线上的任意比例目标点，在下方随机倾斜角度的线段上准确标出相同比例位置。',
    instruction: '观察上方基准线目标点，在下方倾斜线段上点选相同比例位置',
    icon: ArrowRightLeft,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['proportion', 'spatial_orientation', 'visual_memory'],
      interaction: ['point_click'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_gestalt_continuation_2afc',
    packId: 'perspective',
    mode: 'GESTALT_CONTINUATION_2AFC',
    title: '断线完形连续性辨识',
    desc: '基于格式塔完形心理学，二选一快速辨识穿透中间障碍物的真实延续线段 (2AFC)。',
    instruction: '二选一选出保持绝对连续贯穿的延伸线 (键 1 / 2)',
    icon: Eye,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['illusion_invariance', 'spatial_orientation'],
      interaction: ['choice_2afc'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
  {
    id: 'perspective_structure_3d',
    packId: 'perspective',
    mode: 'STRUCTURE_PROJECTION_3D',
    title: '3D 结构空间翻转',
    desc: '观察正交三视图标点，在 3D 透视立方体点阵中定位对应的三维空间坐标点。',
    instruction: '结合三视图坐标，在 3D 立方体点阵中点选对应点',
    icon: Box,
    tags: {
      target: ['geometry', 'perspective'],
      skill: ['spatial_orientation', 'visual_memory'],
      interaction: ['point_click'],
      status: 'experimental',
    },
    hasWeaknessAnalytics: false,
  },
];
~~~~~

#### Acts 4: 适配 FilterEngine 多维筛选器组件

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript
import { registry } from '../../core/registry';
import type {
  CardQueryOptions,
  CognitiveSkillTag,
  InteractionTag,
  SensoryTargetTag,
} from '../../types/card';

export const TARGET_TAG_LABELS: Record<SensoryTargetTag, string> = {
  geometry: '空间几何',
  color: '绝对色相',
  relative_color: '环境色彩',
  negative_space: '正负空间',
  abstraction: '形态概括',
  concretization: '具象构型',
  angle: '角度感知',
  perspective: '透视空间',
};

export const SKILL_TAG_LABELS: Record<CognitiveSkillTag, string> = {
  spatial_orientation: '空间方位',
  color_fidelity: '色彩保真',
  illusion_invariance: '抗视错觉',
  proportion: '比例度量',
  visual_memory: '视觉记忆',
  abstraction: '形态抽象',
  gesture_flow: '动态势线',
  notan_grouping: '明度归组',
};

export const INTERACTION_TAG_LABELS: Record<InteractionTag, string> = {
  continuous_slider: '连续滑块',
  point_click: '点阵点击',
  choice_2afc: '2AFC 对抗',
  choice_nafc: 'N-AFC 判断',
};

interface FilterEngineProps {
  query: CardQueryOptions;
  totalMatches: number;
  compact?: boolean;
  onChange: (newQuery: CardQueryOptions) => void;
}

export function FilterEngine({
  query,
  totalMatches,
  compact = false,
  onChange,
}: FilterEngineProps) {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(!compact);

  const packs = registry.getAllPacks();

  const handleSearchChange = (val: string) => {
    onChange({
      ...query,
      searchKeyword: val || undefined,
    });
  };

  const toggleTarget = (target: SensoryTargetTag) => {
    const current = query.targets || [];
    const next = current.includes(target)
      ? current.filter((t) => t !== target)
      : [...current, target];
    onChange({ ...query, targets: next.length > 0 ? next : undefined });
  };

  const toggleSkill = (skill: CognitiveSkillTag) => {
    const current = query.skills || [];
    const next = current.includes(skill) ? current.filter((s) => s !== skill) : [...current, skill];
    onChange({ ...query, skills: next.length > 0 ? next : undefined });
  };

  const toggleInteraction = (interaction: InteractionTag) => {
    const current = query.interactions || [];
    const next = current.includes(interaction)
      ? current.filter((i) => i !== interaction)
      : [...current, interaction];
    onChange({ ...query, interactions: next.length > 0 ? next : undefined });
  };

  const setExperimentalFilter = (val: boolean) => {
    onChange({
      ...query,
      isExperimental: query.isExperimental === val ? undefined : val,
    });
  };

  const handleSelectPack = (packId?: string) => {
    onChange({
      ...query,
      packId: packId || undefined,
    });
  };

  const handleResetFilters = () => {
    onChange({});
  };

  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      query.packId ||
      (query.targets && query.targets.length > 0) ||
      (query.skills && query.skills.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      query.isExperimental !== undefined,
  );
~~~~~
~~~~~typescript
import { registry } from '../../core/registry';
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitiveSkillTag,
  InteractionTag,
  SensoryTargetTag,
} from '../../types/card';

export const TARGET_TAG_LABELS: Record<SensoryTargetTag, string> = {
  geometry: '空间几何',
  color: '绝对色相',
  relative_color: '环境色彩',
  negative_space: '正负空间',
  abstraction: '形态概括',
  concretization: '具象构型',
  angle: '角度感知',
  perspective: '透视空间',
};

export const SKILL_TAG_LABELS: Record<CognitiveSkillTag, string> = {
  spatial_orientation: '空间方位',
  color_fidelity: '色彩保真',
  illusion_invariance: '抗视错觉',
  proportion: '比例度量',
  visual_memory: '视觉记忆',
  abstraction: '形态抽象',
  gesture_flow: '动态势线',
  notan_grouping: '明度归组',
};

export const INTERACTION_TAG_LABELS: Record<InteractionTag, string> = {
  continuous_slider: '连续滑块',
  point_click: '点阵点击',
  choice_2afc: '2AFC 对抗',
  choice_nafc: 'N-AFC 判断',
};

export const STATUS_TAG_LABELS: Record<CardStatusTag, string> = {
  stable: '稳定模块',
  experimental: '实验性模块',
  deprecated: '已废弃',
};

interface FilterEngineProps {
  query: CardQueryOptions;
  totalMatches: number;
  compact?: boolean;
  onChange: (newQuery: CardQueryOptions) => void;
}

export function FilterEngine({
  query,
  totalMatches,
  compact = false,
  onChange,
}: FilterEngineProps) {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(!compact);

  const packs = registry.getAllPacks();

  const handleSearchChange = (val: string) => {
    onChange({
      ...query,
      searchKeyword: val || undefined,
    });
  };

  const toggleTarget = (target: SensoryTargetTag) => {
    const current = query.targets || [];
    const next = current.includes(target)
      ? current.filter((t) => t !== target)
      : [...current, target];
    onChange({ ...query, targets: next.length > 0 ? next : undefined });
  };

  const toggleSkill = (skill: CognitiveSkillTag) => {
    const current = query.skills || [];
    const next = current.includes(skill) ? current.filter((s) => s !== skill) : [...current, skill];
    onChange({ ...query, skills: next.length > 0 ? next : undefined });
  };

  const toggleInteraction = (interaction: InteractionTag) => {
    const current = query.interactions || [];
    const next = current.includes(interaction)
      ? current.filter((i) => i !== interaction)
      : [...current, interaction];
    onChange({ ...query, interactions: next.length > 0 ? next : undefined });
  };

  const toggleStatus = (status: CardStatusTag) => {
    const current = query.statuses || [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onChange({ ...query, statuses: next.length > 0 ? next : undefined });
  };

  const handleSelectPack = (packId?: string) => {
    onChange({
      ...query,
      packId: packId || undefined,
    });
  };

  const handleResetFilters = () => {
    onChange({});
  };

  const hasActiveFilters = Boolean(
    query.searchKeyword ||
      query.packId ||
      (query.targets && query.targets.length > 0) ||
      (query.skills && query.skills.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0),
  );
~~~~~

~~~~~act
patch_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~typescript
          {/* 4. 实验性与状态维度 (Experimental Tag) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FlaskConical className="w-3 h-3 text-purple-500" />
              特性与状态 (Status Tag)
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setExperimentalFilter(false)}
                className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                  query.isExperimental === false
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
                }`}
              >
                {query.isExperimental === false && <Check className="w-3 h-3" />}
                <ShieldCheck className="w-3 h-3 text-indigo-500" />
                <span>稳定模块</span>
              </button>

              <button
                type="button"
                onClick={() => setExperimentalFilter(true)}
                className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                  query.isExperimental === true
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                    : 'bg-slate-50 hover:bg-purple-50/60 text-slate-600 border border-slate-200/80 hover:border-purple-300'
                }`}
              >
                {query.isExperimental === true && <Check className="w-3 h-3" />}
                <FlaskConical className="w-3 h-3 text-amber-500" />
                <span>实验性模块</span>
              </button>
            </div>
          </div>
~~~~~
~~~~~typescript
          {/* 4. 实验性与状态维度 (Status Tag) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FlaskConical className="w-3 h-3 text-purple-500" />
              特性与状态 (Status Tag)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['stable', 'experimental'] as CardStatusTag[]).map((st) => {
                const isSelected = query.statuses?.includes(st) ?? false;
                return (
                  <button
                    type="button"
                    key={st}
                    onClick={() => toggleStatus(st)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? st === 'stable'
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                          : 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {st === 'stable' ? (
                      <ShieldCheck className="w-3 h-3 text-indigo-500" />
                    ) : (
                      <FlaskConical className="w-3 h-3 text-amber-500" />
                    )}
                    <span>{STATUS_TAG_LABELS[st]}</span>
                  </button>
                );
              })}
            </div>
          </div>
~~~~~

#### Acts 5: 更新路由解析与上层视图展示消费

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type {
  CardQueryOptions,
  CognitiveSkillTag,
  InteractionTag,
  SensoryTargetTag,
} from '../types/card';
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitiveSkillTag,
  InteractionTag,
  SensoryTargetTag,
} from '../types/card';
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
  const interactions = params.get('interactions')?.split(',').filter(Boolean) as
    | InteractionTag[]
    | undefined;
  const expParam = params.get('experimental');
  const isExperimental =
    expParam === 'true' ? true : expParam === 'false' ? false : undefined;
  const searchKeyword = params.get('q') || params.get('search') || undefined;

  if (
    !packId &&
    (!targets || targets.length === 0) &&
    (!skills || skills.length === 0) &&
    (!interactions || interactions.length === 0) &&
    isExperimental === undefined &&
    !searchKeyword
  ) {
    return undefined;
  }

  return {
    packId,
    targets: targets && targets.length > 0 ? targets : undefined,
    skills: skills && skills.length > 0 ? skills : undefined,
    interactions: interactions && interactions.length > 0 ? interactions : undefined,
    isExperimental,
    searchKeyword,
  };
}
~~~~~
~~~~~typescript
  const interactions = params.get('interactions')?.split(',').filter(Boolean) as
    | InteractionTag[]
    | undefined;
  const statusesParam = params.get('statuses')?.split(',').filter(Boolean) as
    | CardStatusTag[]
    | undefined;
  const legacyExpParam = params.get('experimental');
  const statuses =
    statusesParam && statusesParam.length > 0
      ? statusesParam
      : legacyExpParam === 'true'
        ? (['experimental'] as CardStatusTag[])
        : legacyExpParam === 'false'
          ? (['stable'] as CardStatusTag[])
          : undefined;
  const searchKeyword = params.get('q') || params.get('search') || undefined;

  if (
    !packId &&
    (!targets || targets.length === 0) &&
    (!skills || skills.length === 0) &&
    (!interactions || interactions.length === 0) &&
    (!statuses || statuses.length === 0) &&
    !searchKeyword
  ) {
    return undefined;
  }

  return {
    packId,
    targets: targets && targets.length > 0 ? targets : undefined,
    skills: skills && skills.length > 0 ? skills : undefined,
    interactions: interactions && interactions.length > 0 ? interactions : undefined,
    statuses,
    searchKeyword,
  };
}
~~~~~

~~~~~act
patch_file
src/hooks/useHashRoute.ts
~~~~~
~~~~~typescript
    if (route.query.interactions && route.query.interactions.length > 0) {
      params.set('interactions', route.query.interactions.join(','));
    }
    if (route.query.isExperimental !== undefined) {
      params.set('experimental', String(route.query.isExperimental));
    }
    if (route.query.searchKeyword?.trim()) {
~~~~~
~~~~~typescript
    if (route.query.interactions && route.query.interactions.length > 0) {
      params.set('interactions', route.query.interactions.join(','));
    }
    if (route.query.statuses && route.query.statuses.length > 0) {
      params.set('statuses', route.query.statuses.join(','));
    }
    if (route.query.searchKeyword?.trim()) {
~~~~~

~~~~~act
patch_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~typescript
          {isTargeting && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              靶向强化训练
            </span>
          )}

          {card.isExperimental && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
              实验性模块
            </span>
          )}
        </div>
~~~~~
~~~~~typescript
          {isTargeting && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              靶向强化训练
            </span>
          )}

          {card.tags.status === 'experimental' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
              实验性模块
            </span>
          )}
        </div>
~~~~~

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~typescript
            return (
              <ModeCard
                key={card.id}
                title={card.title}
                desc={card.desc}
                icon={card.icon}
                todayCount={stat.count}
                todayTimeMs={stat.timeMs}
                currentLevel={currentLevel}
                accuracy={accuracy}
                hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
                isExperimental={Boolean(card.isExperimental)}
                onStartTraining={() => onStartCard(card.id, 'training')}
                onStartBenchmark={() => onStartCard(card.id, 'benchmark')}
                onOpenSettings={() => onOpenCardSettings(card.id)}
                onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
              />
            );
~~~~~
~~~~~typescript
            return (
              <ModeCard
                key={card.id}
                title={card.title}
                desc={card.desc}
                icon={card.icon}
                todayCount={stat.count}
                todayTimeMs={stat.timeMs}
                currentLevel={currentLevel}
                accuracy={accuracy}
                hasAnalytics={Boolean(card.hasWeaknessAnalytics)}
                isExperimental={card.tags.status === 'experimental'}
                onStartTraining={() => onStartCard(card.id, 'training')}
                onStartBenchmark={() => onStartCard(card.id, 'benchmark')}
                onOpenSettings={() => onOpenCardSettings(card.id)}
                onOpenAnalytics={() => onOpenCardAnalytics(card.id)}
              />
            );
~~~~~

### 下一步建议
1. 执行 `npm run check` 或 `npm test` 校验类型系统与测试用例。
2. 在确认所有模块运行正常后，可提交此重构为一个独立的 Git 节点。

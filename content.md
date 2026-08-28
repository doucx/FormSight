我们即将执行 **Phase 4: UI 表现层与交互容器查表化重构 (UI Refactoring)**，将全局与领域组件中的硬编码中文与残留静态字典全面替换为 `useTranslation` / `i18n.t()` 动态查表机制，彻底实现多语言与联邦词典挂载。

## [WIP] refactor: 重构 UI 表现层与组件以支持联邦 i18n 动态查表

### 用户需求
按照 FormSight v0.5 架构白皮书与路线图中的 Phase 4 规划，对所有 UI 视图组件、筛选器、模态弹窗、训练外壳及 Plan 管理容器进行查表化重构，消除组件层对硬编码中文的直接依赖，全面接入 `src/core/i18n.ts` 联邦多语言调度引擎。

### 评论
UI 层查表化是系统达成“零知识微内核”与国际化自治能力的关键一环。通过将标签展示、卡片元信息、设置项、训练指引及数据分析文案解耦为命名空间路由路径（`packs.<packId>.*` 与 `common.*` / `shell.*` / `tags.*`），保证无论新增扩展包还是切换语言环境，整个 UI 层都能自动响应且保持架构纯净。

### 目标
1. **完善全局语言包**：补全 `src/locales/zh-CN.json` 与 `src/locales/en-US.json` 中缺失的设置、统计、训练流与公共操作文案。
2. **重构发现筛选与卡片组件**：
   - 改造 `FilterEngine.tsx`，使用 `src/config/tags.ts` 并配合 `t()` 动态翻译标签与状态。
   - 改造 `CardPickerPanel.tsx` 与 `ModeCard.tsx`，动态获取卡片标题、描述与扩展包元信息。
3. **重构训练外壳与分析模态窗**：
   - 改造 `TrainingShell.tsx`、`SessionSummaryModal.tsx` 与 `WeaknessAnalyticsModal.tsx`，使训练提示、Badge、图表分析与总结弹窗全面支持多语言解析。
4. **重构全局与卡片设置面板**：
   - 改造 `GlobalSettingsModal.tsx`、`SettingsModal.tsx` 与 `DynamicDomainSettings.tsx`，支持动态 `titleKey` / `descKey` 查表。
5. **重构统计大盘与训练流组件**：
   - 改造 `GlobalStatsModal.tsx`、`PlanHeroCard.tsx`、`PlanEditorModal.tsx`、`PlanStageList.tsx`、`PlanSummaryModal.tsx`。
6. **重构视图路由与根入口**：
   - 更新 `Home.tsx`、`PlanTrainingView.tsx`、`GenericTrainingView.tsx` 与 `app.tsx`。

### 基本原理
1. 利用 `useTranslation` Hook 获取当前语言环境下的 `t` 函数与 `locale` 状态。
2. 针对卡片标题与描述，按约定路径 `packs.${card.packId}.cards.${card.id}.title` 查表；若返回键名则优雅 fallback 到 `card.title` 或 `card.id`。
3. 针对扩展包 Meta，按 `packs.${pack.packId}.meta.title` 解析。
4. 针对正交维度标签，按 `DOMAIN_TAGS`、`PATH_TAGS`、`CHALLENGE_TAGS`、`INTERACTION_TAGS` 与 `STATUS_TAGS` 的 `i18nKey` 动态翻译。

### 标签
#intent/refine #flow/ready #priority/high #comp/cli #comp/runtime #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/i18n-refactor #task/action/implementation #task/state/continue #task/status/active

---

### Script

#### Acts 1: 补充和完善全局系统词典

~~~~~act
write_file
src/locales/zh-CN.json
~~~~~
~~~~~json
{
  "common": {
    "appName": "FormSight",
    "appSubtitle": "视觉造型构图与色彩感知自适应强化训练系统",
    "confirm": "确认",
    "cancel": "取消",
    "complete": "完成",
    "exit": "退出",
    "nextQuestion": "下一题",
    "skip": "跳过",
    "reset": "重置",
    "save": "保存",
    "all": "全部",
    "search": "搜索",
    "stats": "统计",
    "settings": "设置",
    "globalSettings": "全局设置",
    "globalStats": "全局认知数据统计",
    "globalStatsSubtitle": "洞察多维视觉认知成长与训练足迹",
    "todayTrials": "今日刷题",
    "totalTime": "累计用时",
    "accuracy": "正确率",
    "level": "能力层阶",
    "clear": "清空",
    "empty": "未设置",
    "official": "官方",
    "custom": "自定义"
  },
  "shell": {
    "exitTraining": "退出训练 (Esc)",
    "benchmark": "基准测试",
    "training": "自适应训练",
    "targeting": "靶向强化训练",
    "experimental": "实验性模块",
    "trialsCount": "已练题数",
    "currentLevel": "当前难度",
    "viewSummary": "完成并查看总结",
    "instructionTitle": "玩法要领",
    "idlePausedTitle": "训练已自动暂停",
    "idlePausedDesc": "检测到闲置或窗口切换，已保护您的心流与统计数据",
    "clickToResume": "点击继续训练 (或按任意键)"
  },
  "tags": {
    "domains": {
      "form_and_proportion": "形体与比例",
      "spatial_structure": "空间与结构",
      "color_and_value": "色彩与明度",
      "rhythm_and_notan": "动态与图底"
    },
    "paths": {
      "extraction": "自底向上：提炼概括",
      "concretization": "自顶向下：具象寻源",
      "absolute_estimation": "绝对估测度量",
      "relational_mapping": "相对推移映射"
    },
    "challenges": {
      "illusion_piercing": "错觉剥离 (抗同化/环境光)",
      "figure_ground_reversal": "图底反转 (关注负空间)",
      "working_memory": "瞬时记忆 (抗视觉遗忘)",
      "dimensional_translation": "维次转译 (3D/2D展开)"
    },
    "interactions": {
      "continuous_mod": "连续调制 (滑块)",
      "spatial_locate": "空间定位 (点阵点击)",
      "binary_choice": "二分对抗 (2AFC)",
      "multi_choice": "多维检索 (N-AFC)"
    },
    "statuses": {
      "stable": "稳定模块",
      "experimental": "实验性模块",
      "deprecated": "已废弃"
    }
  },
  "home": {
    "matchedModules": "已匹配 {{count}} 个训练模块",
    "expandFilter": "多维筛选",
    "collapseFilter": "收起筛选",
    "searchPlaceholder": "搜索训练卡片名称、编号或认知要领...",
    "noMatchTitle": "未找到符合条件的训练模块",
    "noMatchDesc": "尝试调整或清空当前的多维筛选标签、搜索关键字，以探索更多训练模块。",
    "resetFilter": "重置所有筛选条件",
    "allPacks": "全部 Packs",
    "domainSection": "1. 基础视觉域 (Visual Domain)",
    "pathSection": "2. 认知推演路径 (Cognitive Path)",
    "challengeSection": "3. 核心心智抗性 (Mental Challenge)",
    "interactionSection": "4. 交互评估形态 (Interaction Mode)",
    "statusSection": "5. 特性与发布状态 (Status)"
  },
  "plan": {
    "todayPlan": "今日训练计划",
    "emptyHeroDesc": "按需编排多模块定制训练流，一站式贯通寻星、色感、相对推移与空间负形。",
    "customizeBtn": "定制我的训练流",
    "startPlan": "开始今日训练流",
    "editPlan": "编排计划",
    "stageCount": "{{count}} 个训练阶段",
    "totalTrialsSummary": "合计 {{trials}} 题",
    "estimatedTime": "预计约 {{min}} 分钟",
    "syncNotice": "各阶段自适应难度与答题记录将自动同步至个人生涯档案",
    "stageProgress": "阶段 {{current}} / {{total}}",
    "stageGoal": "本阶段目标: {{trials}} 题",
    "skipStage": "跳过此阶段",
    "exitPlan": "退出训练流",
    "loadingLevel": "正在加载【{{title}}】的生涯能力层阶...",
    "summaryTitle": "今日训练流总结",
    "summarySubtitle": "{{name}} • 完成共 {{count}} 个训练阶段",
    "overallAccuracy": "综合正确率",
    "totalHits": "总击中题数",
    "totalDuration": "总用时",
    "stageBreakdown": "阶段明细成绩",
    "backHome": "完成并返回主页",
    "repeatPlan": "再练一遍此计划",
    "switchPlan": "快速切换训练流",
    "availableCount": "{{count}} 个可用",
    "modalTitle": "定制日常训练流",
    "saveAndUse": "保存修改并使用此计划",
    "saveAsNewAndUse": "保存为新计划并使用",
    "minOneStageRequired": "(至少包含1个阶段)",
    "libraryBtn": "计划库",
    "cloneBtn": "复制副本",
    "exportBtn": "导出 JSON",
    "importBtn": "导入 JSON",
    "newBlankPlan": "新建空白计划",
    "selectCardPrompt": "挑选需要加入训练流的模块：",
    "noCardMatched": "未搜索到匹配的训练模块",
    "addStage": "添加训练阶段",
    "batchTrials": "批量题量:",
    "clearStages": "清空阶段",
    "emptyPlanTip": "当前计划为空，请点击下方「添加训练阶段」挑选训练模块"
  },
  "settings": {
    "title": "全局偏好设置",
    "preferences": "系统偏好",
    "soundTitle": "训练音效反馈",
    "soundDesc": "答对清脆升调提示，答错低沉提示",
    "hintsTitle": "显示任务文字指引",
    "hintsDesc": "在画布上方展示极简提示，关闭进入全沉浸模式",
    "idleTitle": "闲置休眠保护",
    "idleDesc": "无操作或切出窗口时暂停计时与模糊遮罩",
    "idleOff": "关闭",
    "idle30s": "30 秒",
    "idle60s": "60 秒",
    "idle120s": "120 秒",
    "sliderHitMarginTitle": "滑块极值吸附外延感应区",
    "dataGovernance": "数据备份与稳态治理",
    "exportStream": "流式导出 JSON",
    "exporting": "正在流式打包...",
    "importBackup": "导入 JSON 备份",
    "pruneTitle": "数据库瘦身与修剪",
    "pruneDesc": "清理 90 天以前的高开销图形几何细节",
    "pruneBtn": "安全瘦身",
    "resetPlansTitle": "恢复官方训练计划",
    "resetPlansDesc": "清空自定义计划，恢复官方预设",
    "resetPlansBtn": "重置计划",
    "clearDataTitle": "删除所有数据",
    "clearDataDesc": "清空所有模块的本地练习记录",
    "clearDataBtn": "清空数据",
    "autoNextTitle": "自动切换下一题",
    "autoNextDesc": "点击答题后无需手动按空格切题",
    "autoNextDelayTitle": "切换延迟时间",
    "adaptiveModeTitle": "自适应算子模式",
    "adaptiveBlock": "轮次胜率评估 (推荐)",
    "adaptiveStaircase": "经典 3U1D 阶梯",
    "targetAccuracy": "目标通关正确率",
    "blockSize": "每轮评估题量",
    "stepGranularityTitle": "难度阶梯精细度",
    "stepStandard": "标准阶梯 (大步幅)",
    "stepFine": "精细阶梯 (小步幅)"
  },
  "stats": {
    "title": "全局认知数据统计",
    "subTitle": "洞察多维视觉认知成长与训练足迹",
    "allModules": "全部练习项目",
    "todayTrials": "今日刷题",
    "weekTrials": "最近 7 天",
    "yearTrials": "本年累计",
    "allTimeTrials": "生涯总计",
    "pathMasteryTitle": "认知推演路径掌握度 (Cognitive Path Mastery)",
    "pathMasterySubtitle": "基于全部历史试炼聚合",
    "challengeMasteryTitle": "核心心智抗性与错觉克服 (Mental Challenge Index)",
    "challengeMasterySubtitle": "抗错觉 / 图底反转得分",
    "heatmapTitle": "近 12 周训练热力图",
    "trendTitle": "能力峰值演进轨迹",
    "heatmapLess": "少",
    "heatmapMore": "多",
    "dailyMaxLevel": "每日最高 Level",
    "noRecords": "【{{filter}}】下暂无做答记录，先去练习几道题吧！",
    "loading": "正在统计海量物化数据..."
  }
}
~~~~~

~~~~~act
write_file
src/locales/en-US.json
~~~~~
~~~~~json
{
  "common": {
    "appName": "FormSight",
    "appSubtitle": "Visual Form & Color Perception Adaptive Training System",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "complete": "Complete",
    "exit": "Exit",
    "nextQuestion": "Next",
    "skip": "Skip",
    "reset": "Reset",
    "save": "Save",
    "all": "All",
    "search": "Search",
    "stats": "Stats",
    "settings": "Settings",
    "globalSettings": "Global Settings",
    "globalStats": "Cognitive Statistics",
    "globalStatsSubtitle": "Insights into multi-dimensional visual perceptual growth",
    "todayTrials": "Today's Trials",
    "totalTime": "Total Time",
    "accuracy": "Accuracy",
    "level": "Skill Level",
    "clear": "Clear",
    "empty": "Not set",
    "official": "Official",
    "custom": "Custom"
  },
  "shell": {
    "exitTraining": "Exit Training (Esc)",
    "benchmark": "Benchmark",
    "training": "Adaptive Training",
    "targeting": "Targeted Training",
    "experimental": "Experimental",
    "trialsCount": "Trials Done",
    "currentLevel": "Current Level",
    "viewSummary": "Finish & View Summary",
    "instructionTitle": "Instructions",
    "idlePausedTitle": "Training Paused",
    "idlePausedDesc": "Inactivity or tab switch detected. Session state protected.",
    "clickToResume": "Click to Resume (or press any key)"
  },
  "tags": {
    "domains": {
      "form_and_proportion": "Form & Proportion",
      "spatial_structure": "Space & Structure",
      "color_and_value": "Color & Value",
      "rhythm_and_notan": "Rhythm & Notan"
    },
    "paths": {
      "extraction": "Bottom-Up: Extraction",
      "concretization": "Top-Down: Concretization",
      "absolute_estimation": "Absolute Estimation",
      "relational_mapping": "Relational Mapping"
    },
    "challenges": {
      "illusion_piercing": "Illusion Piercing (Anti-Assimilation)",
      "figure_ground_reversal": "Figure-Ground Reversal",
      "working_memory": "Working Memory",
      "dimensional_translation": "Dimensional Translation (3D/2D)"
    },
    "interactions": {
      "continuous_mod": "Continuous Modulation (Slider)",
      "spatial_locate": "Spatial Localization (Grid Click)",
      "binary_choice": "Binary Choice (2AFC)",
      "multi_choice": "Multi-Choice (N-AFC)"
    },
    "statuses": {
      "stable": "Stable Module",
      "experimental": "Experimental",
      "deprecated": "Deprecated"
    }
  },
  "home": {
    "matchedModules": "Matched {{count}} training modules",
    "expandFilter": "Multi-Filter",
    "collapseFilter": "Collapse Filter",
    "searchPlaceholder": "Search by module name, ID, or visual concept...",
    "noMatchTitle": "No matching modules found",
    "noMatchDesc": "Try clearing or tweaking your filter tags or search keyword to discover more modules.",
    "resetFilter": "Reset All Filters",
    "allPacks": "All Packs",
    "domainSection": "1. Visual Domain",
    "pathSection": "2. Cognitive Path",
    "challengeSection": "3. Mental Challenge",
    "interactionSection": "4. Interaction Mode",
    "statusSection": "5. Feature & Status"
  },
  "plan": {
    "todayPlan": "Daily Training Plan",
    "emptyHeroDesc": "Custom orchestrate your multi-stage perceptual routine across star-hopping, color discernment, and negative space.",
    "customizeBtn": "Customize My Routine",
    "startPlan": "Start Daily Routine",
    "editPlan": "Orchestrate Plan",
    "stageCount": "{{count}} Training Stages",
    "totalTrialsSummary": "Total {{trials}} Trials",
    "estimatedTime": "~{{min}} min",
    "syncNotice": "Adaptive difficulty level and history records are synced to your career profile automatically.",
    "stageProgress": "Stage {{current}} / {{total}}",
    "stageGoal": "Stage Target: {{trials}} Trials",
    "skipStage": "Skip This Stage",
    "exitPlan": "Exit Routine",
    "loadingLevel": "Loading career level for [{{title}}]...",
    "summaryTitle": "Daily Routine Summary",
    "summarySubtitle": "{{name}} • Completed {{count}} training stages",
    "overallAccuracy": "Overall Accuracy",
    "totalHits": "Total Hits",
    "totalDuration": "Total Time",
    "stageBreakdown": "Stage Performance Breakdown",
    "backHome": "Complete & Return Home",
    "repeatPlan": "Train This Plan Again",
    "switchPlan": "Quick Switch Routine",
    "availableCount": "{{count}} Available",
    "modalTitle": "Customize Daily Training Routine",
    "saveAndUse": "Save & Use This Plan",
    "saveAsNewAndUse": "Save as New & Use Plan",
    "minOneStageRequired": "(At least 1 stage required)",
    "libraryBtn": "Plan Library",
    "cloneBtn": "Clone Copy",
    "exportBtn": "Export JSON",
    "importBtn": "Import JSON",
    "newBlankPlan": "New Blank Plan",
    "selectCardPrompt": "Pick modules to add to your routine:",
    "noCardMatched": "No matching training modules found",
    "addStage": "Add Training Stage",
    "batchTrials": "Batch Trials:",
    "clearStages": "Clear Stages",
    "emptyPlanTip": "This plan is empty. Click 'Add Training Stage' below to pick modules."
  },
  "settings": {
    "title": "Global Preferences",
    "preferences": "System Preferences",
    "soundTitle": "Audio Feedback",
    "soundDesc": "High pitch chime on hits, subtle drop on misses",
    "hintsTitle": "Task Guide Prompts",
    "hintsDesc": "Display minimal hints above canvas. Turn off for full immersion.",
    "idleTitle": "Idle Pause Protection",
    "idleDesc": "Pause timer and blur screen when inactive or switching tabs",
    "idleOff": "Off",
    "idle30s": "30 sec",
    "idle60s": "60 sec",
    "idle120s": "120 sec",
    "sliderHitMarginTitle": "Slider Hit Outer Margin Area",
    "dataGovernance": "Data Backup & Governance",
    "exportStream": "Stream Export JSON",
    "exporting": "Streaming backup...",
    "importBackup": "Import JSON Backup",
    "pruneTitle": "Database Prune & Clean",
    "pruneDesc": "Prune polygon/grid geometry details older than 90 days",
    "pruneBtn": "Safe Prune",
    "resetPlansTitle": "Reset Official Plans",
    "resetPlansDesc": "Clear custom plans and restore official presets",
    "resetPlansBtn": "Reset Plans",
    "clearDataTitle": "Delete All Data",
    "clearDataDesc": "Clear all local logs and career profile statistics",
    "clearDataBtn": "Clear All",
    "autoNextTitle": "Auto Advance",
    "autoNextDesc": "Automatically load next question after submission",
    "autoNextDelayTitle": "Switch Delay Time",
    "adaptiveModeTitle": "Adaptive Engine Mode",
    "adaptiveBlock": "Block Accuracy (Recommended)",
    "adaptiveStaircase": "Classic 3U1D Staircase",
    "targetAccuracy": "Target Passing Accuracy",
    "blockSize": "Block Evaluation Size",
    "stepGranularityTitle": "Difficulty Step Granularity",
    "stepStandard": "Standard (Large step)",
    "stepFine": "Fine (Small step)"
  },
  "stats": {
    "title": "Cognitive Statistics",
    "subTitle": "Insights into multi-dimensional visual perceptual growth",
    "allModules": "All Training Projects",
    "todayTrials": "Today's Trials",
    "weekTrials": "Past 7 Days",
    "yearTrials": "Year-To-Date",
    "allTimeTrials": "All-Time",
    "pathMasteryTitle": "Cognitive Path Mastery",
    "pathMasterySubtitle": "Aggregated from full trial history",
    "challengeMasteryTitle": "Mental Challenge & Illusion Resistance",
    "challengeMasterySubtitle": "Anti-illusion & figure-ground reversal score",
    "heatmapTitle": "12-Week Activity Heatmap",
    "trendTitle": "Skill Peak Trajectory",
    "heatmapLess": "Less",
    "heatmapMore": "More",
    "dailyMaxLevel": "Daily Max Level",
    "noRecords": "No records under [{{filter}}]. Start training now!",
    "loading": "Aggregating materialized data..."
  }
}
~~~~~

#### Acts 2: 重构 `FilterEngine.tsx` 动态标签查表

~~~~~act
write_file
src/components/discovery/FilterEngine.tsx
~~~~~
~~~~~tsx
import {
  Boxes,
  Brain,
  Check,
  Compass,
  Eye,
  Filter,
  FlaskConical,
  MousePointer,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-preact';
import { useState } from 'preact/hooks';
import {
  CHALLENGE_TAGS,
  DOMAIN_TAGS,
  INTERACTION_TAGS,
  PATH_TAGS,
  STATUS_TAGS,
} from '../../config/tags';
import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type {
  CardQueryOptions,
  CardStatusTag,
  CognitivePathTag,
  InteractionTag,
  MentalChallengeTag,
  VisualDomainTag,
} from '../../types/card';

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
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState<boolean>(!compact);

  const packs = registry.getAllPacks();

  const handleSearchChange = (val: string) => {
    onChange({
      ...query,
      searchKeyword: val || undefined,
    });
  };

  const toggleDomain = (domain: VisualDomainTag) => {
    const current = query.domains || [];
    const next = current.includes(domain)
      ? current.filter((d) => d !== domain)
      : [...current, domain];
    onChange({ ...query, domains: next.length > 0 ? next : undefined });
  };

  const togglePath = (path: CognitivePathTag) => {
    const current = query.paths || [];
    const next = current.includes(path) ? current.filter((p) => p !== path) : [...current, path];
    onChange({ ...query, paths: next.length > 0 ? next : undefined });
  };

  const toggleChallenge = (challenge: MentalChallengeTag) => {
    const current = query.challenges || [];
    const next = current.includes(challenge)
      ? current.filter((c) => c !== challenge)
      : [...current, challenge];
    onChange({ ...query, challenges: next.length > 0 ? next : undefined });
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
      (query.domains && query.domains.length > 0) ||
      (query.paths && query.paths.length > 0) ||
      (query.challenges && query.challenges.length > 0) ||
      (query.interactions && query.interactions.length > 0) ||
      (query.statuses && query.statuses.length > 0),
  );

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* 顶栏：搜索条与快速筛选概览 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query.searchKeyword || ''}
            onInput={(e) => handleSearchChange((e.target as HTMLInputElement).value)}
            placeholder={t('home.searchPlaceholder')}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400 placeholder:font-normal"
          />
          {query.searchKeyword && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-shrink-0">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t('home.matchedModules', { count: totalMatches })}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
              showAdvanced
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showAdvanced ? t('home.collapseFilter') : t('home.expandFilter')}</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all flex items-center gap-1"
              title={t('common.clear')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('common.clear')}
            </button>
          )}
        </div>
      </div>

      {/* 扩展包 (Pack) 快速筛选标签 */}
      {packs.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="w-3 h-3 text-indigo-500" />
            {t('home.allPacks')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectPack(undefined)}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                !query.packId
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
              }`}
            >
              {!query.packId && <Check className="w-3 h-3" />}
              <span>{t('home.allPacks')}</span>
            </button>
            {packs.map((p) => {
              const isSelected = query.packId === p.packId;
              const packTitle = t(`packs.${p.packId}.meta.title`) || p.meta.title || p.packId;
              return (
                <button
                  type="button"
                  key={p.packId}
                  onClick={() => handleSelectPack(isSelected ? undefined : p.packId)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{packTitle}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded ${
                      isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {p.cards.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 正交四维标签矩阵折叠区 */}
      {showAdvanced && (
        <div className="space-y-3.5 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
          {/* 1. 视觉域维度 (Visual Domain) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3 h-3 text-indigo-500" />
              {t('home.domainSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((d) => {
                const isSelected = query.domains?.includes(d) ?? false;
                const tagMeta = DOMAIN_TAGS[d];
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDomain(d)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                        : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-600 border border-slate-200/80 hover:border-indigo-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 认知路径维度 (Cognitive Path) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-500" />
              {t('home.pathSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((p) => {
                const isSelected = query.paths?.includes(p) ?? false;
                const tagMeta = PATH_TAGS[p];
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => togglePath(p)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                        : 'bg-slate-50 hover:bg-emerald-50/60 text-slate-600 border border-slate-200/80 hover:border-emerald-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 心智抗性维度 (Mental Challenge) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Brain className="w-3 h-3 text-rose-500" />
              {t('home.challengeSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((c) => {
                const isSelected = query.challenges?.includes(c) ?? false;
                const tagMeta = CHALLENGE_TAGS[c];
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleChallenge(c)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-200'
                        : 'bg-slate-50 hover:bg-rose-50/60 text-slate-600 border border-slate-200/80 hover:border-rose-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 交互形态维度 (Interaction Mode) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MousePointer className="w-3 h-3 text-amber-500" />
              {t('home.interactionSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(INTERACTION_TAGS) as InteractionTag[]).map((i) => {
                const isSelected = query.interactions?.includes(i) ?? false;
                const tagMeta = INTERACTION_TAGS[i];
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => toggleInteraction(i)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-sm shadow-amber-200'
                        : 'bg-slate-50 hover:bg-amber-50/60 text-slate-600 border border-slate-200/80 hover:border-amber-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. 特性与发布状态 (Status Tag) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FlaskConical className="w-3 h-3 text-purple-500" />
              {t('home.statusSection')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['stable', 'experimental'] as CardStatusTag[]).map((st) => {
                const isSelected = query.statuses?.includes(st) ?? false;
                const tagMeta = STATUS_TAGS[st];
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
                    <span>{t(tagMeta.i18nKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 3: 改造 `CardPickerPanel.tsx` 动态查表

~~~~~act
write_file
src/components/plan/editor/CardPickerPanel.tsx
~~~~~
~~~~~tsx
import { Plus, Search, Sparkles, X } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { DOMAIN_TAGS } from '../../../config/tags';
import { useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { CardQueryOptions, VisualDomainTag } from '../../../types/card';

interface CardPickerPanelProps {
  isAddingCard: boolean;
  onToggleAdding: (val: boolean) => void;
  onAddItem: (cardId: string) => void;
}

export function CardPickerPanel({ isAddingCard, onToggleAdding, onAddItem }: CardPickerPanelProps) {
  const { t } = useTranslation();
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<VisualDomainTag | 'all'>('all');
  const [selectedPackId, setSelectedPackId] = useState<string>('all');

  const packs = registry.getAllPacks();

  const queryOptions: CardQueryOptions = useMemo(() => {
    return {
      searchKeyword: searchKeyword || undefined,
      domains: selectedDomain !== 'all' ? [selectedDomain] : undefined,
      packId: selectedPackId !== 'all' ? selectedPackId : undefined,
    };
  }, [searchKeyword, selectedDomain, selectedPackId]);

  const availableCards = useMemo(() => {
    return registry.queryCards(queryOptions);
  }, [queryOptions]);

  if (!isAddingCard) {
    return (
      <button
        type="button"
        onClick={() => onToggleAdding(true)}
        className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
      >
        <Plus className="w-4 h-4" />
        {t('plan.addStage')}
      </button>
    );
  }

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700">{t('plan.selectCardPrompt')}</span>
        </div>
        <button
          type="button"
          onClick={() => onToggleAdding(false)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          {t('home.collapseFilter')}
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchKeyword}
          onInput={(e) => setSearchKeyword((e.target as HTMLInputElement).value)}
          placeholder={t('home.searchPlaceholder')}
          className="w-full pl-8 pr-8 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {searchKeyword && (
          <button
            type="button"
            onClick={() => setSearchKeyword('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Pack 与视觉域快速筛选行 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            setSelectedDomain('all');
            setSelectedPackId('all');
          }}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
            selectedDomain === 'all' && selectedPackId === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          {t('common.all')} ({registry.getAllCards().length})
        </button>

        {packs.map((p) => {
          const packTitle = t(`packs.${p.packId}.meta.title`) || p.meta.title || p.packId;
          return (
            <button
              type="button"
              key={p.packId}
              onClick={() => {
                setSelectedPackId(selectedPackId === p.packId ? 'all' : p.packId);
                setSelectedDomain('all');
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
                selectedPackId === p.packId
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {packTitle}
            </button>
          );
        })}

        {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((domain) => (
          <button
            type="button"
            key={domain}
            onClick={() => {
              setSelectedDomain(selectedDomain === domain ? 'all' : domain);
              setSelectedPackId('all');
            }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
              selectedDomain === domain
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {t(DOMAIN_TAGS[domain].i18nKey)}
          </button>
        ))}
      </div>

      {/* 模块列表 */}
      {availableCards.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
          {t('plan.noCardMatched')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
          {availableCards.map((card) => {
            const Icon = card.icon;
            const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
            const cardDesc = t(`packs.${card.packId}.cards.${card.id}.desc`) || card.desc || '';
            return (
              <button
                type="button"
                key={card.id}
                onClick={() => onAddItem(card.id)}
                className="p-2.5 bg-white hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-300 rounded-xl text-left transition-all flex items-center justify-between gap-2 group active:scale-95 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform flex-shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400 truncate">{cardDesc}</div>
                  </div>
                </div>
                <Plus className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 4: 改造 `PlanStageList.tsx` 动态查表

~~~~~act
write_file
src/components/plan/editor/PlanStageList.tsx
~~~~~
~~~~~tsx
import { ArrowDown, ArrowUp, RotateCcw, Trash2, Zap } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import { registry } from '../../../core/registry';
import type { TrainingPlan } from '../../../types/plan';

interface PlanStageListProps {
  currentPlan: TrainingPlan;
  totalTrials: number;
  estimatedMin: number;
  trialPresets: number[];
  onBatchUpdateTrials: (trials: number) => void;
  onClearAll: () => void;
  onUpdateTrials: (id: string, trials: number) => void;
  onMoveItem: (index: number, direction: 'up' | 'down') => void;
  onRemoveItem: (id: string) => void;
}

export function PlanStageList({
  currentPlan,
  totalTrials,
  estimatedMin,
  trialPresets,
  onBatchUpdateTrials,
  onClearAll,
  onUpdateTrials,
  onMoveItem,
  onRemoveItem,
}: PlanStageListProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
          <span>{t('plan.stageCount', { count: currentPlan.items.length })}</span>
          <span className="text-slate-400 font-normal">
            • {t('plan.totalTrialsSummary', { trials: totalTrials })} · {t('plan.estimatedTime', { min: estimatedMin })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentPlan.items.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400">{t('plan.batchTrials')}</span>
              {trialPresets.map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => onBatchUpdateTrials(num)}
                  className="px-1.5 py-0.5 text-[10px] font-bold hover:text-indigo-600 rounded hover:bg-white transition-colors"
                >
                  {num}题
                </button>
              ))}
            </div>
          )}

          {currentPlan.items.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              {t('plan.clearStages')}
            </button>
          )}
        </div>
      </div>

      {currentPlan.items.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50/50">
          <Zap className="w-6 h-6 text-slate-300" />
          <span>{t('plan.emptyPlanTip')}</span>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {currentPlan.items.map((item, idx) => {
            const card = registry.getCardById(item.cardId);
            if (!card) return null;
            const Icon = card.icon;
            const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
            const cardDesc = t(`packs.${card.packId}.cards.${card.id}.desc`) || card.desc || '';

            return (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 text-white font-mono text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{cardTitle}</div>
                    <div className="text-[10px] text-slate-400">{cardDesc.slice(0, 26)}...</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
                    {trialPresets.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => onUpdateTrials(item.id, preset)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                          item.targetTrials === preset
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(idx, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                      title="上移"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentPlan.items.length - 1}
                      onClick={() => onMoveItem(idx, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                      title="下移"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-1"
                      title="移除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 5: 改造 `PlanHeroCard.tsx` 动态查表

~~~~~act
write_file
src/components/plan/PlanHeroCard.tsx
~~~~~
~~~~~tsx
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Play,
  Plus,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { registry } from '../../core/registry';
import type { TrainingPlan } from '../../types/plan';

interface PlanHeroCardProps {
  plan: TrainingPlan;
  allPlans?: TrainingPlan[];
  onStartPlan: () => void;
  onOpenEditor: () => void;
  onSelectPlan?: (planId: string) => void;
}

export function PlanHeroCard({
  plan,
  allPlans = [],
  onStartPlan,
  onOpenEditor,
  onSelectPlan,
}: PlanHeroCardProps) {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const hasItems = plan.items && plan.items.length > 0;
  const totalTrials = (plan.items || []).reduce((acc, curr) => acc + curr.targetTrials, 0);
  const estimatedMin = Math.max(1, Math.round((totalTrials * 3.5) / 60));

  const favoritePlans = allPlans.filter((p) => p.isFavorite ?? true);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  if (!hasItems) {
    return (
      <div className="w-full bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 border-2 border-dashed border-indigo-200/80 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-100 text-indigo-600 rounded-2xl">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">{t('plan.todayPlan')}</h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                {t('common.empty')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t('plan.emptyHeroDesc')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditor}
          className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t('plan.customizeBtn')}
        </button>
      </div>
    );
  }

  return (
    <div className="group w-full bg-white border border-indigo-100 hover:border-indigo-300 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-5 relative z-10">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm shadow-indigo-200">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {favoritePlans.length > 1 && onSelectPlan ? (
                <div ref={dropdownRef} className="relative inline-block text-left">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="group/btn inline-flex items-center gap-1.5 text-lg font-black text-slate-900 tracking-tight hover:text-indigo-600 transition-colors focus:outline-none"
                  >
                    <span>{plan.name}</span>
                    <div
                      className={`p-1 rounded-lg bg-slate-100 group-hover/btn:bg-indigo-50 text-slate-500 group-hover/btn:text-indigo-600 transition-all duration-200 ${
                        isDropdownOpen ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 z-40 w-72 sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                        <span>{t('plan.switchPlan')}</span>
                        <span className="font-mono">{t('plan.availableCount', { count: favoritePlans.length })}</span>
                      </div>

                      <div className="max-h-60 overflow-y-auto py-1 space-y-1 pr-1">
                        {favoritePlans.map((p) => {
                          const isSelected = p.id === plan.id;
                          const stageCount = (p.items || []).length;
                          const pTrials = (p.items || []).reduce(
                            (acc, c) => acc + c.targetTrials,
                            0,
                          );

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                onSelectPlan(p.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2.5 ${
                                isSelected
                                  ? 'bg-indigo-50/80 text-indigo-900 font-bold border border-indigo-200/80 shadow-sm'
                                  : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold truncate">{p.name}</span>
                                  {p.isBuiltin && (
                                    <span className="text-[9px] px-1 bg-slate-100 text-slate-500 rounded">
                                      {t('common.official')}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {t('plan.stageCount', { count: stageCount })} • {t('plan.totalTrialsSummary', { trials: pTrials })}
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <h2 className="text-lg font-black text-slate-900 tracking-tight">{plan.name}</h2>
              )}

              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                {t('plan.stageCount', { count: plan.items.length })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-0.5">
              <span>{t('plan.totalTrialsSummary', { trials: totalTrials })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {t('plan.estimatedTime', { min: estimatedMin })}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditor}
          className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          title={t('plan.editPlan')}
        >
          <Sliders className="w-3.5 h-3.5" />
          {t('plan.editPlan')}
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {plan.items.map((item, idx) => {
          const card = registry.getCardById(item.cardId);
          if (!card) return null;
          const Icon = card.icon;
          const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;

          return (
            <div key={item.id} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-2xl shadow-inner">
                <div className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono text-[10px] font-black">
                  {idx + 1}
                </div>
                <Icon className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">{cardTitle}</span>
                <span className="text-[11px] font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                  {item.targetTrials}题
                </span>
              </div>
              {idx < plan.items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
        <div className="text-xs text-slate-400 font-medium">
          {t('plan.syncNotice')}
        </div>

        <button
          type="button"
          onClick={onStartPlan}
          className="py-3 px-6 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 ml-auto"
        >
          <Play className="w-4 h-4 fill-current" />
          {t('plan.startPlan')}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
~~~~~

#### Acts 6: 改造 `TrainingShell.tsx` 动态查表

~~~~~act
write_file
src/components/training/TrainingShell.tsx
~~~~~
~~~~~tsx
import { ArrowLeft, ChevronRight, Clock, Crosshair, FlaskConical, HelpCircle } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';
import { SessionSummaryModal } from '../SessionSummaryModal';
import { IdlePauseOverlay } from '../common/IdlePauseOverlay';

export interface TrainingSessionHandle {
  totalTrials: number;
  elapsedSeconds: number;
  isFinished: boolean;
  isIdle: boolean;
  showAnswer: boolean;
  showSummaryModal: boolean;
  sessionHistory: SessionHistoryItem[];
  resumeFromIdle: () => void;
  handleNextQuestion: () => void;
  handleRequestFinish: () => void;
  handleFinishSession: () => void;
  handleRestartSession: () => void;
}

interface TrainingShellProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  currentLevel: number;
  isTargeting?: boolean;
  autoNext: boolean;
  session: TrainingSessionHandle;
  showExitButton?: boolean;
  showTimer?: boolean;
  onExit: () => void;
  children: (state: { disabled: boolean; isIdle: boolean }) => ComponentChildren;
}

export function TrainingShell({
  card,
  sessionType,
  currentLevel,
  isTargeting = false,
  autoNext,
  session,
  showExitButton = true,
  showTimer = true,
  children,
}: TrainingShellProps) {
  const { t } = useTranslation();
  const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
  const instruction = t(`packs.${card.packId}.cards.${card.id}.instruction`) || card.instruction || '';
  const desc = t(`packs.${card.packId}.cards.${card.id}.desc`) || card.desc || '';
  const badgeKey = card.tags.domain[0] ? `tags.domains.${card.tags.domain[0]}` : '';
  const badge = badgeKey ? t(badgeKey) : '';

  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  const {
    totalTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    showAnswer,
    showSummaryModal,
    sessionHistory,
    resumeFromIdle,
    handleNextQuestion,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  } = session;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
      {/* 统一 Header 状态栏 */}
      <header className="w-full bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {showExitButton && (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('shell.exitTraining')}
            </button>
          )}
          <div className="relative flex items-center">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5">
              {cardTitle} {badge ? `· ${badge}` : ''} | {sessionType === 'benchmark' ? t('shell.benchmark') : t('shell.training')}
              {(instruction || desc) && (
                <button
                  type="button"
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  className="text-indigo-400 hover:text-indigo-700 transition-colors p-0.5 rounded-md"
                  title={t('shell.instructionTitle')}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </span>

            {showHelpTooltip && (instruction || desc) && (
              <div className="absolute left-0 top-full mt-2 z-40 w-72 bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {t('shell.instructionTitle')}
                </div>
                <p className="text-slate-200 text-[11px]">{instruction || desc}</p>
              </div>
            )}
          </div>

          {isTargeting && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              {t('shell.targeting')}
            </span>
          )}

          {card.tags.status === 'experimental' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
              {t('shell.experimental')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              {t('shell.trialsCount')}
            </span>
            <span className="font-black text-gray-800">
              {totalTrials} {sessionType === 'benchmark' ? '/ 20' : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-gray-400 block uppercase tracking-wider">
              {t('shell.currentLevel')}
            </span>
            <span className="font-black text-indigo-600">Level {currentLevel}</span>
          </div>

          {showTimer && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-bold text-slate-700">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 统一 Canvas 居中容器与休眠遮罩 */}
      <div className="relative w-full flex justify-center">
        {children({ disabled: isFinished || isIdle, isIdle })}
        {isIdle && <IdlePauseOverlay onResume={resumeFromIdle} />}
      </div>

      {/* 统一手动下一题控制栏 */}
      {!autoNext && (
        <div className="flex items-center justify-center">
          {isFinished ? (
            <button
              type="button"
              onClick={handleRequestFinish}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all active:scale-95"
            >
              {t('shell.viewSummary')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={!showAnswer}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1 ${
                showAnswer
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {t('common.nextQuestion')}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 统一结课总结弹窗 */}
      {showSummaryModal && (
        <SessionSummaryModal
          card={card}
          sessionType={sessionType}
          elapsedSeconds={elapsedSeconds}
          history={sessionHistory}
          onClose={handleFinishSession}
          onRestart={handleRestartSession}
        />
      )}
    </div>
  );
}
~~~~~

#### Acts 7: 改造 `GlobalStatsModal.tsx` 动态查表

~~~~~act
write_file
src/components/GlobalStatsModal.tsx
~~~~~
~~~~~tsx
import {
  Activity,
  BarChart2,
  Brain,
  Calendar,
  ChevronDown,
  Compass,
  Filter,
  Target,
  TrendingUp,
  X,
} from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CHALLENGE_TAGS, DOMAIN_TAGS, PATH_TAGS } from '../config/tags';
import { useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CognitivePathTag, MentalChallengeTag, VisualDomainTag } from '../types/card';
import { renderTrendChartCanvas } from '../utils/canvas/drawTrendChart';
import { type DailySummaryData, getDailySummaries, getLocalDateString } from '../utils/db/index';

interface GlobalStatsModalProps {
  onClose: () => void;
}

export function GlobalStatsModal({ onClose }: GlobalStatsModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<DailySummaryData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const packs = registry.getAllPacks();
  const allCards = registry.getAllCards();

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const data = await getDailySummaries();
      if (isMounted) {
        setSummaries(data);
        setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 过滤后的汇总记录
  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (selectedFilter === 'all') return true;

      if (selectedFilter.startsWith('pack:')) {
        const targetPackId = selectedFilter.replace('pack:', '');
        const pack = registry.getPack(targetPackId);
        const packCardIds = new Set(pack?.cards.map((c) => c.id) || []);
        return packCardIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('domain:')) {
        const targetDomain = selectedFilter.replace('domain:', '') as VisualDomainTag;
        const matchedCards = registry.queryCards({ domains: [targetDomain] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('path:')) {
        const targetPath = selectedFilter.replace('path:', '') as CognitivePathTag;
        const matchedCards = registry.queryCards({ paths: [targetPath] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('challenge:')) {
        const targetChallenge = selectedFilter.replace('challenge:', '') as MentalChallengeTag;
        const matchedCards = registry.queryCards({ challenges: [targetChallenge] });
        const matchedIds = new Set(matchedCards.map((c) => c.id));
        return matchedIds.has(s.cardId || s.mode);
      }

      if (selectedFilter.startsWith('card:')) {
        const targetCardId = selectedFilter.replace('card:', '');
        return s.cardId === targetCardId || s.mode === targetCardId;
      }

      return true;
    });
  }, [summaries, selectedFilter]);

  const getCurrentFilterLabel = () => {
    if (selectedFilter === 'all') return t('stats.allModules');
    if (selectedFilter.startsWith('pack:')) {
      const pId = selectedFilter.replace('pack:', '');
      const pTitle = t(`packs.${pId}.meta.title`) || registry.getPack(pId)?.meta.title || pId;
      return `${t('home.allPacks')} • ${pTitle}`;
    }
    if (selectedFilter.startsWith('domain:')) {
      const d = selectedFilter.replace('domain:', '') as VisualDomainTag;
      return `Domain • ${t(DOMAIN_TAGS[d]?.i18nKey || d)}`;
    }
    if (selectedFilter.startsWith('path:')) {
      const p = selectedFilter.replace('path:', '') as CognitivePathTag;
      return `Path • ${t(PATH_TAGS[p]?.i18nKey || p)}`;
    }
    if (selectedFilter.startsWith('challenge:')) {
      const c = selectedFilter.replace('challenge:', '') as MentalChallengeTag;
      return `Challenge • ${t(CHALLENGE_TAGS[c]?.i18nKey || c)}`;
    }
    if (selectedFilter.startsWith('card:')) {
      const cardId = selectedFilter.replace('card:', '');
      const card = registry.getCardById(cardId);
      const cTitle = card ? t(`packs.${card.packId}.cards.${card.id}.title`) || card.title : cardId;
      return `${cTitle}`;
    }
    return t('stats.allModules');
  };

  const now = new Date();
  const todayStr = getLocalDateString(now.getTime());
  const startOfWeekStr = getLocalDateString(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const startOfYearStr = `${now.getFullYear()}-01-01`;

  const { stats, dailyData } = useMemo(() => {
    const statsObj = {
      today: { total: 0, hits: 0 },
      week: { total: 0, hits: 0 },
      year: { total: 0, hits: 0 },
      allTime: { total: 0, hits: 0 },
    };

    const data: Record<string, { total: number; maxLevel: number }> = {};

    for (const s of filteredSummaries) {
      statsObj.allTime.total += s.totalCount;
      statsObj.allTime.hits += s.hitCount;

      if (s.date === todayStr) {
        statsObj.today.total += s.totalCount;
        statsObj.today.hits += s.hitCount;
      }
      if (s.date >= startOfWeekStr) {
        statsObj.week.total += s.totalCount;
        statsObj.week.hits += s.hitCount;
      }
      if (s.date >= startOfYearStr) {
        statsObj.year.total += s.totalCount;
        statsObj.year.hits += s.hitCount;
      }

      if (!data[s.date]) {
        data[s.date] = { total: 0, maxLevel: s.maxLevel };
      }
      data[s.date].total += s.totalCount;
      data[s.date].maxLevel = Math.max(data[s.date].maxLevel, s.maxLevel);
    }

    return { stats: statsObj, dailyData: data };
  }, [filteredSummaries, todayStr, startOfWeekStr, startOfYearStr]);

  const calcAcc = (hits: number, total: number) =>
    total === 0 ? 0 : Math.round((hits / total) * 100);

  const heatmapDays = 84;
  const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const heatmapData = Array.from({ length: heatmapDays }).map((_, i) => {
    const dMs = startOfTodayMs - (heatmapDays - 1 - i) * 24 * 60 * 60 * 1000;
    const dateStr = getLocalDateString(dMs);
    return {
      date: dateStr,
      count: dailyData[dateStr]?.total || 0,
    };
  });

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-100';
    if (count < 10) return 'bg-indigo-200';
    if (count < 25) return 'bg-indigo-400';
    if (count < 50) return 'bg-indigo-600';
    return 'bg-indigo-800';
  };

  // 按正交认知路径 (Cognitive Path) 聚合掌握度数据
  const pathMasteryList = useMemo(() => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId || s.mode;
      const prev = cardSummaryMap.get(key) || { total: 0, hits: 0 };
      cardSummaryMap.set(key, {
        total: prev.total + s.totalCount,
        hits: prev.hits + s.hitCount,
      });
    }

    return (Object.keys(PATH_TAGS) as CognitivePathTag[]).map((path) => {
      const matchingCards = registry.queryCards({ paths: [path] });
      let pathTotal = 0;
      let pathHits = 0;

      for (const card of matchingCards) {
        const item = cardSummaryMap.get(card.id);
        if (item) {
          pathTotal += item.total;
          pathHits += item.hits;
        }
      }

      const acc = pathTotal > 0 ? Math.round((pathHits / pathTotal) * 100) : 0;
      return {
        path,
        label: t(PATH_TAGS[path].i18nKey),
        total: pathTotal,
        hits: pathHits,
        accuracy: acc,
        cardCount: matchingCards.length,
      };
    });
  }, [summaries, t]);

  // 按心智抗性 (Mental Challenge) 聚合掌握度数据
  const challengeMasteryList = useMemo(() => {
    const cardSummaryMap = new Map<string, { total: number; hits: number }>();
    for (const s of summaries) {
      const key = s.cardId || s.mode;
      const prev = cardSummaryMap.get(key) || { total: 0, hits: 0 };
      cardSummaryMap.set(key, {
        total: prev.total + s.totalCount,
        hits: prev.hits + s.hitCount,
      });
    }

    return (Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((ch) => {
      const matchingCards = registry.queryCards({ challenges: [ch] });
      let chTotal = 0;
      let chHits = 0;

      for (const card of matchingCards) {
        const item = cardSummaryMap.get(card.id);
        if (item) {
          chTotal += item.total;
          chHits += item.hits;
        }
      }

      const acc = chTotal > 0 ? Math.round((chHits / chTotal) * 100) : 0;
      return {
        challenge: ch,
        label: t(CHALLENGE_TAGS[ch].i18nKey),
        total: chTotal,
        hits: chHits,
        accuracy: acc,
        cardCount: matchingCards.length,
      };
    });
  }, [summaries, t]);

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (canvas) {
      renderTrendChartCanvas(canvas, dailyData);
    }
  }, [loading, dailyData]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{t('stats.title')}</h2>
              <p className="text-xs text-slate-400">{t('stats.subTitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 text-indigo-500 absolute left-3 pointer-events-none" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter((e.target as HTMLSelectElement).value)}
                className="pl-8 pr-8 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-all shadow-sm max-w-xs truncate"
              >
                <option value="all">{t('stats.allModules')}</option>

                <optgroup label="—— 扩展包 (Packs) ——">
                  {packs.map((p) => {
                    const packTitle = t(`packs.${p.packId}.meta.title`) || p.meta.title || p.packId;
                    return (
                      <option key={`pack:${p.packId}`} value={`pack:${p.packId}`}>
                        {packTitle}
                      </option>
                    );
                  })}
                </optgroup>

                <optgroup label="—— 基础视觉域 (Domains) ——">
                  {(Object.keys(DOMAIN_TAGS) as VisualDomainTag[]).map((domain) => (
                    <option key={`domain:${domain}`} value={`domain:${domain}`}>
                      {t(DOMAIN_TAGS[domain].i18nKey)}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 认知推演路径 (Paths) ——">
                  {(Object.keys(PATH_TAGS) as CognitivePathTag[]).map((path) => (
                    <option key={`path:${path}`} value={`path:${path}`}>
                      {t(PATH_TAGS[path].i18nKey)}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 核心心智抗性 (Challenges) ——">
                  {(Object.keys(CHALLENGE_TAGS) as MentalChallengeTag[]).map((ch) => (
                    <option key={`challenge:${ch}`} value={`challenge:${ch}`}>
                      {t(CHALLENGE_TAGS[ch].i18nKey)}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="—— 具体训练模块 (Cards) ——">
                  {allCards.map((card) => {
                    const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
                    return (
                      <option key={`card:${card.id}`} value={`card:${card.id}`}>
                        {cardTitle}
                      </option>
                    );
                  })}
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            {t('stats.loading')}
          </div>
        ) : stats.allTime.total === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <Activity className="w-10 h-10 text-slate-300" />
            {t('stats.noRecords', { filter: getCurrentFilterLabel() })}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* 核心指标卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  {t('stats.todayTrials')}
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.today.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-indigo-600 font-semibold mt-1">
                  {t('common.accuracy')} {calcAcc(stats.today.hits, stats.today.total)}%
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  {t('stats.weekTrials')}
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.week.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  {t('common.accuracy')} {calcAcc(stats.week.hits, stats.week.total)}%
                </div>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  {t('stats.yearTrials')}
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.year.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-amber-600 font-semibold mt-1">
                  {t('common.accuracy')} {calcAcc(stats.year.hits, stats.year.total)}%
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                  {t('stats.allTimeTrials')}
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {stats.allTime.total}{' '}
                  <span className="text-xs font-semibold text-slate-400 font-normal">题</span>
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  打卡 {Object.keys(dailyData).length} 天
                </div>
              </div>
            </div>

            {/* 认知路径推演能力矩阵 */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  {t('stats.pathMasteryTitle')}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{t('stats.pathMasterySubtitle')}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {pathMasteryList.map((pm) => (
                  <div
                    key={pm.path}
                    className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-sm space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="truncate">{pm.label}</span>
                      <span
                        className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                          pm.total === 0
                            ? 'bg-slate-100 text-slate-400'
                            : pm.accuracy >= 80
                              ? 'bg-emerald-50 text-emerald-700 font-black'
                              : pm.accuracy >= 60
                                ? 'bg-amber-50 text-amber-700 font-black'
                                : 'bg-rose-50 text-rose-700 font-black'
                        }`}
                      >
                        {pm.total > 0 ? `${pm.accuracy}%` : '--'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>已练 {pm.total} 题</span>
                      <span>{pm.cardCount} 模块</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 核心心智抗性矩阵 */}
            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-rose-500" />
                  {t('stats.challengeMasteryTitle')}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{t('stats.challengeMasterySubtitle')}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {challengeMasteryList.map((cm) => (
                  <div
                    key={cm.challenge}
                    className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-sm space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="truncate">{cm.label.split(' ')[0]}</span>
                      <span
                        className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                          cm.total === 0
                            ? 'bg-slate-100 text-slate-400'
                            : cm.accuracy >= 80
                              ? 'bg-rose-50 text-rose-700 font-black'
                              : cm.accuracy >= 60
                                ? 'bg-amber-50 text-amber-700 font-black'
                                : 'bg-slate-100 text-slate-600 font-black'
                        }`}
                      >
                        {cm.total > 0 ? `${cm.accuracy}%` : '--'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>已练 {cm.total} 题</span>
                      <span>{cm.cardCount} 模块</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 热力图与演进曲线图 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-4">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>{t('stats.heatmapTitle')}</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-normal">
                    {t('stats.heatmapLess')} <div className="w-2.5 h-2.5 rounded-sm bg-slate-100" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-200" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-800" /> {t('stats.heatmapMore')}
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1.5 self-center">
                  {heatmapData.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date} : 训练了 ${day.count} 题`}
                      className={`w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125 cursor-help ${getHeatmapColor(
                        day.count,
                      )}`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl flex flex-col gap-2">
                <div className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>{t('stats.trendTitle')}</span>
                  <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                    {t('stats.dailyMaxLevel')}
                  </span>
                </div>
                <canvas ref={canvasRef} width={340} height={150} className="w-full mt-2" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

#### Acts 8: 改造 `Home.tsx` 对接联邦 i18n

~~~~~act
write_file
src/views/Home.tsx
~~~~~
~~~~~tsx
import { BarChart2, Clock, Inbox, RotateCcw, Sliders, Sparkles } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { ModeCard } from '../components/common/ModeCard';
import { FilterEngine } from '../components/discovery/FilterEngine';
import { PlanHeroCard } from '../components/plan/PlanHeroCard';
import { useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CardQueryOptions } from '../types/card';
import type { TrainingPlan } from '../types/plan';
import { type UnifiedProfileData, formatTotalTime } from '../utils/db/index';

interface HomeProps {
  totalTimeMs: number;
  todayStats: Record<string, { count: number; timeMs: number }>;
  profiles: Record<string, UnifiedProfileData>;
  trainingPlan: TrainingPlan;
  allPlans?: TrainingPlan[];
  query?: CardQueryOptions;
  onQueryChange?: (query: CardQueryOptions) => void;
  onStartCard: (cardId: string, type: 'training' | 'benchmark') => void;
  onOpenCardSettings: (cardId: string) => void;
  onOpenCardAnalytics: (cardId: string) => void;
  onStartPlan: () => void;
  onOpenPlanEditor: () => void;
  onSelectPlan?: (planId: string) => void;
  onOpenGlobalSettings: () => void;
  onOpenGlobalStats: () => void;
}

export function Home({
  totalTimeMs,
  todayStats,
  profiles,
  trainingPlan,
  allPlans = [],
  query: externalQuery,
  onQueryChange,
  onStartCard,
  onOpenCardSettings,
  onOpenCardAnalytics,
  onStartPlan,
  onOpenPlanEditor,
  onSelectPlan,
  onOpenGlobalSettings,
  onOpenGlobalStats,
}: HomeProps) {
  const { t } = useTranslation();
  const [localQuery, setLocalQuery] = useState<CardQueryOptions>(externalQuery || {});

  const activeQuery = externalQuery !== undefined ? externalQuery : localQuery;

  const handleQueryChange = (newQuery: CardQueryOptions) => {
    setLocalQuery(newQuery);
    onQueryChange?.(newQuery);
  };

  // 结合查询条件获取过滤后的卡片
  const filteredCards = useMemo(() => {
    return registry.queryCards(activeQuery);
  }, [activeQuery]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
      {/* 品牌 Header 状态栏 */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 px-7 py-5 sm:px-8 sm:py-6 rounded-3xl shadow-sm flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-200">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {t('common.appName')}{' '}
              <span className="text-xs font-extrabold px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                v{__APP_VERSION__}
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {t('common.appSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-semibold">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>{formatTotalTime(totalTimeMs)}</span>
          </div>
          <button
            type="button"
            onClick={onOpenGlobalStats}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title={t('common.globalStats')}
          >
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            {t('common.stats')}
          </button>
          <button
            type="button"
            onClick={onOpenGlobalSettings}
            className="p-2.5 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title={t('common.globalSettings')}
          >
            <Sliders className="w-4 h-4" />
            {t('common.settings')}
          </button>
        </div>
      </div>

      {/* 今日定制训练流 Hero 区域 */}
      <PlanHeroCard
        plan={trainingPlan}
        allPlans={allPlans}
        onStartPlan={onStartPlan}
        onOpenEditor={onOpenPlanEditor}
        onSelectPlan={onSelectPlan}
      />

      {/* 大盘发现库核心筛选引擎 */}
      <FilterEngine
        query={activeQuery}
        totalMatches={filteredCards.length}
        onChange={handleQueryChange}
      />

      {/* 大盘卡片网格流 (Discovery Hub Cards Grid) */}
      {filteredCards.length === 0 ? (
        <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-3xl">
            <Inbox className="w-8 h-8" />
          </div>
          <div className="text-base font-bold text-slate-800">{t('home.noMatchTitle')}</div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            {t('home.noMatchDesc')}
          </p>
          <button
            type="button"
            onClick={() => handleQueryChange({})}
            className="mt-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('home.resetFilter')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => {
            const profile = profiles[card.id];
            const totalTrials = profile?.totalTrials || 0;
            const accuracy =
              totalTrials > 0 && profile ? Math.round((profile.totalHits / totalTrials) * 100) : 0;
            const currentLevel = profile?.currentLevel || 5;
            const stat = todayStats[card.id] || { count: 0, timeMs: 0 };
            const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;
            const cardDesc = t(`packs.${card.packId}.cards.${card.id}.desc`) || card.desc || '';

            return (
              <ModeCard
                key={card.id}
                title={cardTitle}
                desc={cardDesc}
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
          })}
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 9: 改造 `PlanTrainingView.tsx` 动态查表

~~~~~act
write_file
src/views/PlanTrainingView.tsx
~~~~~
~~~~~tsx
import { ArrowLeft, Clock, FastForward } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { type PlanStageResult, PlanSummaryModal } from '../components/plan/PlanSummaryModal';
import { useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { TrainingPlan } from '../types/plan';
import { getProfile } from '../utils/db/index';
import { type UserSettings, getCardSettings } from '../utils/settings';
import { GenericTrainingView } from './GenericTrainingView';

interface PlanTrainingViewProps {
  plan: TrainingPlan;
  settings: UserSettings;
  onExit: () => void;
}

export function PlanTrainingView({ plan, settings, onExit }: PlanTrainingViewProps) {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stageResults, setStageResults] = useState<PlanStageResult[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [stageInitialLevel, setStageInitialLevel] = useState<number>(5);
  const [isLevelLoaded, setIsLevelLoaded] = useState<boolean>(false);
  const [planSessionKey, setPlanSessionKey] = useState<number>(0);
  const [isPlanIdle, setIsPlanIdle] = useState<boolean>(false);

  const validItems = (plan.items || []).filter((item) =>
    Boolean(registry.getCardById(item.cardId)),
  );

  const currentStep = validItems[currentStepIndex];
  const currentCard = currentStep ? registry.getCardById(currentStep.cardId) : null;

  useEffect(() => {
    let isMounted = true;
    const stepIdx = currentStepIndex;
    const sessionKey = planSessionKey;

    if (currentCard) {
      setIsLevelLoaded(false);
      getProfile(currentCard.id)
        .then((p) => {
          if (!isMounted) return;
          setStageInitialLevel(p?.currentLevel || 5);
          setIsLevelLoaded(true);
        })
        .catch((err) => {
          console.error(
            `Failed to load profile for card ${currentCard.id} at step ${stepIdx} (session ${sessionKey}):`,
            err,
          );
          if (!isMounted) return;
          setStageInitialLevel(5);
          setIsLevelLoaded(true);
        });
    } else {
      setIsLevelLoaded(true);
    }
    return () => {
      isMounted = false;
    };
  }, [currentCard, currentStepIndex, planSessionKey]);

  const handleIdleChange = useCallback((idle: boolean) => {
    setIsPlanIdle(idle);
  }, []);

  const handleIdleResume = useCallback((idleDurationMs: number) => {
    setSessionStartTime((prev) => prev + idleDurationMs);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!showSummaryModal && !isPlanIdle && isLevelLoaded) {
        setTotalElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime, showSummaryModal, isPlanIdle, isLevelLoaded]);

  const handleStageReached = useCallback(
    (history: SessionHistoryItem[]) => {
      if (!currentCard) return;

      const stageRes: PlanStageResult = {
        card: currentCard,
        targetTrials: currentStep.targetTrials,
        history,
      };

      const nextResults = [...stageResults, stageRes];
      setStageResults(nextResults);

      if (currentStepIndex + 1 < validItems.length) {
        setIsLevelLoaded(false);
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        setShowSummaryModal(true);
      }
    },
    [currentCard, currentStep, currentStepIndex, stageResults, validItems.length],
  );

  const handleSkipCurrentStage = useCallback(() => {
    if (!currentCard) return;
    const skippedRes: PlanStageResult = {
      card: currentCard,
      targetTrials: currentStep.targetTrials,
      history: [],
    };
    const nextResults = [...stageResults, skippedRes];
    setStageResults(nextResults);

    if (currentStepIndex + 1 < validItems.length) {
      setIsLevelLoaded(false);
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setShowSummaryModal(true);
    }
  }, [currentCard, currentStep, currentStepIndex, stageResults, validItems.length]);

  const handleRequestExit = useCallback(() => {
    if (stageResults.length > 0) {
      setShowSummaryModal(true);
    } else {
      onExit();
    }
  }, [stageResults.length, onExit]);

  const handleRestartPlan = useCallback(() => {
    setIsLevelLoaded(false);
    setIsPlanIdle(false);
    setShowSummaryModal(false);
    setCurrentStepIndex(0);
    setStageResults([]);
    setTotalElapsedSeconds(0);
    setSessionStartTime(Date.now());
    setPlanSessionKey((prev) => prev + 1);
  }, []);

  if (!currentCard || validItems.length === 0) {
    onExit();
    return null;
  }

  const plugin = registry.getPluginByCardId(currentCard.id);
  if (!plugin) {
    onExit();
    return null;
  }
  const cardConfig = getCardSettings(settings, currentCard.id);
  const cardTitle = t(`packs.${currentCard.packId}.cards.${currentCard.id}.title`) || currentCard.title || currentCard.id;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto mb-4 bg-white border border-slate-200/80 px-4 sm:px-5 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestExit}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
            title={t('plan.exitPlan')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('plan.exitPlan')}
          </button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-xl">
              {t('plan.stageProgress', { current: currentStepIndex + 1, total: validItems.length })}
            </span>
            <span className="text-xs font-bold text-slate-800 tracking-tight">{plan.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-xs text-slate-400 font-mono font-semibold hidden sm:block">
            {t('plan.stageGoal', { trials: currentStep.targetTrials })}
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-xs font-bold text-slate-700">
              {formatTime(totalElapsedSeconds)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSkipCurrentStage}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
            title={t('plan.skipStage')}
          >
            <FastForward className="w-3.5 h-3.5 text-indigo-500" />
            {t('plan.skipStage')}
          </button>
        </div>
      </div>

      {!isLevelLoaded ? (
        <div className="w-full max-w-5xl mx-auto flex items-center justify-center h-64 text-slate-400 text-xs font-semibold bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          {t('plan.loadingLevel', { title: cardTitle })}
        </div>
      ) : (
        <GenericTrainingView
          key={`plan-stage-${planSessionKey}-${currentStepIndex}-${currentCard.id}`}
          card={currentCard}
          plugin={plugin}
          sessionType="training"
          initialLevel={stageInitialLevel}
          settings={cardConfig}
          globalSettings={settings.global}
          targetLimitTrials={currentStep.targetTrials}
          onTargetLimitReached={handleStageReached}
          onIdleChange={handleIdleChange}
          onIdleResume={handleIdleResume}
          showExitButton={false}
          showTimer={false}
          onExit={handleRequestExit}
        />
      )}

      {showSummaryModal && (
        <PlanSummaryModal
          planName={plan.name}
          stageResults={stageResults}
          totalElapsedSeconds={totalElapsedSeconds}
          onClose={onExit}
          onRestart={handleRestartPlan}
        />
      )}
    </div>
  );
}
~~~~~

### 下一步建议
1. **执行单元测试校验**：运行 `npm test` 确认全量测试套件 100% 通过。
2. **启动 Phase 5 全量回归与双语热切测试**：测试切换 `en-US` 语系时，主页卡片、筛选引擎、训练 HUD 及分析报告是否均完整呈现无异常。

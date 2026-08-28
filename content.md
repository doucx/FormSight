我将生成 Quipu 计划以扩充系统全局中英文公共词典，并将所有通用交互容器、偏好配置模态窗、会话结算和弱点分析组件全面重构为使用 `useTranslation` 进行动态多语言查表渲染。

## [WIP] refactor(i18n): 扩充全局公共词典并重构所有通用交互容器组件

### 用户需求
1. 扩充 `src/locales/zh-CN.json` 和 `src/locales/en-US.json` 全局公共词典，收敛题目通用操作（选项名称、提交确认、真理值与误差反馈、三视图标识、会话总结与弱点分析通用文本）。
2. 重构通用交互容器与模态窗组件（`Choice2AfcContainer`, `ChoiceNafcContainer`, `StandardSliderView`, `StandardNafcView`, `PointClickCanvas`, `SettingsModal`, `SessionSummaryModal`, `WeaknessAnalyticsModal`, `SliderMarginGroup`, `TargetingSection`, `DynamicDomainSettings` 等），全面接入 `useTranslation()` 实现动态中英文切换。

### 评论
当前架构虽然在微内核中实现了联邦 i18n 调度引擎，但由于通用容器组件和设置弹窗中散落了大量硬编码中文，导致系统在切换到 `en-US` 时卡片内部依然呈现中文。通过全面查表化重构通用容器层，能够为所有 7 大知觉 Pack 提供标准统一的双语支持。

### 目标
1. 在 `zh-CN.json` 与 `en-US.json` 中补全所有交互容器、设置表单、三视图、答题反馈及结算/分析所用的公共词条。
2. 重构 `Choice2AfcContainer`、`ChoiceNafcContainer`、`StandardSliderView`、`StandardNafcView` 和 `PointClickCanvas`，确保默认的选项文案、无障碍标签和提交按钮均走 i18n 查表。
3. 重构 `SettingsModal`、`SliderMarginGroup`、`TargetingSection` 与 `DynamicDomainSettings`，支持中英文双向偏好配置。
4. 重构 `SessionSummaryModal` 与 `WeaknessAnalyticsModal`，实现总结大盘与弱点分析诊断的多语言切换。

### 基本原理
通过在通用组件层注入 `useTranslation()`，使所有 UI 文案均动态响应全局语言切换事件。对于需要支持自定义或 Pack 覆盖的属性（如 `submitButtonText`、`keyLabel`、`badge` 等），采用“外部传入优先，无传入时使用 `t()` 默认词条”的模式，既保持向后兼容又实现彻底解耦。

### 标签
#intent/refine #flow/ready #priority/high #comp/ui #concept/ui #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/i18n-common-containers #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 扩充中英文全局公共词典 (`zh-CN.json` & `en-US.json`)

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
    "custom": "自定义",
    "sec": "秒",
    "min": "分",
    "minFull": "分钟",
    "trialsUnit": "题",
    "trueMatch": "真实匹配",
    "optionA": "选项 A",
    "optionB": "选项 B",
    "areaA": "区域 A",
    "areaB": "区域 B",
    "optionN": "选项 {{num}}",
    "candidateN": "候选 {{num}}",
    "screenN": "画面 {{num}}",
    "submitSpace": "确认提交 (Space)",
    "trueValue": "真理值",
    "error": "误差",
    "tolerance": "容错",
    "start": "起点",
    "end": "终点",
    "topView": "顶视图 (Top)",
    "frontView": "正视图 (Front)",
    "sideView": "侧视图 (Side)"
  },
  "card": {
    "todayTrials": "今日刷题",
    "analyticsTooltip": "{{title}} 弱点分析",
    "settingsTooltip": "{{title}} 偏好设置",
    "experimentalBadge": "实验性",
    "skillLevel": "能力层阶",
    "levelBadge": "Level {{level}}",
    "accuracy": "正确率",
    "startAdaptive": "开始自适应训练",
    "startBenchmark": "20 题基准测试"
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
    "clickToResume": "点击继续训练 (或按任意键)",
    "confirmSubmit": "确认提交 (Space)",
    "trueValue": "绝对真理值",
    "error": "误差",
    "tolerance": "容错",
    "pointGridAria": "点阵做答画布"
  },
  "summary": {
    "title": "训练总结与成果",
    "benchmarkSubtitle": "20 题基准测试",
    "trainingSubtitle": "自适应训练",
    "accuracyCount": "正确率 / 题数",
    "trialsDone": "({{hits}}/{{total}} 题)",
    "duration": "训练时长",
    "secPerTrial": "({{sec}}秒/题)",
    "levelEvolution": "能力层阶演进",
    "levelUp": "难度层阶提升了 {{diff}} 级！",
    "levelDown": "难度层阶回调了 {{diff}} 级",
    "levelMaintain": "稳健维持当前难度层阶",
    "curveTitle": "难度层阶变化曲线",
    "hitLegend": "击中",
    "missLegend": "未击中",
    "backHome": "返回主页",
    "trainAgain": "再练一轮"
  },
  "analyticsModal": {
    "analyzing": "正在分析历史答题数据...",
    "noRecords": "暂无【{{title}}】的练习记录，先去完成几轮练习吧！",
    "overallEvaluation": "总体评估",
    "sampleSize": "样本量: {{count}} 题"
  },
  "settingsModal": {
    "title": "{{title}} 偏好设置",
    "autoNext": "自动切换下一题",
    "autoNextDesc": "点击答题后无需手动按空格切题",
    "delay": "切换延迟时间",
    "adaptiveMode": "自适应算子模式",
    "modeBlock": "轮次胜率评估 (推荐)",
    "modeStaircase": "经典 3U1D 阶梯",
    "targetAcc": "目标通关正确率",
    "blockSize": "每轮评估题量",
    "trialsPerBlock": "{{size}} 题/轮",
    "trialsUnit": "{{size}} 题",
    "stepGranularity": "难度阶梯精细度",
    "stepStandard": "标准阶梯 (大步幅)",
    "stepFine": "精细阶梯 (小步幅)",
    "sliderMarginTitle": "滑块极值吸附外延感应区",
    "targetingTitle": "弱点专项靶向强化",
    "targetingSubTitle": "选择需要靶向强化的扇区：",
    "targetingOff": "关闭 (全随机)",
    "targetingManual": "手动指定",
    "marginOff": "关闭 (0px)"
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
    "languageTitle": "系统界面语言",
    "languageDesc": "切换应用全局显示语言 (Language)",
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
    "custom": "Custom",
    "sec": "s",
    "min": "m ",
    "minFull": "min",
    "trialsUnit": "trials",
    "trueMatch": "True Match",
    "optionA": "Option A",
    "optionB": "Option B",
    "areaA": "Area A",
    "areaB": "Area B",
    "optionN": "Option {{num}}",
    "candidateN": "Candidate {{num}}",
    "screenN": "Screen {{num}}",
    "submitSpace": "Confirm (Space)",
    "trueValue": "Ground Truth",
    "error": "Error",
    "tolerance": "Tolerance",
    "start": "Start",
    "end": "End",
    "topView": "Top View",
    "frontView": "Front View",
    "sideView": "Side View"
  },
  "card": {
    "todayTrials": "Today",
    "analyticsTooltip": "{{title}} Weakness Analytics",
    "settingsTooltip": "{{title}} Preferences",
    "experimentalBadge": "Experimental",
    "skillLevel": "Skill Level",
    "levelBadge": "Level {{level}}",
    "accuracy": "Accuracy",
    "startAdaptive": "Adaptive Training",
    "startBenchmark": "20-Trial Benchmark"
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
    "clickToResume": "Click to Resume (or press any key)",
    "confirmSubmit": "Confirm (Space)",
    "trueValue": "Ground Truth",
    "error": "Error",
    "tolerance": "Tolerance",
    "pointGridAria": "Point grid interactive canvas"
  },
  "summary": {
    "title": "Training Summary & Results",
    "benchmarkSubtitle": "20-Trial Benchmark",
    "trainingSubtitle": "Adaptive Training",
    "accuracyCount": "Accuracy / Trials",
    "trialsDone": "({{hits}}/{{total}} trials)",
    "duration": "Duration",
    "secPerTrial": "({{sec}}s/trial)",
    "levelEvolution": "Skill Level Evolution",
    "levelUp": "Skill level increased by {{diff}} levels!",
    "levelDown": "Skill level adjusted down by {{diff}} levels",
    "levelMaintain": "Maintained current skill level stably",
    "curveTitle": "Level Trajectory Curve",
    "hitLegend": "Hit",
    "missLegend": "Miss",
    "backHome": "Return Home",
    "trainAgain": "Train Again"
  },
  "analyticsModal": {
    "analyzing": "Analyzing historical trial data...",
    "noRecords": "No practice records for [{{title}}]. Complete some trials first!",
    "overallEvaluation": "Overall Evaluation",
    "sampleSize": "Sample size: {{count}} trials"
  },
  "settingsModal": {
    "title": "{{title}} Preferences",
    "autoNext": "Auto Advance",
    "autoNextDesc": "Automatically advance without pressing Space",
    "delay": "Switch Delay Time",
    "adaptiveMode": "Adaptive Operator Mode",
    "modeBlock": "Block Win-Rate (Recommended)",
    "modeStaircase": "Classic 3U1D Staircase",
    "targetAcc": "Target Passing Accuracy",
    "blockSize": "Block Evaluation Size",
    "trialsPerBlock": "{{size}} trials/block",
    "trialsUnit": "{{size}} trials",
    "stepGranularity": "Difficulty Step Granularity",
    "stepStandard": "Standard (Large step)",
    "stepFine": "Fine (Small step)",
    "sliderMarginTitle": "Slider Outer Margin Area",
    "targetingTitle": "Targeted Weakness Reinforcement",
    "targetingSubTitle": "Select sectors for targeted practice:",
    "targetingOff": "Off (Fully Random)",
    "targetingManual": "Manual Selection",
    "marginOff": "Off (0px)"
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
    "languageTitle": "Display Language",
    "languageDesc": "Switch application global language (界面语言)",
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

#### Acts 2: 重构基础交互容器组件 (`Choice2AfcContainer`, `ChoiceNafcContainer`, `PointClickCanvas`, `StandardSliderView`, `StandardNafcView`)

~~~~~act
write_file
src/components/common/Choice2AfcContainer.tsx
~~~~~
~~~~~tsx
import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';

export interface Choice2AfcOption {
  key: 'A' | 'B';
  keyLabel?: string;
  title: string;
  isCorrect: boolean;
  badge?: ComponentChildren;
  content: ComponentChildren;
}

interface Choice2AfcContainerProps {
  optionA: Choice2AfcOption;
  optionB: Choice2AfcOption;
  selectedChoice: 'A' | 'B' | null;
  showAnswer: boolean;
  disabled?: boolean;
  onSelect: (choice: 'A' | 'B') => void;
  enableKeyboardShortcuts?: boolean;
}

export function Choice2AfcContainer({
  optionA,
  optionB,
  selectedChoice,
  showAnswer,
  disabled = false,
  onSelect,
  enableKeyboardShortcuts = true,
}: Choice2AfcContainerProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!enableKeyboardShortcuts || disabled || showAnswer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        onSelect('A');
      } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        onSelect('B');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, disabled, showAnswer, onSelect]);

  const renderCard = (opt: Choice2AfcOption) => {
    const isSelected = selectedChoice === opt.key;
    const isTarget = opt.isCorrect;

    let borderStyle =
      'bg-slate-50 hover:bg-indigo-50/30 border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98]';

    if (showAnswer) {
      if (isTarget) {
        borderStyle = 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20';
      } else if (isSelected) {
        borderStyle = 'bg-rose-50/50 border-rose-400 shadow-sm';
      } else {
        borderStyle = 'bg-slate-50/60 border-slate-200 opacity-60';
      }
    } else if (isSelected) {
      borderStyle = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
    }

    return (
      <button
        type="button"
        disabled={disabled || showAnswer}
        onClick={() => onSelect(opt.key)}
        className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-200 text-left ${borderStyle}`}
      >
        <div className="flex items-center justify-between w-full px-1">
          <span className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase">
            <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
              {opt.keyLabel || (opt.key === 'A' ? '1' : '2')}
            </span>
            {opt.title}
          </span>

          {showAnswer && isTarget && (
            <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-600" />
              {opt.badge || t('common.trueMatch')}
            </span>
          )}

          {showAnswer && !isTarget && opt.badge && (
            <span className="text-xs font-semibold text-slate-400">{opt.badge}</span>
          )}
        </div>

        {opt.content}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
      {renderCard(optionA)}
      {renderCard(optionB)}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/common/ChoiceNafcContainer.tsx
~~~~~
~~~~~tsx
import { Check } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';

export interface ChoiceNafcOption<T = unknown> {
  key?: string | number;
  keyLabel?: string;
  title?: string;
  value?: T;
  isCorrect: boolean;
  content: ComponentChildren;
}

interface ChoiceNafcContainerProps<T = unknown> {
  options: ChoiceNafcOption<T>[];
  selectedIndex: number | null;
  showAnswer: boolean;
  disabled?: boolean;
  columns?: 2 | 3 | 4;
  gridClassName?: string;
  enableKeyboardShortcuts?: boolean;
  onSelect: (index: number, option: ChoiceNafcOption<T>) => void;
}

export function ChoiceNafcContainer<T = unknown>({
  options,
  selectedIndex,
  showAnswer,
  disabled = false,
  columns = 4,
  gridClassName,
  enableKeyboardShortcuts = true,
  onSelect,
}: ChoiceNafcContainerProps<T>) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!enableKeyboardShortcuts || disabled || showAnswer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const num = Number.parseInt(e.key, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= options.length) {
        e.preventDefault();
        const idx = num - 1;
        onSelect(idx, options[idx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, disabled, showAnswer, options, onSelect]);

  const defaultGrid =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className={`grid ${gridClassName || defaultGrid} gap-3 w-full`}>
      {options.map((opt, idx) => {
        const isSelected = selectedIndex === idx;
        const isTarget = opt.isCorrect;
        const keyLabel = opt.keyLabel || (idx + 1).toString();

        let border = 'border-slate-200 hover:border-indigo-300 hover:shadow-md bg-slate-50';
        if (showAnswer) {
          if (isTarget) {
            border = 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md';
          } else if (isSelected) {
            border = 'bg-rose-50/50 border-rose-400 shadow-sm';
          } else {
            border = 'bg-slate-50/60 border-slate-200 opacity-50';
          }
        } else if (isSelected) {
          border = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
        }

        return (
          <button
            key={opt.key ?? `nafc-opt-${idx}`}
            type="button"
            disabled={disabled || showAnswer}
            onClick={() => onSelect(idx, opt)}
            className={`group flex flex-col items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 text-left active:scale-[0.98] cursor-pointer ${border}`}
          >
            <div className="flex items-center justify-between w-full px-1">
              <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                  {keyLabel}
                </span>
                {opt.title || t('common.optionN', { num: keyLabel })}
              </span>
              {showAnswer && isTarget && (
                <Check className="w-4 h-4 text-emerald-600 font-extrabold" />
              )}
            </div>

            {opt.content}
          </button>
        );
      })}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/common/PointClickCanvas.tsx
~~~~~
~~~~~tsx
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { renderInteractivePointGrid } from '../../core/canvas/drawPointGrid';
import { useTranslation } from '../../core/i18n';
import { findNearestGridPoint } from '../../packs/star/utils/hitDetection';
import type { Point } from '../../types';

export interface PointClickCanvasProps {
  canvasSize: number;
  gridPoints: Point[];
  targetPoint?: Point;
  userNearestPoint?: Point;
  anchors?: (Point | null | undefined)[];
  showAnswer: boolean;
  isHit?: boolean;
  disabled?: boolean;
  maxDisplayWidth?: string;
  customOverlayRender?: (ctx: CanvasRenderingContext2D) => void;
  onCommitPoint: (point: Point) => void;
}

const LOUPE_SIZE = 104; // 放大镜直径 (px)
const ZOOM_FACTOR = 2.5; // 放大倍率

export function PointClickCanvas({
  canvasSize,
  gridPoints,
  targetPoint,
  userNearestPoint,
  anchors = [],
  showAnswer,
  isHit = false,
  disabled = false,
  maxDisplayWidth = 'max-w-[380px] lg:max-w-[420px]',
  customOverlayRender,
  onCommitPoint,
}: PointClickCanvasProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [isTouching, setIsTouching] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [currentCanvasPos, setCurrentCanvasPos] = useState<Point | null>(null);

  // 1. 渲染主画布内容
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderInteractivePointGrid({
      ctx,
      canvasSize,
      gridPoints,
      targetPoint,
      userNearestPoint,
      hoverPoint,
      anchors,
      showAnswer,
      isHit,
      disabled,
    });

    customOverlayRender?.(ctx);
  }, [
    canvasSize,
    gridPoints,
    targetPoint,
    userNearestPoint,
    hoverPoint,
    anchors,
    showAnswer,
    isHit,
    disabled,
    customOverlayRender,
  ]);

  // 2. 渲染放大镜画布内容
  const updateLoupeCanvas = useCallback(
    (focusPt: Point) => {
      const mainCanvas = canvasRef.current;
      const loupeCanvas = loupeCanvasRef.current;
      if (!mainCanvas || !loupeCanvas) return;

      const loupeCtx = loupeCanvas.getContext('2d');
      if (!loupeCtx) return;

      loupeCtx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);

      // 主画布采样的视口区域
      const sampleSize = LOUPE_SIZE / ZOOM_FACTOR;
      const sx = Math.max(0, Math.min(canvasSize - sampleSize, focusPt.x - sampleSize / 2));
      const sy = Math.max(0, Math.min(canvasSize - sampleSize, focusPt.y - sampleSize / 2));

      // 绘制放大图像
      loupeCtx.drawImage(mainCanvas, sx, sy, sampleSize, sampleSize, 0, 0, LOUPE_SIZE, LOUPE_SIZE);

      // 绘制中心十字准星
      const center = LOUPE_SIZE / 2;
      loupeCtx.strokeStyle = '#4F46E5';
      loupeCtx.lineWidth = 1.5;

      // 环形中心靶心
      loupeCtx.beginPath();
      loupeCtx.arc(center, center, 8, 0, Math.PI * 2);
      loupeCtx.stroke();

      // 十字延伸刻度
      loupeCtx.beginPath();
      loupeCtx.moveTo(center - 14, center);
      loupeCtx.lineTo(center - 4, center);
      loupeCtx.moveTo(center + 4, center);
      loupeCtx.lineTo(center + 14, center);
      loupeCtx.moveTo(center, center - 14);
      loupeCtx.lineTo(center, center - 4);
      loupeCtx.moveTo(center, center + 4);
      loupeCtx.lineTo(center, center + 14);
      loupeCtx.stroke();
    },
    [canvasSize],
  );

  // 3. 屏幕坐标换算为画布坐标
  const getCanvasCoordinates = useCallback(
    (
      clientX: number,
      clientY: number,
    ): { canvasPoint: Point; relX: number; relY: number } | null => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return null;

      const rect = canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const scaleX = canvasSize / rect.width;
      const scaleY = canvasSize / rect.height;

      const clickX = Math.round((clientX - rect.left) * scaleX * 100) / 100;
      const clickY = Math.round((clientY - rect.top) * scaleY * 100) / 100;

      const relX = clientX - containerRect.left;
      const relY = clientY - containerRect.top;

      return {
        canvasPoint: { x: clickX, y: clickY },
        relX,
        relY,
      };
    },
    [canvasSize],
  );

  // 鼠标悬停与移动
  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);

    if (isWithinRange) {
      setHoverPoint(nearestPoint);
    } else if (hoverPoint) {
      setHoverPoint(null);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouching && hoverPoint) setHoverPoint(null);
  };

  // 鼠标普通点击
  const handleClick = (e: MouseEvent) => {
    if (disabled || showAnswer || !gridPoints.length || isTouching) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    if (!isWithinRange) return;

    setHoverPoint(null);
    onCommitPoint(nearestPoint);
  };

  // 触控开始
  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || showAnswer || !gridPoints.length || !e.touches[0]) return;
    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setIsTouching(true);
    setCurrentCanvasPos(coords.canvasPoint);

    // 计算放大镜位置（默认在手指上方 72px，若超出顶部则自动翻转至下方）
    const flipDown = coords.relY < 90;
    setLoupePos({
      x: coords.relX,
      y: flipDown ? coords.relY + 75 : coords.relY - 75,
    });

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
    updateLoupeCanvas(isWithinRange ? nearestPoint : coords.canvasPoint);
  };

  // 触控移动
  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || showAnswer || !gridPoints.length || !e.touches[0] || !isTouching) return;
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;

    setCurrentCanvasPos(coords.canvasPoint);

    const flipDown = coords.relY < 90;
    setLoupePos({
      x: coords.relX,
      y: flipDown ? coords.relY + 75 : coords.relY - 75,
    });

    const { nearestPoint, isWithinRange } = findNearestGridPoint(coords.canvasPoint, gridPoints);
    setHoverPoint(isWithinRange ? nearestPoint : null);
    updateLoupeCanvas(isWithinRange ? nearestPoint : coords.canvasPoint);
  };

  // 触控松手确认提交
  const handleTouchEnd = () => {
    if (disabled || showAnswer || !isTouching) return;
    setIsTouching(false);
    setLoupePos(null);

    if (hoverPoint) {
      const commitPt = hoverPoint;
      setHoverPoint(null);
      onCommitPoint(commitPt);
    } else if (currentCanvasPos) {
      const { nearestPoint, isWithinRange } = findNearestGridPoint(currentCanvasPos, gridPoints);
      if (isWithinRange) {
        setHoverPoint(null);
        onCommitPoint(nearestPoint);
      }
    }
  };

  const handleTouchCancel = () => {
    setIsTouching(false);
    setLoupePos(null);
    setHoverPoint(null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full ${maxDisplayWidth} select-none`}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
        }}
        tabIndex={0}
        role="button"
        aria-label={t('shell.pointGridAria')}
        className={`w-full aspect-square rounded-xl border border-gray-100 bg-white shadow-inner touch-none transition-all ${
          disabled || showAnswer
            ? 'cursor-default'
            : hoverPoint
              ? 'cursor-none hover:border-indigo-300 hover:shadow-indigo-50/50'
              : 'cursor-crosshair hover:border-indigo-300 hover:shadow-indigo-50/50'
        }`}
      />

      {/* 触控浮动放大镜 (Loupe) */}
      {isTouching && loupePos && (
        <div
          className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 shadow-2xl bg-white ring-4 ring-indigo-500/25 overflow-hidden animate-in zoom-in-75 duration-75"
          style={{
            left: `${loupePos.x}px`,
            top: `${loupePos.y}px`,
            width: `${LOUPE_SIZE}px`,
            height: `${LOUPE_SIZE}px`,
          }}
        >
          <canvas
            ref={loupeCanvasRef}
            width={LOUPE_SIZE}
            height={LOUPE_SIZE}
            className="w-full h-full block"
          />
        </div>
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/common/StandardSliderView.tsx
~~~~~
~~~~~tsx
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { useTrackPointer } from '../../hooks/useTrackPointer';
import { QuestionCardShell } from './QuestionCardShell';

export interface StandardSliderViewProps {
  questionId: string;
  hintText?: string;
  hintIcon?: (props: { className?: string }) => ComponentChildren;
  showCanvasHints?: boolean;
  maxWidth?: string;
  preview: ComponentChildren;

  // 滑块基本属性
  label: string;
  min?: number;
  max: number;
  step?: number;
  initialValue?: number;
  unit?: string;
  formatValue?: (val: number) => string;

  // 答案揭晓与容错评估
  targetValue?: number;
  tolerance?: number;
  showToleranceBand?: boolean;
  showAnswer: boolean;
  isHit?: boolean;
  userValue?: number;

  // 交互控制
  disabled?: boolean;
  hitMargin?: number;
  submitMode?: 'commit_on_release' | 'button' | 'both';
  submitButtonText?: string;
  onValueChange?: (currentVal: number, activeVal: number) => void;
  onAnswer: (val: number) => void;

  // 底部附加卡片槽位
  footerDetails?: ComponentChildren;
}

export function StandardSliderView({
  questionId,
  hintText,
  hintIcon,
  showCanvasHints = true,
  maxWidth = 'max-w-lg',
  preview,
  label,
  min = 0,
  max,
  step = 0.5,
  initialValue,
  unit = '',
  formatValue,
  targetValue,
  tolerance,
  showToleranceBand = true,
  showAnswer,
  isHit = false,
  userValue,
  disabled = false,
  hitMargin = 12,
  submitMode = 'commit_on_release',
  submitButtonText,
  onValueChange,
  onAnswer,
  footerDetails,
}: StandardSliderViewProps) {
  const { t } = useTranslation();
  const defaultVal = initialValue ?? (max - min) / 2;
  const [currentVal, setCurrentVal] = useState<number>(defaultVal);

  const effectiveSubmitButtonText = submitButtonText || t('common.submitSpace');

  const { trackRef, hoverVal, setHoverVal, pointerProps } = useTrackPointer({
    max,
    step,
    disabled: disabled || showAnswer,
    onValChange: (val) => {
      setCurrentVal(val);
      onValueChange?.(val, val);
    },
    onHoverStateChange: (hVal) => {
      onValueChange?.(currentVal, hVal !== null ? hVal : currentVal);
    },
    onCommit: (val) => {
      if (submitMode === 'commit_on_release' || submitMode === 'both') {
        if (!disabled && !showAnswer) {
          onAnswer(val);
        }
      }
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset slider when questionId changes
  useEffect(() => {
    setCurrentVal(defaultVal);
    setHoverVal(null);
    onValueChange?.(defaultVal, defaultVal);
  }, [questionId, defaultVal, setHoverVal]);

  // 支持键盘 Space 键提交（在显式按钮提交模式下）
  useEffect(() => {
    if (submitMode !== 'button' && submitMode !== 'both') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (disabled || showAnswer) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        onAnswer(currentVal);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitMode, disabled, showAnswer, currentVal, onAnswer]);

  const activeVal = hoverVal !== null ? hoverVal : currentVal;
  const displayVal = showAnswer && userValue !== undefined ? userValue : activeVal;
  const formattedDisplay = formatValue ? formatValue(displayVal) : `${displayVal}${unit}`;

  const valToPercent = (val: number) => {
    const clamped = Math.max(0, Math.min(max, val));
    return `${(clamped / max) * 100}%`;
  };

  const isButtonSubmit = submitMode === 'button' || submitMode === 'both';

  return (
    <QuestionCardShell
      hintText={hintText}
      hintIcon={hintIcon}
      showCanvasHints={showCanvasHints}
      maxWidth={maxWidth}
    >
      {preview}

      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>{label}</span>
          <span className="font-mono text-base font-black text-indigo-600">{formattedDisplay}</span>
        </div>

        <div className="flex items-center gap-3 w-full">
          <span className="font-bold font-mono text-slate-400 text-xs">
            {min}
            {unit}
          </span>

          <div
            {...pointerProps}
            style={
              hitMargin > 0
                ? {
                    paddingLeft: `${hitMargin}px`,
                    paddingRight: `${hitMargin}px`,
                    marginLeft: `-${hitMargin}px`,
                    marginRight: `-${hitMargin}px`,
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    marginTop: '-6px',
                    marginBottom: '-6px',
                  }
                : undefined
            }
            className={`relative flex-1 flex items-center select-none touch-none ${
              !showAnswer && !disabled ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              ref={trackRef}
              className="relative w-full h-7 rounded-xl bg-slate-200 border border-slate-300/80 shadow-inner flex items-center overflow-hidden"
            >
              {/* 当前激活进度条 */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-indigo-500/20"
                style={{ width: valToPercent(activeVal) }}
              />

              {/* 未揭晓状态下的指针 */}
              {!showAnswer && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-indigo-600 -translate-x-1/2 z-20 shadow-sm"
                  style={{ left: valToPercent(activeVal) }}
                />
              )}

              {/* 动态容错感应区间 */}
              {!showAnswer && showToleranceBand && tolerance !== undefined && tolerance > 0 && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: valToPercent(activeVal - tolerance) }}
                  />
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-indigo-400/80 -translate-x-1/2"
                    style={{ left: valToPercent(activeVal + tolerance) }}
                  />
                </>
              )}

              {/* 答案揭晓：真理线与用户作答线 */}
              {showAnswer && targetValue !== undefined && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-emerald-500 -translate-x-1/2 z-20 border-x border-white shadow-md"
                    style={{ left: valToPercent(targetValue) }}
                  />
                  {userValue !== undefined && (
                    <div
                      className={`absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10 border-x border-white shadow-md ${
                        isHit ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ left: valToPercent(userValue) }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <span className="font-bold font-mono text-slate-400 text-xs">
            {max}
            {unit}
          </span>
        </div>

        {footerDetails}
      </div>

      {isButtonSubmit && !showAnswer && (
        <button
          type="button"
          onClick={() => {
            if (!disabled && !showAnswer) onAnswer(currentVal);
          }}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
        >
          {effectiveSubmitButtonText}
        </button>
      )}
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
write_file
src/components/common/StandardNafcView.tsx
~~~~~
~~~~~tsx
import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { ChoiceNafcContainer, type ChoiceNafcOption } from './ChoiceNafcContainer';
import { QuestionCardShell } from './QuestionCardShell';

export interface StandardNafcViewProps<T = unknown> {
  questionId: string;
  hintText?: string;
  hintIcon?: (props: { className?: string }) => ComponentChildren;
  showCanvasHints?: boolean;
  maxWidth?: string;

  // 上方预览/题干插槽
  preview?: ComponentChildren;
  // 中间补充内容插槽 (如滑块或对比组件)
  middleContent?: ComponentChildren;

  // N-AFC 选项列表与网格配置
  options: ChoiceNafcOption<T>[];
  columns?: 2 | 3 | 4;
  gridClassName?: string;
  selectedIndex?: number | null;

  // 提交控制模式
  submitMode?: 'immediate' | 'button';
  submitButtonText?: string;
  showAnswer: boolean;
  disabled?: boolean;
  enableKeyboardShortcuts?: boolean;

  onSelectIndex?: (index: number, option: ChoiceNafcOption<T>) => void;
  onAnswer: (index: number, option: ChoiceNafcOption<T>) => void;
}

export function StandardNafcView<T = unknown>({
  questionId,
  hintText,
  hintIcon,
  showCanvasHints = true,
  maxWidth = 'max-w-2xl',
  preview,
  middleContent,
  options,
  columns = 4,
  gridClassName,
  selectedIndex: controlledSelectedIndex,
  submitMode = 'immediate',
  submitButtonText,
  showAnswer,
  disabled = false,
  enableKeyboardShortcuts = true,
  onSelectIndex,
  onAnswer,
}: StandardNafcViewProps<T>) {
  const { t } = useTranslation();
  const effectiveSubmitButtonText = submitButtonText || t('common.submitSpace');

  const [internalSelectedIdx, setInternalSelectedIdx] = useState<number | null>(
    submitMode === 'button' ? 0 : null,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection on question change
  useEffect(() => {
    setInternalSelectedIdx(submitMode === 'button' ? 0 : null);
  }, [questionId, submitMode]);

  const activeIndex =
    controlledSelectedIndex !== undefined ? controlledSelectedIndex : internalSelectedIdx;

  const handleSelectOption = useCallback(
    (index: number, option: ChoiceNafcOption<T>) => {
      if (disabled || showAnswer) return;
      setInternalSelectedIdx(index);
      onSelectIndex?.(index, option);

      if (submitMode === 'immediate') {
        onAnswer(index, option);
      }
    },
    [disabled, showAnswer, onSelectIndex, submitMode, onAnswer],
  );

  const handleExplicitSubmit = useCallback(() => {
    if (disabled || showAnswer || !options.length) return;
    const targetIdx = activeIndex ?? 0;
    const targetOpt = options[targetIdx] ?? options[0];
    onAnswer(targetIdx, targetOpt);
  }, [disabled, showAnswer, options, activeIndex, onAnswer]);

  // 支持键盘 Space 提交（在 button 模式下）
  useEffect(() => {
    if (submitMode !== 'button' || !enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (disabled || showAnswer) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleExplicitSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitMode, enableKeyboardShortcuts, disabled, showAnswer, handleExplicitSubmit]);

  return (
    <QuestionCardShell
      hintText={hintText}
      hintIcon={hintIcon}
      showCanvasHints={showCanvasHints}
      maxWidth={maxWidth}
    >
      {preview}
      {middleContent}

      <ChoiceNafcContainer<T>
        options={options}
        selectedIndex={activeIndex}
        showAnswer={showAnswer}
        disabled={disabled}
        columns={columns}
        gridClassName={gridClassName}
        enableKeyboardShortcuts={enableKeyboardShortcuts}
        onSelect={handleSelectOption}
      />

      {submitMode === 'button' && !showAnswer && (
        <button
          type="button"
          onClick={handleExplicitSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
        >
          {effectiveSubmitButtonText}
        </button>
      )}
    </QuestionCardShell>
  );
}
~~~~~

#### Acts 3: 重构偏好配置弹窗与动态表单组件 (`SettingsModal`, `SliderMarginGroup`, `TargetingSection`, `DynamicDomainSettings`)

~~~~~act
write_file
src/components/settings/common/SliderMarginGroup.tsx
~~~~~
~~~~~tsx
import { useTranslation } from '../../../core/i18n';

interface SliderMarginGroupProps {
  title?: string;
  value: number;
  onChange: (val: number) => void;
  options?: { label: string; value: number }[];
}

export function SliderMarginGroup({
  title,
  value,
  onChange,
  options,
}: SliderMarginGroupProps) {
  const { t } = useTranslation();

  const effectiveTitle = title || t('settingsModal.sliderMarginTitle');
  const defaultOptions = options || [
    { label: t('settingsModal.marginOff'), value: 0 },
    { label: '8px', value: 8 },
    { label: '12px', value: 12 },
    { label: '20px', value: 20 },
  ];

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-slate-700">{effectiveTitle}</div>
      <div className="grid grid-cols-4 gap-1.5">
        {defaultOptions.map((opt) => (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`py-2 text-xs font-bold rounded-xl border transition-all ${
              value === opt.value
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/settings/common/TargetingSection.tsx
~~~~~
~~~~~tsx
import { Crosshair } from 'lucide-preact';
import { useTranslation } from '../../../core/i18n';
import type { TargetingMode } from '../../../utils/settings';

interface TargetingSectionProps {
  title?: string;
  subTitle?: string;
  mode: TargetingMode;
  onModeChange: (mode: TargetingMode) => void;
  sectors: string[];
  selectedSectors: number[];
  onToggleSector: (sectorIdx: number) => void;
  gridCols?: 'grid-cols-3' | 'grid-cols-4';
}

export function TargetingSection({
  title,
  subTitle,
  mode,
  onModeChange,
  sectors,
  selectedSectors,
  onToggleSector,
  gridCols = 'grid-cols-4',
}: TargetingSectionProps) {
  const { t } = useTranslation();

  const effectiveTitle = title || t('settingsModal.targetingTitle');
  const effectiveSubTitle = subTitle || t('settingsModal.targetingSubTitle');

  return (
    <div className="space-y-2 pt-2 border-t border-slate-100">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <Crosshair className="w-4 h-4 text-indigo-600" />
        {effectiveTitle}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { id: 'off', label: t('settingsModal.targetingOff') },
          { id: 'manual', label: t('settingsModal.targetingManual') },
        ].map((m) => (
          <button
            type="button"
            key={m.id}
            onClick={() => onModeChange(m.id as TargetingMode)}
            className={`py-2 text-xs font-bold rounded-xl border transition-all ${
              mode === m.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'manual' && (
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
          <div className="text-[11px] font-semibold text-slate-500">{effectiveSubTitle}</div>
          <div className={`grid ${gridCols} gap-1.5`}>
            {sectors.map((name, idx) => {
              const selected = selectedSectors.includes(idx);
              return (
                <button
                  type="button"
                  key={name}
                  onClick={() => onToggleSector(idx)}
                  className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${
                    selected
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/settings/DynamicDomainSettings.tsx
~~~~~
~~~~~tsx
import { useTranslation } from '../../core/i18n';
import type { TargetingMode } from '../../utils/settings';
import { SettingToggleItem } from './common/SettingToggleItem';
import { SliderMarginGroup } from './common/SliderMarginGroup';
import { TargetingSection } from './common/TargetingSection';

export type SettingFieldSchema =
  | {
      type: 'sliderMargin';
      key: string;
      title?: string;
    }
  | {
      type: 'toggle';
      key: string;
      title: string;
      description?: string;
    }
  | {
      type: 'buttonGroup';
      key: string;
      title: string;
      options: { label: string; value: unknown }[];
      gridCols?: string;
    }
  | {
      type: 'targeting';
      modeKey: string;
      sectorsKey: string;
      title: string;
      subTitle: string;
      sectors: string[];
      gridCols?: 'grid-cols-3' | 'grid-cols-4';
    };

interface DynamicDomainSettingsProps {
  schemas: SettingFieldSchema[];
  values: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export function DynamicDomainSettings({ schemas, values, onChange }: DynamicDomainSettingsProps) {
  const { t } = useTranslation();

  const handleSectorToggle = (sectorsKey: string, sectorIdx: number) => {
    const currentSectors = (values[sectorsKey] as number[] | undefined) || [];
    const exists = currentSectors.includes(sectorIdx);
    const updated = exists
      ? currentSectors.filter((s) => s !== sectorIdx)
      : [...currentSectors, sectorIdx];

    onChange({ [sectorsKey]: updated });
  };

  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    return translated !== text ? translated : text;
  };

  return (
    <div className="space-y-4">
      {schemas.map((field) => {
        if (field.type === 'sliderMargin') {
          return (
            <SliderMarginGroup
              key={field.key}
              title={field.title ? resolveText(field.title) : undefined}
              value={(values[field.key] as number | undefined) ?? 12}
              onChange={(val) => onChange({ [field.key]: val })}
            />
          );
        }

        if (field.type === 'toggle') {
          return (
            <SettingToggleItem
              key={field.key}
              title={resolveText(field.title)}
              description={field.description ? resolveText(field.description) : undefined}
              checked={Boolean(values[field.key])}
              onChange={(checked) => onChange({ [field.key]: checked })}
            />
          );
        }

        if (field.type === 'buttonGroup') {
          const currentVal = values[field.key];
          return (
            <div key={field.key} className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">{resolveText(field.title)}</div>
              <div className={`grid ${field.gridCols || 'grid-cols-4'} gap-1.5`}>
                {field.options.map((opt) => (
                  <button
                    type="button"
                    key={String(opt.value)}
                    onClick={() => onChange({ [field.key]: opt.value })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      currentVal === opt.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {resolveText(opt.label)}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        if (field.type === 'targeting') {
          const mode = (values[field.modeKey] as TargetingMode | undefined) || 'off';
          const selectedSectors = (values[field.sectorsKey] as number[] | undefined) || [];

          return (
            <TargetingSection
              key={`${field.modeKey}-${field.sectorsKey}`}
              title={resolveText(field.title)}
              subTitle={resolveText(field.subTitle)}
              mode={mode}
              onModeChange={(m) => onChange({ [field.modeKey]: m })}
              sectors={field.sectors}
              selectedSectors={selectedSectors}
              onToggleSector={(idx) => handleSectorToggle(field.sectorsKey, idx)}
              gridCols={field.gridCols}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/SettingsModal.tsx
~~~~~
~~~~~tsx
import { Flame, Sliders, Target, ToggleLeft, ToggleRight } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
import {
  type BaseModuleSettings,
  type UserSettings,
  getCardSettings,
  saveSettings,
} from '../utils/settings';
import { ModalShell } from './common/ModalShell';
import { DynamicDomainSettings } from './settings/DynamicDomainSettings';

interface SettingsModalProps {
  card: CardDefinition;
  settings: UserSettings;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => void;
}

export function SettingsModal({ card, settings, onClose, onSave }: SettingsModalProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<UserSettings>({ ...settings });
  const cardConfig = getCardSettings(current, card.id);

  const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;

  const updateCardConfig = (patch: Partial<BaseModuleSettings>) => {
    setCurrent((prev) => {
      const updatedCard = {
        ...getCardSettings(prev, card.id),
        ...patch,
      };
      const nextSettings: UserSettings = {
        ...prev,
        cards: {
          ...prev.cards,
          [card.id]: updatedCard,
        },
      };
      saveSettings(nextSettings);
      onSave(nextSettings);
      return nextSettings;
    });
  };

  return (
    <ModalShell
      title={t('settingsModal.title', { title: cardTitle })}
      icon={Sliders}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        {/* 通用配置：自动翻页开关 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-700">
              {t('settingsModal.autoNext')}
            </div>
            <div className="text-xs text-slate-400">
              {t('settingsModal.autoNextDesc')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateCardConfig({ autoNext: !cardConfig.autoNext })}
            className="text-indigo-600 hover:opacity-80 transition-opacity"
          >
            {cardConfig.autoNext ? (
              <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300" />
            )}
          </button>
        </div>

        {/* 通用配置：自动翻页延迟 */}
        {cardConfig.autoNext && (
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
              <span>{t('settingsModal.delay')}</span>
              <span className="font-mono text-indigo-600 font-bold">
                {cardConfig.autoNextDelay} ms
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={cardConfig.autoNextDelay}
              onInput={(e) => {
                const val = Number.parseInt((e.target as HTMLInputElement).value, 10);
                updateCardConfig({ autoNextDelay: val });
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        )}

        {/* 通用配置：自适应算子模式 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700">
            {t('settingsModal.adaptiveMode')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateCardConfig({ adaptiveMode: 'block' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                cardConfig.adaptiveMode === 'block'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              {t('settingsModal.modeBlock')}
            </button>
            <button
              type="button"
              onClick={() => updateCardConfig({ adaptiveMode: 'staircase' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                cardConfig.adaptiveMode === 'staircase'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {t('settingsModal.modeStaircase')}
            </button>
          </div>
        </div>

        {/* 轮次评估配置 */}
        {cardConfig.adaptiveMode === 'block' && (
          <div className="space-y-3 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span>{t('settingsModal.targetAcc')}</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {Math.round(cardConfig.targetAccuracy * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.7, 0.8, 0.85, 0.9].map((acc) => (
                  <button
                    type="button"
                    key={acc}
                    onClick={() => updateCardConfig({ targetAccuracy: acc })}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      cardConfig.targetAccuracy === acc
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {Math.round(acc * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span>{t('settingsModal.blockSize')}</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {t('settingsModal.trialsPerBlock', { size: cardConfig.blockSize })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[10, 15, 20].map((size) => (
                  <button
                    type="button"
                    key={size}
                    onClick={() => updateCardConfig({ blockSize: size })}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      cardConfig.blockSize === size
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t('settingsModal.trialsUnit', { size })}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 难度阶梯精细度 */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700">
            {t('settingsModal.stepGranularity')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateCardConfig({ stepGranularity: 'standard' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                cardConfig.stepGranularity === 'standard'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t('settingsModal.stepStandard')}
            </button>
            <button
              type="button"
              onClick={() => updateCardConfig({ stepGranularity: 'fine' })}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                cardConfig.stepGranularity === 'fine'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t('settingsModal.stepFine')}
            </button>
          </div>
        </div>

        {/* 渲染卡片专属设置 Schemas */}
        {card.settingSchemas && card.settingSchemas.length > 0 && (
          <DynamicDomainSettings
            schemas={card.settingSchemas}
            values={cardConfig}
            onChange={(patch) => updateCardConfig(patch)}
          />
        )}
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
        >
          {t('common.complete')}
        </button>
      </div>
    </ModalShell>
  );
}
~~~~~

#### Acts 4: 重构结算与弱点分析弹窗 (`SessionSummaryModal`, `WeaknessAnalyticsModal`)

~~~~~act
write_file
src/components/SessionSummaryModal.tsx
~~~~~
~~~~~tsx
import { ArrowRight, Award, Clock, Home, RotateCcw, Target, Zap } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { useTranslation } from '../core/i18n';
import type { CardDefinition } from '../types/card';
import { renderSessionTrendChartCanvas } from '../utils/canvas/drawTrendChart';

export interface SessionHistoryItem {
  trialIndex: number;
  levelBefore: number;
  levelAfter: number;
  isHit: boolean;
  responseTimeMs: number;
}

interface SessionSummaryModalProps {
  card: CardDefinition;
  sessionType: 'training' | 'benchmark';
  elapsedSeconds: number;
  history: SessionHistoryItem[];
  onClose: () => void;
  onRestart: () => void;
}

export function SessionSummaryModal({
  card,
  sessionType,
  elapsedSeconds,
  history,
  onClose,
  onRestart,
}: SessionSummaryModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;

  const totalTrials = history.length;
  const hitCount = history.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const startLevel = history.length > 0 ? history[0].levelBefore : 5;
  const endLevel = history.length > 0 ? history[history.length - 1].levelAfter : startLevel;
  const levelDiff = endLevel - startLevel;

  const avgResponseTimeSec =
    totalTrials > 0
      ? (history.reduce((acc, curr) => acc + curr.responseTimeMs, 0) / totalTrials / 1000).toFixed(
          1,
        )
      : '0.0';

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && history.length > 0) {
      renderSessionTrendChartCanvas(canvas, history);
    }
  }, [history]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Escape' || e.key === 'Enter')) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{t('summary.title')}</h2>
              <p className="text-xs text-slate-400">
                {cardTitle} •{' '}
                {sessionType === 'benchmark'
                  ? t('summary.benchmarkSubtitle')
                  : t('summary.trainingSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* 核心指标统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              {t('summary.accuracyCount')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">{accuracy}%</span>
              <span className="text-xs font-semibold text-slate-400">
                {t('summary.trialsDone', { hits: hitCount, total: totalTrials })}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {t('summary.duration')}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {t('summary.secPerTrial', { sec: avgResponseTimeSec })}
              </span>
            </div>
          </div>
        </div>

        {/* 层阶提升高亮卡片 */}
        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-900">
                {t('summary.levelEvolution')}
              </div>
              <div className="text-[11px] text-indigo-600">
                {levelDiff > 0
                  ? t('summary.levelUp', { diff: levelDiff })
                  : levelDiff < 0
                    ? t('summary.levelDown', { diff: Math.abs(levelDiff) })
                    : t('summary.levelMaintain')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono font-black text-slate-800 text-base">
            <span className="bg-white px-2.5 py-1 rounded-xl border border-indigo-100 shadow-sm">
              Lvl {startLevel}
            </span>
            <ArrowRight className="w-4 h-4 text-indigo-500" />
            <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-xl shadow-sm">
              Lvl {endLevel}
            </span>
          </div>
        </div>

        {/* 折线图 Canvas 区 */}
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 w-full overflow-hidden">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[11px] font-bold text-slate-400">
              {t('summary.curveTitle')}
            </span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{' '}
                {t('summary.hitLegend')}
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{' '}
                {t('summary.missLegend')}
              </span>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            className="w-full max-w-full aspect-[11/4] rounded-xl block"
          />
        </div>

        {/* 底部操作按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            {t('summary.backHome')}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {t('summary.trainAgain')}
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
write_file
src/components/WeaknessAnalyticsModal.tsx
~~~~~
~~~~~tsx
import { BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { CardAnalyticsView } from '../core/contracts';
import { useTranslation } from '../core/i18n';
import { registry } from '../core/registry';
import type { CardDefinition } from '../types/card';
import type { UnifiedTrialRecord } from '../utils/db/index';

interface WeaknessAnalyticsModalProps {
  card: CardDefinition;
  onClose: () => void;
}

export function WeaknessAnalyticsModal({ card, onClose }: WeaknessAnalyticsModalProps) {
  const { t } = useTranslation();
  const plugin = registry.getAnalyticsPluginByCardId(card.id);
  const [records, setRecords] = useState<UnifiedTrialRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeViewIndex, setActiveViewIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cardTitle = t(`packs.${card.packId}.cards.${card.id}.title`) || card.title || card.id;

  const views = plugin?.views ?? [];
  const currentView = views[activeViewIndex] || views[0];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (plugin) {
      plugin.fetchRecords(card.id).then((data: UnifiedTrialRecord[]) => {
        if (isMounted) {
          setRecords(data);
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [plugin, card.id]);

  useEffect(() => {
    if (loading || !currentView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    currentView.renderVisualizer(canvas, records);
  }, [currentView, loading, records]);

  if (!plugin || views.length === 0) return null;

  const stats = currentView.getOverallStats
    ? currentView.getOverallStats(records)
    : {
        accuracy:
          records.length > 0
            ? Math.round((records.filter((r) => r.isHit).length / records.length) * 100)
            : 0,
        total: records.length,
      };

  const resolveText = (text?: string): string => {
    if (!text) return '';
    const translated = t(text);
    return translated !== text ? translated : text;
  };

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
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {resolveText(currentView.title)}
              </h2>
              <p className="text-xs text-slate-400">{resolveText(currentView.subTitle)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 多页 Tab 切换栏 (当有多个视图时展示) */}
        {views.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl">
            {views.map((v: CardAnalyticsView, idx: number) => {
              const Icon = v.icon;
              const isActive = idx === activeViewIndex;
              return (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setActiveViewIndex(idx)}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {resolveText(v.tabLabel)}
                </button>
              );
            })}
          </div>
        )}

        {/* 内容展示区 */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
            {t('analyticsModal.analyzing')}
          </div>
        ) : records.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-300" />
            {t('analyticsModal.noRecords', { title: cardTitle })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* 左侧 Canvas 可视化区 */}
            <div className="md:col-span-7 flex justify-center bg-slate-900 p-4 rounded-2xl border border-slate-800 relative">
              <canvas
                key={`${card.id}-${currentView.id}`}
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full max-w-[300px] aspect-square rounded-xl"
              />
            </div>

            {/* 右侧数据统计面板 */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">
                  {t('analyticsModal.overallEvaluation')}
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-slate-800">{stats.accuracy}%</span>
                  <span className="text-xs font-semibold text-slate-400 mb-1">
                    {t('analyticsModal.sampleSize', { count: stats.total })}
                  </span>
                </div>
                {stats.customSummary}
              </div>

              {/* 插件个性化诊断 */}
              {currentView.renderDiagnostics(records)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
~~~~~

### 下一步建议
1. **重构各 Pack 内的组件与视图**：将 7 个 Pack 的子组件（如 `AngleEstimationView.tsx`, `AlbersInductionView.tsx`, `NotanThresholdView.tsx`, `StructureProjection3DView.tsx` 等）中直接写死的局部中文替换为对应的私有或公共词典键。
2. **重构弱点分析插件**：将 `color/analytics.tsx`, `star/analytics.tsx`, `negative_space/analytics.tsx` 中的诊断文案替换为多语言查表形式。

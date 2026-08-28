我将生成完整的国际化改造计划，系统性补全 7 个扩展包的中英文双语词典，并重构核心视图与分析组件中的硬编码文案。

## [WIP] feat(i18n): 补全所有 Pack 扩展包双语词典并全面重构视图与分析组件

### 用户需求

1. 补全 `star`, `color`, `relative_color`, `negative_space`, `angle`, `perspective`, `abstraction` 7 个内容扩展包的中英文词典。
2. 重构各 Pack 中的组件、视图、分析插件与卡片定义，彻底消除硬编码中文，改用 `useTranslation()` 及响应式 i18n 键值解析。
3. 扩展动态设置 Schema (`SettingFieldSchema`) 与卡片设置项，使动态表单字段的标题、描述、选项文案和扇区支持双语切换。
4. 补充全局通用词典中未覆盖的提示、单位、分析标签与交互文案，并在通用组件中消除硬编码。

### 评论

这是提升 FormSight 架构通用度与多语言用户体验的关键里程碑。通过将所有扩展包私有文案完全收敛进命名空间语言包 (`packs.<packId>`)，并打通动态表单 Schema 翻译解析链路，不仅可以消除界面各处的语种混杂，还为未来扩展第三方 Pack 提供了零侵入的标准双语规范。

### 目标

1. 更新全局词典 `src/locales/zh-CN.json` 和 `src/locales/en-US.json`，补充通用的提示词、方向词、操作文案等。
2. 更新与扩充 7 个 Pack 的私有双语词典，覆盖卡片标题、玩法说明、操作引导、分析诊断和扇区名称。
3. 改造 `DynamicDomainSettings.tsx`、`IdlePauseOverlay.tsx`、`PlanSummaryModal.tsx` 等通用组件中残存的硬编码。
4. 改造 `star`, `color`, `relative_color`, `negative_space`, `angle`, `perspective`, `abstraction` 内部的 Views、Components 及 Analytics 插件。

### 基本原理

1. **命名空间查表**：各扩展包的独立词典在 Registry 扫描时被动态挂载至 `packs.<packId>.*`，在组件中统一调用 `t('packs.<packId>....')`。
2. **动态解析回退机制**：对于 Schema 中的字符串（如 `title`、`description`），使用 `t(key)` 进行查表，若找不到对应词条则安全回退至原文字符串。
3. **扇区本地化映射**：将分析图表与设置项中扇区的硬编码数组转为基于 i18n 键值的动态查表，确保切换语言时图表与选择面板无缝刷新。

### 标签

#intent/build #flow/ready #priority/high #comp/interfaces #comp/ui #concept/ui #concept/config #scope/ux #scope/dx #ai/instruct #task/domain/ui #task/object/i18n-packs #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新全局双语词典与通用组件文案

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json
    "tolerance": "容错",
    "start": "起点",
    "end": "终点",
    "topView": "顶视图 (Top)",
    "frontView": "正视图 (Front)",
    "sideView": "侧视图 (Side)"
  },
~~~~~
~~~~~json
    "tolerance": "容错",
    "start": "起点",
    "end": "终点",
    "startPercent": "起点 (0%)",
    "endPercent": "终点 (100%)",
    "topView": "顶视图 (Top)",
    "frontView": "正视图 (Front)",
    "sideView": "侧视图 (Side)",
    "viewTriAxis": "三视图正交坐标 (Top / Front / Side)",
    "confirmSpace": "确认提交 (Space)",
    "restartPlan": "再练一遍此计划",
    "completeAndReturnHome": "完成并返回主页",
    "planSummaryTitle": "今日训练流总结",
    "planSummaryCompleted": "{{name}} • 完成共 {{count}} 个训练阶段",
    "overallAccuracy": "综合正确率",
    "totalHits": "总击中题数",
    "totalTimeSpent": "总用时",
    "stageBreakdown": "阶段明细成绩",
    "trialsCorrect": "{{hits}}/{{total}} 题正确",
    "idlePausedTitle": "训练已自动暂停",
    "idlePausedDesc": "检测到闲置或窗口切换，已保护您的心流与统计数据",
    "clickToResume": "点击继续训练 (或按任意键)",
    "syncingProfiles": "正在同步能力层阶与训练数据..."
  },
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json
    "tolerance": "Tolerance",
    "start": "Start",
    "end": "End",
    "topView": "Top View",
    "frontView": "Front View",
    "sideView": "Side View"
  },
~~~~~
~~~~~json
    "tolerance": "Tolerance",
    "start": "Start",
    "end": "End",
    "startPercent": "Start (0%)",
    "endPercent": "End (100%)",
    "topView": "Top View",
    "frontView": "Front View",
    "sideView": "Side View",
    "viewTriAxis": "Tri-View Orthographic Coordinates (Top / Front / Side)",
    "confirmSpace": "Confirm (Space)",
    "restartPlan": "Train This Routine Again",
    "completeAndReturnHome": "Complete & Return Home",
    "planSummaryTitle": "Daily Routine Summary",
    "planSummaryCompleted": "{{name}} • Completed {{count}} training stages",
    "overallAccuracy": "Overall Accuracy",
    "totalHits": "Total Hits",
    "totalTimeSpent": "Total Time",
    "stageBreakdown": "Stage Performance Breakdown",
    "trialsCorrect": "{{hits}}/{{total}} trials correct",
    "idlePausedTitle": "Training Paused",
    "idlePausedDesc": "Inactivity or tab switch detected. Session state protected.",
    "clickToResume": "Click to Resume (or press any key)",
    "syncingProfiles": "Syncing career level and training stats..."
  },
~~~~~

~~~~~act
patch_file
src/components/common/IdlePauseOverlay.tsx
~~~~~
~~~~~typescript
import { Pause } from 'lucide-preact';

interface IdlePauseOverlayProps {
  onResume: () => void;
}

export function IdlePauseOverlay({ onResume }: IdlePauseOverlayProps) {
  return (
    <div
      role="presentation"
      onClick={onResume}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onResume();
      }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
    >
      <div className="p-5 bg-white/95 text-slate-800 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
          <Pause className="w-6 h-6 animate-pulse" />
        </div>
        <div className="text-base font-bold text-slate-800">训练已自动暂停</div>
        <p className="text-xs text-slate-500 leading-relaxed">
          检测到闲置或窗口切换，已保护您的心流与统计数据
        </p>
        <button
          type="button"
          onClick={onResume}
          className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
        >
          点击继续训练 (或按任意键)
        </button>
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript
import { Pause } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';

interface IdlePauseOverlayProps {
  onResume: () => void;
}

export function IdlePauseOverlay({ onResume }: IdlePauseOverlayProps) {
  const { t } = useTranslation();

  return (
    <div
      role="presentation"
      onClick={onResume}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onResume();
      }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md rounded-3xl cursor-pointer select-none animate-in fade-in duration-150"
    >
      <div className="p-5 bg-white/95 text-slate-800 rounded-3xl shadow-2xl border border-white/60 flex flex-col items-center gap-2.5 max-w-xs text-center mx-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
          <Pause className="w-6 h-6 animate-pulse" />
        </div>
        <div className="text-base font-bold text-slate-800">{t('common.idlePausedTitle')}</div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {t('common.idlePausedDesc')}
        </p>
        <button
          type="button"
          onClick={onResume}
          className="mt-1 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
        >
          {t('common.clickToResume')}
        </button>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~typescript
import { ArrowRight, Award, CheckCircle, Clock, Home, RotateCcw, Target } from 'lucide-preact';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';

export interface PlanStageResult {
  card: CardDefinition;
  targetTrials: number;
  history: SessionHistoryItem[];
}
~~~~~
~~~~~typescript
import { ArrowRight, Award, CheckCircle, Clock, Home, RotateCcw, Target } from 'lucide-preact';
import { useTranslation } from '../../core/i18n';
import type { CardDefinition } from '../../types/card';
import type { SessionHistoryItem } from '../SessionSummaryModal';

export interface PlanStageResult {
  card: CardDefinition;
  targetTrials: number;
  history: SessionHistoryItem[];
}
~~~~~
~~~~~act
patch_file
src/components/plan/PlanSummaryModal.tsx
~~~~~
~~~~~typescript
export function PlanSummaryModal({
  planName,
  stageResults,
  totalElapsedSeconds,
  onClose,
  onRestart,
}: PlanSummaryModalProps) {
  const allHistory = stageResults.flatMap((s) => s.history);
  const totalTrials = allHistory.length;
  const hitCount = allHistory.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">今日训练流总结</h2>
              <p className="text-xs text-slate-400">
                {planName} • 完成共 {stageResults.length} 个训练阶段
              </p>
            </div>
          </div>
        </div>

        {/* 核心综合大盘卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              综合正确率
            </div>
            <div className="text-2xl font-black text-slate-800">{accuracy}%</div>
          </div>

          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              总击中题数
            </div>
            <div className="text-2xl font-black text-slate-800">
              {hitCount} <span className="text-xs font-normal text-slate-400">/ {totalTrials}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              总用时
            </div>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {formatTime(totalElapsedSeconds)}
            </div>
          </div>
        </div>

        {/* 分阶段明细成果 */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            阶段明细成绩
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {stageResults.map((stage, idx) => {
              const stageHits = stage.history.filter((h) => h.isHit).length;
              const stageAcc =
                stage.history.length > 0 ? Math.round((stageHits / stage.history.length) * 100) : 0;
              const startLvl = stage.history.length > 0 ? stage.history[0].levelBefore : 5;
              const endLvl =
                stage.history.length > 0
                  ? stage.history[stage.history.length - 1].levelAfter
                  : startLvl;
              const Icon = stage.card.icon;

              return (
                <div
                  key={`${stage.card.id}-${idx}`}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-slate-800 text-white font-mono text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-white text-indigo-600 border border-slate-200/60 shadow-sm">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{stage.card.title}</div>
                      <div className="text-[10px] text-slate-400">
                        {stageHits}/{stage.history.length} 题正确
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded-xl border border-slate-200/60">
                      <span>L{startLvl}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-indigo-600">L{endLvl}</span>
                    </div>

                    <span
                      className={`text-xs font-black font-mono px-2 py-1 rounded-xl ${
                        stageAcc >= 80
                          ? 'bg-emerald-100 text-emerald-700'
                          : stageAcc >= 60
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {stageAcc}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部动作按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Home className="w-4 h-4" />
            完成并返回主页
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            再练一遍此计划
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~
~~~~~typescript
export function PlanSummaryModal({
  planName,
  stageResults,
  totalElapsedSeconds,
  onClose,
  onRestart,
}: PlanSummaryModalProps) {
  const { t } = useTranslation();
  const allHistory = stageResults.flatMap((s) => s.history);
  const totalTrials = allHistory.length;
  const hitCount = allHistory.filter((h) => h.isHit).length;
  const accuracy = totalTrials > 0 ? Math.round((hitCount / totalTrials) * 100) : 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Award className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                {t('common.planSummaryTitle')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('common.planSummaryCompleted', { name: planName, count: stageResults.length })}
              </p>
            </div>
          </div>
        </div>

        {/* 核心综合大盘卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.overallAccuracy')}
            </div>
            <div className="text-2xl font-black text-slate-800">{accuracy}%</div>
          </div>

          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              {t('common.totalHits')}
            </div>
            <div className="text-2xl font-black text-slate-800">
              {hitCount} <span className="text-xs font-normal text-slate-400">/ {totalTrials}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {t('common.totalTimeSpent')}
            </div>
            <div className="text-2xl font-black text-slate-800 font-mono">
              {formatTime(totalElapsedSeconds)}
            </div>
          </div>
        </div>

        {/* 分阶段明细成果 */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t('common.stageBreakdown')}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {stageResults.map((stage, idx) => {
              const stageHits = stage.history.filter((h) => h.isHit).length;
              const stageAcc =
                stage.history.length > 0 ? Math.round((stageHits / stage.history.length) * 100) : 0;
              const startLvl = stage.history.length > 0 ? stage.history[0].levelBefore : 5;
              const endLvl =
                stage.history.length > 0
                  ? stage.history[stage.history.length - 1].levelAfter
                  : startLvl;
              const Icon = stage.card.icon;
              const cardTitle =
                t(`packs.${stage.card.packId}.cards.${stage.card.id}.title`) ||
                stage.card.title ||
                stage.card.id;

              return (
                <div
                  key={`${stage.card.id}-${idx}`}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-slate-800 text-white font-mono text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div className="p-1.5 rounded-xl bg-white text-indigo-600 border border-slate-200/60 shadow-sm">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{cardTitle}</div>
                      <div className="text-[10px] text-slate-400">
                        {t('common.trialsCorrect', { hits: stageHits, total: stage.history.length })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded-xl border border-slate-200/60">
                      <span>L{startLvl}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-indigo-600">L{endLvl}</span>
                    </div>

                    <span
                      className={`text-xs font-black font-mono px-2 py-1 rounded-xl ${
                        stageAcc >= 80
                          ? 'bg-emerald-100 text-emerald-700'
                          : stageAcc >= 60
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {stageAcc}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部动作按钮 */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            {t('common.completeAndReturnHome')}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            {t('common.restartPlan')}
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

~~~~~act
patch_file
src/components/settings/common/TargetingSection.tsx
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
          <div className={`grid ${gridCols} gap-1.5`}>
            {sectors.map((name, idx) => {
              const selected = selectedSectors.includes(idx);
              const label = t(name) || name;
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
                  {label}
                </button>
              );
            })}
          </div>
~~~~~

#### Acts 2: 改造寻星扩展包 (Star Pack) 双语词典与视图

~~~~~act
write_file
src/packs/star/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "寻星练习",
    "subTitle": "Star-Hopping",
    "desc": "基于极坐标与双极透视网格，通过视线搜寻与目标盲打，训练你对空间方位、线段比例及角度旋转的视觉直觉。"
  },
  "cards": {
    "star_single": {
      "title": "单锚点模式",
      "desc": "单一中心锚点，评估基本极坐标方位与距离感知力",
      "instruction": "观察左侧相对中心锚点的方位与距离，在右侧点阵中盲打定位",
      "badge": "单锚点"
    },
    "star_double_h": {
      "title": "水平双锚点",
      "desc": "水平线段两端锚点，评估两点比例与正交投影判定力",
      "instruction": "观察左侧水平双锚点几何关系，在右侧点阵中盲打定位",
      "badge": "水平双锚点"
    },
    "star_double_r": {
      "title": "旋转双锚点",
      "desc": "带有倾斜角度的双锚点，评估复杂旋转视角下的几何构图力",
      "instruction": "观察左侧旋转倾斜双锚点几何关系，在右侧点阵中盲打定位",
      "badge": "旋转双锚点"
    }
  },
  "settings": {
    "gridSizeTitle": "干扰点网格大小",
    "targetingTitle": "弱点专项靶向强化",
    "targetingSubTitle": "选择需要靶向强化的角度扇区："
  },
  "sectors": {
    "e": "正东 (0°)",
    "ne": "东北 (45°)",
    "n": "正北 (90°)",
    "nw": "西北 (135°)",
    "w": "正西 (180°)",
    "sw": "西南 (225°)",
    "s": "正南 (270°)",
    "se": "东南 (315°)"
  },
  "analytics": {
    "spatialBias": {
      "tabLabel": "空间偏置散点",
      "title": "{{title}} · 空间偏置分析",
      "subTitle": "中心绿点为绝对真理点，散点分布揭示手眼定位偏移",
      "cardTitle": "系统空间偏置 (Systematic Bias)",
      "desc": "中心为绝对真理点。散点越收敛代表空间直觉越敏锐。",
      "avgDx": "平均 X 轴偏移:",
      "avgDy": "平均 Y 轴偏移:",
      "avgDist": "平均像素误差:",
      "right": "右 +{{val}}",
      "left": "左 {{val}}",
      "down": "下 +{{val}}",
      "up": "上 {{val}}"
    },
    "directionalCompass": {
      "tabLabel": "八向方位罗盘",
      "title": "{{title}} · 八向方位敏感度",
      "subTitle": "洞察你在 8 个极坐标视角扇区上的定位准确率分布",
      "cardTitle": "方位盲区诊断",
      "weakestHint": "你在 {{sector}} 方位上命中率最低：",
      "accuracyRate": "{{accuracy}}% 准确率",
      "needMoreTrials": "各方位完成至少 3 题后可生成薄弱扇区诊断。"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/star/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Star-Hopping",
    "subTitle": "Star-Hopping",
    "desc": "Train visual spatial intuition for coordinates, distances, proportions, and rotations using polar and bipolar perspective grids."
  },
  "cards": {
    "star_single": {
      "title": "Single Anchor",
      "desc": "Single central anchor to evaluate polar angle and distance estimation.",
      "instruction": "Observe the target relative to the central anchor on the left, then locate it in the grid on the right.",
      "badge": "Single Anchor"
    },
    "star_double_h": {
      "title": "Horizontal Double Anchors",
      "desc": "Horizontal dual anchors to train proportion and orthogonal projection intuition.",
      "instruction": "Observe the relationship between horizontal dual anchors on the left, then locate the target on the right.",
      "badge": "Horizontal Dual"
    },
    "star_double_r": {
      "title": "Rotated Double Anchors",
      "desc": "Tilted dual anchors to master complex rotated coordinate mapping.",
      "instruction": "Observe the rotated dual anchors on the left, then locate the target on the right.",
      "badge": "Rotated Dual"
    }
  },
  "settings": {
    "gridSizeTitle": "Distractor Grid Dimensions",
    "targetingTitle": "Targeted Weakness Reinforcement",
    "targetingSubTitle": "Select angle sectors for targeted training:"
  },
  "sectors": {
    "e": "East (0°)",
    "ne": "NE (45°)",
    "n": "North (90°)",
    "nw": "NW (135°)",
    "w": "West (180°)",
    "sw": "SW (225°)",
    "s": "South (270°)",
    "se": "SE (315°)"
  },
  "analytics": {
    "spatialBias": {
      "tabLabel": "Spatial Bias",
      "title": "{{title}} · Spatial Bias Analysis",
      "subTitle": "Center point represents ground truth. Point spread reveals systematic hand-eye offset.",
      "cardTitle": "Systematic Bias",
      "desc": "Center is the ground truth. Tighter cluster indicates sharper spatial intuition.",
      "avgDx": "Avg X Offset:",
      "avgDy": "Avg Y Offset:",
      "avgDist": "Avg Pixel Error:",
      "right": "Right +{{val}}",
      "left": "Left {{val}}",
      "down": "Down +{{val}}",
      "up": "Up {{val}}"
    },
    "directionalCompass": {
      "tabLabel": "8-Way Compass",
      "title": "{{title}} · 8-Directional Sensitivity",
      "subTitle": "Insights into your localization accuracy across 8 polar sectors",
      "cardTitle": "Directional Blindspot",
      "weakestHint": "Lowest accuracy found in sector {{sector}}:",
      "accuracyRate": "{{accuracy}}% accuracy",
      "needMoreTrials": "Complete at least 3 trials in each sector to generate blindspot diagnostics."
    }
  }
}
~~~~~

~~~~~act
patch_file
src/packs/star/index.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
export const STAR_SECTORS = [
  'packs.star.sectors.e',
  'packs.star.sectors.ne',
  'packs.star.sectors.n',
  'packs.star.sectors.nw',
  'packs.star.sectors.w',
  'packs.star.sectors.sw',
  'packs.star.sectors.s',
  'packs.star.sectors.se',
];

export const STAR_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'buttonGroup',
    key: 'gridSize',
    title: 'packs.star.settings.gridSizeTitle',
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
    title: 'packs.star.settings.targetingTitle',
    subTitle: 'packs.star.settings.targetingSubTitle',
    sectors: STAR_SECTORS,
    gridCols: 'grid-cols-4',
  },
];
~~~~~

~~~~~act
patch_file
src/packs/star/analytics.tsx
~~~~~
~~~~~typescript
import { Compass, Target } from 'lucide-preact';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { type SectorStat, renderCompassCanvas } from '../../utils/canvas/drawCompass';
import { renderHeatmapCanvas } from '../../utils/canvas/drawHeatmap';
import { getTrialRecordsByCard } from '../../utils/db/index';

const STAR_SECTORS = [
  '正东 (0°)',
  '东北 (45°)',
  '正北 (90°)',
  '西北 (135°)',
  '正西 (180°)',
  '西南 (225°)',
  '正南 (270°)',
  '东南 (315°)',
];

export function createStarAnalyticsPlugin(cardId: string, title: string): CardAnalyticsPlugin {
  return {
    cardId,
    fetchRecords: async (id) => getTrialRecordsByCard(id),
    views: [
      {
        id: 'spatial_bias',
        tabLabel: '空间偏置散点',
        title: `${title} · 空间偏置分析`,
        subTitle: '中心绿点为绝对真理点，散点分布揭示手眼定位偏移',
        icon: Target,
        renderVisualizer: (canvas, records) => {
          const totalCount = records.length;
          let sumDx = 0;
          let sumDy = 0;
          for (const r of records) {
            const uClick = (r.userClick as [number, number]) || [0, 0];
            const tB = (r.targetB as [number, number]) || [0, 0];
            sumDx += uClick[0] - tB[0];
            sumDy += uClick[1] - tB[1];
          }
          const avgDx = totalCount > 0 ? Math.round((sumDx / totalCount) * 10) / 10 : 0;
          const avgDy = totalCount > 0 ? Math.round((sumDy / totalCount) * 10) / 10 : 0;
          renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
        },
        renderDiagnostics: (records) => {
          const totalCount = records.length;
          if (totalCount === 0) return null;

          let sumDx = 0;
          let sumDy = 0;
          let sumDist = 0;
          for (const r of records) {
            const uClick = (r.userClick as [number, number]) || [0, 0];
            const tB = (r.targetB as [number, number]) || [0, 0];
            sumDx += uClick[0] - tB[0];
            sumDy += uClick[1] - tB[1];
            sumDist += (r.errorPixelDistance as number) || 0;
          }
          const avgDx = Math.round((sumDx / totalCount) * 10) / 10;
          const avgDy = Math.round((sumDy / totalCount) * 10) / 10;
          const avgDist = Math.round((sumDist / totalCount) * 10) / 10;

          return (
            <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2 text-xs">
              <div className="font-bold text-indigo-900 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                系统空间偏置 (Systematic Bias)
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                中心为绝对真理点。散点越收敛代表空间直觉越敏锐。
              </p>
              <div className="pt-1 space-y-1 font-mono text-slate-700">
                <div className="flex justify-between">
                  <span>平均 X 轴偏移:</span>
                  <span className="font-bold">
                    {avgDx > 0 ? `右 +${avgDx}` : avgDx < 0 ? `左 ${avgDx}` : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>平均 Y 轴偏移:</span>
                  <span className="font-bold">
                    {avgDy > 0 ? `下 +${avgDy}` : avgDy < 0 ? `上 ${avgDy}` : '0'}
                  </span>
                </div>
                <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-200/60 pt-1">
                  <span>平均像素误差:</span>
                  <span>{avgDist}px</span>
                </div>
              </div>
            </div>
          );
        },
        getOverallStats: (records) => {
          const total = records.length;
          const hits = records.filter((r) => r.isHit).length;
          const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
          return { accuracy, total };
        },
      },
      {
        id: 'directional_compass',
        tabLabel: '八向方位罗盘',
        title: `${title} · 八向方位敏感度`,
        subTitle: '洞察你在 8 个极坐标视角扇区上的定位准确率分布',
        icon: Compass,
        renderVisualizer: (canvas, records) => {
          const sectorBuckets = Array.from({ length: 8 }, () => ({
            total: 0,
            hits: 0,
            sumDist: 0,
          }));
          for (const r of records) {
            const angle = Number(r.angleDegree ?? 0);
            const normAngle = ((angle % 360) + 360) % 360;
            const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
            sectorBuckets[sectorIdx].total += 1;
            if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
            sectorBuckets[sectorIdx].sumDist += Number(r.errorPixelDistance || 0);
          }

          const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
            sectorIdx: i,
            label: STAR_SECTORS[i],
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
            avgError: b.total > 0 ? Math.round((b.sumDist / b.total) * 10) / 10 : 0,
          }));

          renderCompassCanvas(canvas, sectorStats);
        },
        renderDiagnostics: (records) => {
          const totalCount = records.length;
          if (totalCount === 0) return null;

          const sectorBuckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0 }));
          for (const r of records) {
            const angle = Number(r.angleDegree ?? 0);
            const normAngle = ((angle % 360) + 360) % 360;
            const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
            sectorBuckets[sectorIdx].total += 1;
            if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
          }

          const validSectors = sectorBuckets
            .map((b, i) => ({
              label: STAR_SECTORS[i],
              total: b.total,
              accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
            }))
            .filter((s) => s.total >= 3);

          const weakest =
            validSectors.length > 0
              ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
              : null;

          return (
            <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2 text-xs">
              <div className="font-bold text-indigo-900 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                方位盲区诊断
              </div>
              {weakest ? (
                <div className="space-y-1.5 text-[11px] text-slate-700">
                  <p>
                    你在 <span className="font-bold text-indigo-800">{weakest.label}</span>{' '}
                    方位上命中率最低：
                  </p>
                  <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-indigo-100 font-mono">
                    <span>{weakest.label}</span>
                    <span className="font-bold text-rose-600">{weakest.accuracy}% 准确率</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-[11px]">
                  各方位完成至少 3 题后可生成薄弱扇区诊断。
                </p>
              )}
            </div>
          );
        },
        getOverallStats: (records) => {
          const total = records.length;
          const hits = records.filter((r) => r.isHit).length;
          const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
          return { accuracy, total };
        },
      },
    ],
  };
}
~~~~~
~~~~~typescript
import { Compass, Target } from 'lucide-preact';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { i18n } from '../../core/i18n';
import { type SectorStat, renderCompassCanvas } from '../../utils/canvas/drawCompass';
import { renderHeatmapCanvas } from '../../utils/canvas/drawHeatmap';
import { getTrialRecordsByCard } from '../../utils/db/index';

const STAR_SECTOR_KEYS = [
  'packs.star.sectors.e',
  'packs.star.sectors.ne',
  'packs.star.sectors.n',
  'packs.star.sectors.nw',
  'packs.star.sectors.w',
  'packs.star.sectors.sw',
  'packs.star.sectors.s',
  'packs.star.sectors.se',
];

export function createStarAnalyticsPlugin(cardId: string, titleKey: string): CardAnalyticsPlugin {
  return {
    cardId,
    fetchRecords: async (id) => getTrialRecordsByCard(id),
    views: [
      {
        id: 'spatial_bias',
        tabLabel: 'packs.star.analytics.spatialBias.tabLabel',
        title: 'packs.star.analytics.spatialBias.title',
        subTitle: 'packs.star.analytics.spatialBias.subTitle',
        icon: Target,
        renderVisualizer: (canvas, records) => {
          const totalCount = records.length;
          let sumDx = 0;
          let sumDy = 0;
          for (const r of records) {
            const uClick = (r.userClick as [number, number]) || [0, 0];
            const tB = (r.targetB as [number, number]) || [0, 0];
            sumDx += uClick[0] - tB[0];
            sumDy += uClick[1] - tB[1];
          }
          const avgDx = totalCount > 0 ? Math.round((sumDx / totalCount) * 10) / 10 : 0;
          const avgDy = totalCount > 0 ? Math.round((sumDy / totalCount) * 10) / 10 : 0;
          renderHeatmapCanvas(canvas, records, avgDx, avgDy, totalCount);
        },
        renderDiagnostics: (records) => {
          const totalCount = records.length;
          if (totalCount === 0) return null;

          let sumDx = 0;
          let sumDy = 0;
          let sumDist = 0;
          for (const r of records) {
            const uClick = (r.userClick as [number, number]) || [0, 0];
            const tB = (r.targetB as [number, number]) || [0, 0];
            sumDx += uClick[0] - tB[0];
            sumDy += uClick[1] - tB[1];
            sumDist += (r.errorPixelDistance as number) || 0;
          }
          const avgDx = Math.round((sumDx / totalCount) * 10) / 10;
          const avgDy = Math.round((sumDy / totalCount) * 10) / 10;
          const avgDist = Math.round((sumDist / totalCount) * 10) / 10;

          const dxText =
            avgDx > 0
              ? i18n.t('packs.star.analytics.spatialBias.right', { val: avgDx })
              : avgDx < 0
                ? i18n.t('packs.star.analytics.spatialBias.left', { val: avgDx })
                : '0';

          const dyText =
            avgDy > 0
              ? i18n.t('packs.star.analytics.spatialBias.down', { val: avgDy })
              : avgDy < 0
                ? i18n.t('packs.star.analytics.spatialBias.up', { val: avgDy })
                : '0';

          return (
            <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2 text-xs">
              <div className="font-bold text-indigo-900 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                {i18n.t('packs.star.analytics.spatialBias.cardTitle')}
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {i18n.t('packs.star.analytics.spatialBias.desc')}
              </p>
              <div className="pt-1 space-y-1 font-mono text-slate-700">
                <div className="flex justify-between">
                  <span>{i18n.t('packs.star.analytics.spatialBias.avgDx')}</span>
                  <span className="font-bold">{dxText}</span>
                </div>
                <div className="flex justify-between">
                  <span>{i18n.t('packs.star.analytics.spatialBias.avgDy')}</span>
                  <span className="font-bold">{dyText}</span>
                </div>
                <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-200/60 pt-1">
                  <span>{i18n.t('packs.star.analytics.spatialBias.avgDist')}</span>
                  <span>{avgDist}px</span>
                </div>
              </div>
            </div>
          );
        },
        getOverallStats: (records) => {
          const total = records.length;
          const hits = records.filter((r) => r.isHit).length;
          const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
          return { accuracy, total };
        },
      },
      {
        id: 'directional_compass',
        tabLabel: 'packs.star.analytics.directionalCompass.tabLabel',
        title: 'packs.star.analytics.directionalCompass.title',
        subTitle: 'packs.star.analytics.directionalCompass.subTitle',
        icon: Compass,
        renderVisualizer: (canvas, records) => {
          const sectorBuckets = Array.from({ length: 8 }, () => ({
            total: 0,
            hits: 0,
            sumDist: 0,
          }));
          for (const r of records) {
            const angle = Number(r.angleDegree ?? 0);
            const normAngle = ((angle % 360) + 360) % 360;
            const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
            sectorBuckets[sectorIdx].total += 1;
            if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
            sectorBuckets[sectorIdx].sumDist += Number(r.errorPixelDistance || 0);
          }

          const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
            sectorIdx: i,
            label: i18n.t(STAR_SECTOR_KEYS[i]),
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
            avgError: b.total > 0 ? Math.round((b.sumDist / b.total) * 10) / 10 : 0,
          }));

          renderCompassCanvas(canvas, sectorStats);
        },
        renderDiagnostics: (records) => {
          const totalCount = records.length;
          if (totalCount === 0) return null;

          const sectorBuckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0 }));
          for (const r of records) {
            const angle = Number(r.angleDegree ?? 0);
            const normAngle = ((angle % 360) + 360) % 360;
            const sectorIdx = Math.floor(((normAngle + 22.5) % 360) / 45);
            sectorBuckets[sectorIdx].total += 1;
            if (r.isHit) sectorBuckets[sectorIdx].hits += 1;
          }

          const validSectors = sectorBuckets
            .map((b, i) => ({
              label: i18n.t(STAR_SECTOR_KEYS[i]),
              total: b.total,
              accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
            }))
            .filter((s) => s.total >= 3);

          const weakest =
            validSectors.length > 0
              ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
              : null;

          return (
            <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2 text-xs">
              <div className="font-bold text-indigo-900 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                {i18n.t('packs.star.analytics.directionalCompass.cardTitle')}
              </div>
              {weakest ? (
                <div className="space-y-1.5 text-[11px] text-slate-700">
                  <p>
                    {i18n.t('packs.star.analytics.directionalCompass.weakestHint', {
                      sector: weakest.label,
                    })}
                  </p>
                  <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-indigo-100 font-mono">
                    <span>{weakest.label}</span>
                    <span className="font-bold text-rose-600">
                      {i18n.t('packs.star.analytics.directionalCompass.accuracyRate', {
                        accuracy: weakest.accuracy,
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-[11px]">
                  {i18n.t('packs.star.analytics.directionalCompass.needMoreTrials')}
                </p>
              )}
            </div>
          );
        },
        getOverallStats: (records) => {
          const total = records.length;
          const hits = records.filter((r) => r.isHit).length;
          const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
          return { accuracy, total };
        },
      },
    ],
  };
}
~~~~~

#### Acts 3: 改造绝对色感扩展包 (Color Pack) 双语词典与视图

~~~~~act
write_file
src/packs/color/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "绝对色感",
    "subTitle": "Color Recognition",
    "desc": "拆解 HSV 色彩空间，通过色相 (Hue)、明度 (Value) 与饱和度 (Saturation) 的分级递进识别，全面建立微小色彩差异感知力。"
  },
  "cards": {
    "color_hue": {
      "title": "色相 (Hue)",
      "desc": "识别颜色在色相环上的具体角度 (0°~360°)",
      "instruction": "定位上方色块在 360° 色相环上的精准角度",
      "badge": "色相"
    },
    "color_val": {
      "title": "明度 (Value)",
      "desc": "已知色相，评估颜色的素描明暗程度 (0%~100%)",
      "instruction": "评估上方色块的素描明度深浅比例 (0%~100%)",
      "badge": "明度"
    },
    "color_sat": {
      "title": "饱和度 (Sat)",
      "desc": "已知色相与明度，评估色彩的鲜艳纯度 (0%~100%)",
      "instruction": "评估上方色块的鲜艳纯度比例 (0%~100%)",
      "badge": "饱和度"
    },
    "color_all": {
      "title": "综合拾色 (Match)",
      "desc": "同时调整色相、饱和度与明度，逼近真理色彩",
      "instruction": "同时调制色相、饱和度与明度轨，使右侧色块逼近左侧目标色",
      "badge": "综合拾色"
    }
  },
  "settings": {
    "showToleranceBandTitle": "显示滑块容错感应区",
    "showToleranceBandDesc": "在悬停光标两侧实时显示动态容错区间",
    "targetingTitle": "色相弱点专项靶向强化",
    "targetingSubTitle": "选择需要靶向强化的色相扇区：",
    "enableHoverColorPreviewTitle": "综合拾色悬停颜色实时联动",
    "enableHoverColorPreviewDesc": "鼠标悬停滑块时右侧色块实时跟随试探预览"
  },
  "sectors": {
    "red": "红 (0°-30°)",
    "orange": "橙 (30°-60°)",
    "yellow": "黄 (60°-90°)",
    "yellowGreen": "黄绿 (90°-120°)",
    "green": "绿 (120°-150°)",
    "cyanGreen": "青绿 (150°-180°)",
    "cyan": "青 (180°-210°)",
    "blue": "蓝 (210°-240°)",
    "blueViolet": "蓝紫 (240°-270°)",
    "violet": "紫 (270°-300°)",
    "magenta": "品红 (300°-330°)",
    "rose": "紫红 (330°-360°)"
  },
  "analytics": {
    "hueBias": {
      "tabLabel": "色相偏差度",
      "title": "色相偏差度分析",
      "subTitle": "横轴色相与纵轴偏差分布，揭示系统性偏色倾向",
      "cardTitle": "系统性偏色倾向诊断",
      "avgSignedBias": "全局平均偏转角:",
      "clockwise": "+{{val}}° (顺时针)",
      "counterClockwise": "{{val}}° (逆时针)",
      "maxBiasSector": "最大偏差扇区：",
      "avgBias": "平均偏差:",
      "needMoreTrials": "样本量达到每个扇区至少 3 题后可生成精准扇区偏向诊断。",
      "avgAbsError": "平均绝对角度误差:"
    },
    "hueRing": {
      "tabLabel": "12 色相敏感度",
      "title": "12 色相敏感度分析",
      "subTitle": "洞察你对 OKLab 色彩空间 12 色相扇区的敏感度与正确率分布",
      "cardTitle": "色相盲区诊断",
      "weakestHint": "你在 {{sector}} 色相上辨识度最低：",
      "accuracyRate": "{{accuracy}}% 正确率",
      "needMoreTrials": "需每个色相扇区完成至少 3 题才能生成弱点诊断。"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/color/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Absolute Color Recognition",
    "subTitle": "Color Recognition",
    "desc": "Deconstruct the HSV/OKLab color space. Build perceptual acuity through progressive identification of Hue, Value, and Saturation."
  },
  "cards": {
    "color_hue": {
      "title": "Hue",
      "desc": "Identify the exact angle of a color on the 360° color wheel.",
      "instruction": "Locate the exact degree of the color on the 360° color wheel.",
      "badge": "Hue"
    },
    "color_val": {
      "title": "Value",
      "desc": "Given hue, estimate the lightness/darkness value (0%~100%).",
      "instruction": "Estimate the value/brightness percentage of the color (0%~100%).",
      "badge": "Value"
    },
    "color_sat": {
      "title": "Saturation",
      "desc": "Given hue and value, estimate the purity and saturation (0%~100%).",
      "instruction": "Estimate the saturation purity percentage of the color (0%~100%).",
      "badge": "Saturation"
    },
    "color_all": {
      "title": "Full Color Match",
      "desc": "Simultaneously adjust Hue, Saturation, and Value to match the target color.",
      "instruction": "Modulate H, S, and V tracks to match the target color on the left.",
      "badge": "Match"
    }
  },
  "settings": {
    "showToleranceBandTitle": "Show Tolerance Indicator Band",
    "showToleranceBandDesc": "Display live dynamic tolerance bands on either side of the slider thumb",
    "targetingTitle": "Targeted Hue Reinforcement",
    "targetingSubTitle": "Select hue sectors for targeted practice:",
    "enableHoverColorPreviewTitle": "Realtime Color Preview on Slider Hover",
    "enableHoverColorPreviewDesc": "Follow trial preview swatch when cursor hovers over sliders"
  },
  "sectors": {
    "red": "Red (0°-30°)",
    "orange": "Orange (30°-60°)",
    "yellow": "Yellow (60°-90°)",
    "yellowGreen": "Yellow-Green (90°-120°)",
    "green": "Green (120°-150°)",
    "cyanGreen": "Cyan-Green (150°-180°)",
    "cyan": "Cyan (180°-210°)",
    "blue": "Blue (210°-240°)",
    "blueViolet": "Blue-Violet (240°-270°)",
    "violet": "Violet (270°-300°)",
    "magenta": "Magenta (300°-330°)",
    "rose": "Rose (330°-360°)"
  },
  "analytics": {
    "hueBias": {
      "tabLabel": "Hue Bias",
      "title": "Hue Bias Analysis",
      "subTitle": "Distribution of signed hue offsets across the spectrum",
      "cardTitle": "Systematic Hue Offset Diagnostics",
      "avgSignedBias": "Global Average Hue Deviation:",
      "clockwise": "+{{val}}° (Clockwise)",
      "counterClockwise": "{{val}}° (Counter-Clockwise)",
      "maxBiasSector": "Greatest Bias Sector:",
      "avgBias": "Avg Bias:",
      "needMoreTrials": "Complete at least 3 trials in each sector to generate precise bias diagnostics.",
      "avgAbsError": "Mean Absolute Angular Error:"
    },
    "hueRing": {
      "tabLabel": "12-Hue Sensitivity",
      "title": "12-Hue Sensitivity",
      "subTitle": "Perceptual accuracy across 12 OKLab hue sectors",
      "cardTitle": "Hue Blindspot Diagnostics",
      "weakestHint": "Lowest accuracy found in sector {{sector}}:",
      "accuracyRate": "{{accuracy}}% accuracy",
      "needMoreTrials": "Complete at least 3 trials in each hue sector to generate blindspot diagnostics."
    }
  }
}
~~~~~

~~~~~act
patch_file
src/packs/color/index.ts
~~~~~
~~~~~typescript
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
~~~~~
~~~~~typescript
export const COLOR_SECTOR_KEYS = [
  'packs.color.sectors.red',
  'packs.color.sectors.orange',
  'packs.color.sectors.yellow',
  'packs.color.sectors.yellowGreen',
  'packs.color.sectors.green',
  'packs.color.sectors.cyanGreen',
  'packs.color.sectors.cyan',
  'packs.color.sectors.blue',
  'packs.color.sectors.blueViolet',
  'packs.color.sectors.violet',
  'packs.color.sectors.magenta',
  'packs.color.sectors.rose',
];

export const SLIDER_COMMON_SCHEMAS: SettingFieldSchema[] = [
  {
    type: 'toggle',
    key: 'showToleranceBand',
    title: 'packs.color.settings.showToleranceBandTitle',
    description: 'packs.color.settings.showToleranceBandDesc',
  },
];

export const HUE_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'targeting',
    modeKey: 'targetingMode',
    sectorsKey: 'manualTargetSectors',
    title: 'packs.color.settings.targetingTitle',
    subTitle: 'packs.color.settings.targetingSubTitle',
    sectors: COLOR_SECTOR_KEYS,
    gridCols: 'grid-cols-3',
  },
];

export const COLOR_ALL_SCHEMAS: SettingFieldSchema[] = [
  ...SLIDER_COMMON_SCHEMAS,
  {
    type: 'toggle',
    key: 'enableHoverColorPreview',
    title: 'packs.color.settings.enableHoverColorPreviewTitle',
    description: 'packs.color.settings.enableHoverColorPreviewDesc',
  },
];
~~~~~

~~~~~act
patch_file
src/packs/color/analytics.tsx
~~~~~
~~~~~typescript
import { AlertCircle, PieChart, Sparkles } from 'lucide-preact';
import { hsvToHex } from '../../core/color/colorUtils';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { renderHueRingCanvas } from '../../utils/canvas/drawColorRing';
import type { SectorStat } from '../../utils/canvas/drawCompass';
import { calcSignedHueBias, renderHueBiasChartCanvas } from '../../utils/canvas/drawHueBiasChart';
import { getTrialRecordsByCard } from '../../utils/db/index';

const COLOR_SECTORS = [
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
~~~~~
~~~~~typescript
import { AlertCircle, PieChart, Sparkles } from 'lucide-preact';
import { hsvToHex } from '../../core/color/colorUtils';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { i18n } from '../../core/i18n';
import { renderHueRingCanvas } from '../../utils/canvas/drawColorRing';
import type { SectorStat } from '../../utils/canvas/drawCompass';
import { calcSignedHueBias, renderHueBiasChartCanvas } from '../../utils/canvas/drawHueBiasChart';
import { getTrialRecordsByCard } from '../../utils/db/index';

const COLOR_SECTOR_KEYS = [
  'packs.color.sectors.red',
  'packs.color.sectors.orange',
  'packs.color.sectors.yellow',
  'packs.color.sectors.yellowGreen',
  'packs.color.sectors.green',
  'packs.color.sectors.cyanGreen',
  'packs.color.sectors.cyan',
  'packs.color.sectors.blue',
  'packs.color.sectors.blueViolet',
  'packs.color.sectors.violet',
  'packs.color.sectors.magenta',
  'packs.color.sectors.rose',
];
~~~~~

~~~~~act
patch_file
src/packs/color/analytics.tsx
~~~~~
~~~~~typescript
export const colorHueAnalyticsPlugin: CardAnalyticsPlugin = {
  cardId: 'color_hue',
  fetchRecords: async (id) => getTrialRecordsByCard(id),
  views: [
    {
      id: 'hue_bias_chart',
      tabLabel: '色相偏差度',
      title: '色相偏差度分析',
      subTitle: '横轴色相与纵轴偏差分布，揭示系统性偏色倾向',
      icon: Sparkles,
      renderVisualizer: (canvas, records) => {
        renderHueBiasChartCanvas(canvas, records);
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumSignedBias = 0;
        const sectorBuckets = Array.from({ length: 12 }, () => ({ total: 0, hits: 0, sumBias: 0 }));
        for (const r of records) {
          const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
          const uHsv = (r.userHSV as [number, number, number]) || tHsv;
          const bias = calcSignedHueBias(tHsv[0], uHsv[0]);
          sumSignedBias += bias;

          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumBias += bias;
        }

        const avgSignedBias = Math.round((sumSignedBias / totalCount) * 10) / 10;
        const validSectors = sectorBuckets
          .map((b, i) => ({
            sectorIdx: i,
            label: COLOR_SECTORS[i],
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
            avgBias: b.total > 0 ? Math.round((b.sumBias / b.total) * 10) / 10 : 0,
          }))
          .filter((s) => s.total >= 3);

        const maxBiasSector =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) =>
                Math.abs(curr.avgBias) > Math.abs(prev.avgBias) ? curr : prev,
              )
            : null;

        return (
          <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-2 text-xs">
            <div className="font-bold text-amber-900 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              系统性偏色倾向诊断
            </div>

            <div className="space-y-1 text-[11px] text-slate-700">
              <div className="flex justify-between bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm font-mono">
                <span>全局平均偏转角:</span>
                <span
                  className={`font-bold ${
                    avgSignedBias > 0
                      ? 'text-amber-600'
                      : avgSignedBias < 0
                        ? 'text-indigo-600'
                        : 'text-slate-700'
                  }`}
                >
                  {avgSignedBias > 0
                    ? `+${avgSignedBias}° (顺时针)`
                    : avgSignedBias < 0
                      ? `${avgSignedBias}° (逆时针)`
                      : '0°'}
                </span>
              </div>

              {maxBiasSector ? (
                <div className="mt-2 space-y-1.5">
                  <p className="text-slate-600">
                    最大偏差扇区：
                    <span className="font-bold text-amber-800">{maxBiasSector.label}</span>
                  </p>
                  <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full border border-slate-200"
                        style={{
                          backgroundColor: hsvToHex(maxBiasSector.sectorIdx * 30 + 15, 100, 100),
                        }}
                      />
                      <span className="font-bold text-slate-800">
                        {maxBiasSector.label.split(' ')[0]}
                      </span>
                    </div>
                    <span className="font-black text-amber-700 font-mono text-xs">
                      平均偏差:{' '}
                      {maxBiasSector.avgBias > 0
                        ? `+${maxBiasSector.avgBias}°`
                        : `${maxBiasSector.avgBias}°`}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-[10px] mt-1">
                  样本量达到每个扇区至少 3 题后可生成精准扇区偏向诊断。
                </p>
              )}
            </div>
          </div>
        );
      },
      getOverallStats: (records) => {
        const total = records.length;
        const hits = records.filter((r) => r.isHit).length;
        const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError = total > 0 ? Math.round((sumError / total) * 10) / 10 : 0;

        return {
          accuracy,
          total,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
              <span>平均绝对角度误差:</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
    {
      id: 'hue_ring',
      tabLabel: '12 色相敏感度',
      title: '12 色相敏感度分析',
      subTitle: '洞察你对 OKLab 色彩空间 12 色相扇区的敏感度与正确率分布',
      icon: PieChart,
      renderVisualizer: (canvas, records) => {
        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumError: 0,
        }));
        for (const r of records) {
          const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
        }
        const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
          sectorIdx: i,
          label: COLOR_SECTORS[i],
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
        }));
        renderHueRingCanvas(canvas, sectorStats);
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumError: 0,
        }));
        for (const r of records) {
          const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
        }
        const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
          sectorIdx: i,
          label: COLOR_SECTORS[i],
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
        }));
        const validSectors = sectorStats.filter((s) => s.total >= 3);
        const weakestSector =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
            : null;

        return (
          <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-2 text-xs">
            <div className="font-bold text-amber-900 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              色相盲区诊断
            </div>
            {weakestSector ? (
              <div className="space-y-2">
                <p className="text-slate-700 text-[11px]">
                  你在 <span className="font-bold text-amber-700">{weakestSector.label}</span>{' '}
                  色相上辨识度最低：
                </p>
                <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full border border-slate-200"
                      style={{
                        backgroundColor: hsvToHex(weakestSector.sectorIdx * 30 + 15, 100, 100),
                      }}
                    />
                    <span className="font-bold text-slate-800">
                      {weakestSector.label.split(' ')[0]}
                    </span>
                  </div>
                  <span className="font-black text-rose-600 text-sm">
                    {weakestSector.accuracy}% 正确率
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-600 text-[11px]">
                需每个色相扇区完成至少 3 题才能生成弱点诊断。
              </p>
            )}
          </div>
        );
      },
      getOverallStats: (records) => {
        const total = records.length;
        const hits = records.filter((r) => r.isHit).length;
        const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError = total > 0 ? Math.round((sumError / total) * 10) / 10 : 0;

        return {
          accuracy,
          total,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
              <span>平均绝对角度误差:</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
  ],
};
~~~~~
~~~~~typescript
export const colorHueAnalyticsPlugin: CardAnalyticsPlugin = {
  cardId: 'color_hue',
  fetchRecords: async (id) => getTrialRecordsByCard(id),
  views: [
    {
      id: 'hue_bias_chart',
      tabLabel: 'packs.color.analytics.hueBias.tabLabel',
      title: 'packs.color.analytics.hueBias.title',
      subTitle: 'packs.color.analytics.hueBias.subTitle',
      icon: Sparkles,
      renderVisualizer: (canvas, records) => {
        renderHueBiasChartCanvas(canvas, records);
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        let sumSignedBias = 0;
        const sectorBuckets = Array.from({ length: 12 }, () => ({ total: 0, hits: 0, sumBias: 0 }));
        for (const r of records) {
          const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
          const uHsv = (r.userHSV as [number, number, number]) || tHsv;
          const bias = calcSignedHueBias(tHsv[0], uHsv[0]);
          sumSignedBias += bias;

          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumBias += bias;
        }

        const avgSignedBias = Math.round((sumSignedBias / totalCount) * 10) / 10;
        const validSectors = sectorBuckets
          .map((b, i) => ({
            sectorIdx: i,
            label: i18n.t(COLOR_SECTOR_KEYS[i]),
            total: b.total,
            accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
            avgBias: b.total > 0 ? Math.round((b.sumBias / b.total) * 10) / 10 : 0,
          }))
          .filter((s) => s.total >= 3);

        const maxBiasSector =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) =>
                Math.abs(curr.avgBias) > Math.abs(prev.avgBias) ? curr : prev,
              )
            : null;

        const signedBiasText =
          avgSignedBias > 0
            ? i18n.t('packs.color.analytics.hueBias.clockwise', { val: avgSignedBias })
            : avgSignedBias < 0
              ? i18n.t('packs.color.analytics.hueBias.counterClockwise', { val: avgSignedBias })
              : '0°';

        return (
          <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-2 text-xs">
            <div className="font-bold text-amber-900 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              {i18n.t('packs.color.analytics.hueBias.cardTitle')}
            </div>

            <div className="space-y-1 text-[11px] text-slate-700">
              <div className="flex justify-between bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm font-mono">
                <span>{i18n.t('packs.color.analytics.hueBias.avgSignedBias')}</span>
                <span
                  className={`font-bold ${
                    avgSignedBias > 0
                      ? 'text-amber-600'
                      : avgSignedBias < 0
                        ? 'text-indigo-600'
                        : 'text-slate-700'
                  }`}
                >
                  {signedBiasText}
                </span>
              </div>

              {maxBiasSector ? (
                <div className="mt-2 space-y-1.5">
                  <p className="text-slate-600">
                    {i18n.t('packs.color.analytics.hueBias.maxBiasSector')}
                    <span className="font-bold text-amber-800">{maxBiasSector.label}</span>
                  </p>
                  <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full border border-slate-200"
                        style={{
                          backgroundColor: hsvToHex(maxBiasSector.sectorIdx * 30 + 15, 100, 100),
                        }}
                      />
                      <span className="font-bold text-slate-800">
                        {maxBiasSector.label.split(' ')[0]}
                      </span>
                    </div>
                    <span className="font-black text-amber-700 font-mono text-xs">
                      {i18n.t('packs.color.analytics.hueBias.avgBias')}{' '}
                      {maxBiasSector.avgBias > 0
                        ? `+${maxBiasSector.avgBias}°`
                        : `${maxBiasSector.avgBias}°`}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-[10px] mt-1">
                  {i18n.t('packs.color.analytics.hueBias.needMoreTrials')}
                </p>
              )}
            </div>
          </div>
        );
      },
      getOverallStats: (records) => {
        const total = records.length;
        const hits = records.filter((r) => r.isHit).length;
        const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError = total > 0 ? Math.round((sumError / total) * 10) / 10 : 0;

        return {
          accuracy,
          total,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
              <span>{i18n.t('packs.color.analytics.hueBias.avgAbsError')}</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
    {
      id: 'hue_ring',
      tabLabel: 'packs.color.analytics.hueRing.tabLabel',
      title: 'packs.color.analytics.hueRing.title',
      subTitle: 'packs.color.analytics.hueRing.subTitle',
      icon: PieChart,
      renderVisualizer: (canvas, records) => {
        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumError: 0,
        }));
        for (const r of records) {
          const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
        }
        const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
          sectorIdx: i,
          label: i18n.t(COLOR_SECTOR_KEYS[i]),
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
        }));
        renderHueRingCanvas(canvas, sectorStats);
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const sectorBuckets = Array.from({ length: 12 }, () => ({
          total: 0,
          hits: 0,
          sumError: 0,
        }));
        for (const r of records) {
          const tHsv = (r.targetHSV as [number, number, number]) || [0, 0, 0];
          const idx = Math.max(0, Math.min(11, Math.floor(tHsv[0] / 30)));
          sectorBuckets[idx].total += 1;
          if (r.isHit) sectorBuckets[idx].hits += 1;
          sectorBuckets[idx].sumError += Number(r.errorValue ?? 0);
        }
        const sectorStats: SectorStat[] = sectorBuckets.map((b, i) => ({
          sectorIdx: i,
          label: i18n.t(COLOR_SECTOR_KEYS[i]),
          total: b.total,
          accuracy: b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0,
          avgError: b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0,
        }));
        const validSectors = sectorStats.filter((s) => s.total >= 3);
        const weakestSector =
          validSectors.length > 0
            ? validSectors.reduce((prev, curr) => (curr.accuracy < prev.accuracy ? curr : prev))
            : null;

        return (
          <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-100 space-y-2 text-xs">
            <div className="font-bold text-amber-900 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              {i18n.t('packs.color.analytics.hueRing.cardTitle')}
            </div>
            {weakestSector ? (
              <div className="space-y-2">
                <p className="text-slate-700 text-[11px]">
                  {i18n.t('packs.color.analytics.hueRing.weakestHint', {
                    sector: weakestSector.label,
                  })}
                </p>
                <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full border border-slate-200"
                      style={{
                        backgroundColor: hsvToHex(weakestSector.sectorIdx * 30 + 15, 100, 100),
                      }}
                    />
                    <span className="font-bold text-slate-800">
                      {weakestSector.label.split(' ')[0]}
                    </span>
                  </div>
                  <span className="font-black text-rose-600 text-sm">
                    {i18n.t('packs.color.analytics.hueRing.accuracyRate', {
                      accuracy: weakestSector.accuracy,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-600 text-[11px]">
                {i18n.t('packs.color.analytics.hueRing.needMoreTrials')}
              </p>
            )}
          </div>
        );
      },
      getOverallStats: (records) => {
        const total = records.length;
        const hits = records.filter((r) => r.isHit).length;
        const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
        const sumError = records.reduce((acc, curr) => acc + Number(curr.errorValue || 0), 0);
        const avgError = total > 0 ? Math.round((sumError / total) * 10) / 10 : 0;

        return {
          accuracy,
          total,
          customSummary: (
            <div className="flex justify-between text-indigo-700 font-bold border-t border-indigo-100 pt-1 text-xs">
              <span>{i18n.t('packs.color.analytics.hueBias.avgAbsError')}</span>
              <span>{avgError}°</span>
            </div>
          ),
        };
      },
    },
  ],
};
~~~~~

#### Acts 4: 改造相对色感扩展包 (Relative Color Pack) 双语词典与视图

~~~~~act
write_file
src/packs/relative_color/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "相对色感",
    "subTitle": "Relative Color Perception",
    "desc": "基于 OKLab 感知均匀色彩空间，通过固有色与环境光的推移矢量 (Vector v_AB)，建立客观光影下相对色彩推移与对比关系的硬核艺术敏锐度。"
  },
  "cards": {
    "rel_vector_shift": {
      "title": "色彩矢量迁移",
      "desc": "保持固有色推移矢量 v_AB 在全场施加统一推移，建立光影相对偏转直觉。",
      "instruction": "观察上方 A➔B 色彩推移，在下方候选项中找出符合 C➔D 的同向推移色",
      "badge": "矢量迁移"
    },
    "rel_lightness_induction": {
      "title": "明度反差补偿",
      "desc": "在强明暗对比背景下，微调中心色物理明度以抵消环境视错觉，达成感知一致。",
      "instruction": "调节右侧中心色块明度，使左右两块在不同背景下「视觉感知看起来完全一致」",
      "badge": "明度反差补偿"
    },
    "rel_hue_induction": {
      "title": "补色残像调和",
      "desc": "在强色相与饱和度背景下，四选一选出逆向补偿后的目标色，训练环境光色感知调和力。",
      "instruction": "观察左侧强色相背景下的基准色，选出右侧达成感知一致的补偿色 (键 1-4)",
      "badge": "补色残像调和"
    },
    "rel_decontextual_2afc": {
      "title": "环境穿透判别",
      "desc": "穿透强对比背景的视错觉陷阱，快速二选一判别色块的客观物理明度真理。",
      "instruction": "穿透背景视错觉干扰，二选一判别哪一侧中心色块「客观物理明度更高」",
      "badge": "环境穿透判别"
    }
  },
  "views": {
    "leftBase": "左侧固定基准",
    "rightModulate": "右侧调制区 (达成感知一致)",
    "rightPreview": "右侧环境补偿区 (实时预览)",
    "vectorPrompt": "观察上方 A➔B 色彩推移，在候选区选出符合 C➔D 的同向推移色",
    "lightnessHint": "调节右侧中心明度，使左右两块视觉感知看起来完全一致",
    "inductionHint": "调节右侧中心色彩，反向补偿背景诱导达成视觉感知一致",
    "hueSelectHint": "观察左侧基准，在下方切换选项预览并确认提交 (键 1-4 切换，Space 提交)",
    "decontextualHint": "穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」",
    "physicallyBrighter": "物理明度更高 (V: {{v}}%)",
    "physicallyDarker": "物理更暗 (V: {{v}}%)"
  }
}
~~~~~

~~~~~act
write_file
src/packs/relative_color/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Relative Color Perception",
    "subTitle": "Relative Color Perception",
    "desc": "Master color vector constancy and Albers simultaneous contrast in OKLab perceptual color space."
  },
  "cards": {
    "rel_vector_shift": {
      "title": "Color Vector Shift",
      "desc": "Observe color vector shift A->B and select matching parallel shift C->D.",
      "instruction": "Observe vector A->B and find matching vector C->D below.",
      "badge": "Vector Shift"
    },
    "rel_lightness_induction": {
      "title": "Lightness Induction",
      "desc": "Compensate for background illusion to achieve perceived lightness constancy.",
      "instruction": "Adjust right center value so both center squares appear perceptually identical.",
      "badge": "Lightness Induction"
    },
    "rel_hue_induction": {
      "title": "Hue Induction & Harmony",
      "desc": "Select the compensated target color to counteract chromatic induction (4AFC).",
      "instruction": "Select the hue that compensates for the colored background (Keys 1-4).",
      "badge": "Hue Induction"
    },
    "rel_decontextual_2afc": {
      "title": "Decontextualized 2AFC",
      "desc": "Pierce through simultaneous contrast illusions to identify the objectively brighter color.",
      "instruction": "Identify which center square is physically brighter (Keys 1 / 2).",
      "badge": "Decontextualized"
    }
  },
  "views": {
    "leftBase": "Left Anchor Reference",
    "rightModulate": "Right Modulation (Match Perception)",
    "rightPreview": "Right Compensated Area (Live Preview)",
    "vectorPrompt": "Observe vector shift A➔B and pick the matching C➔D shift below",
    "lightnessHint": "Adjust right center lightness until both center swatches appear identical",
    "inductionHint": "Modulate right center color to counter background induction",
    "hueSelectHint": "Observe reference and preview candidate compensations below (Keys 1-4, Space)",
    "decontextualHint": "Pierce background illusion and identify the objectively brighter center square",
    "physicallyBrighter": "Physically Brighter (V: {{v}}%)",
    "physicallyDarker": "Physically Darker (V: {{v}}%)"
  }
}
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/AlbersInductionView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { HsvTrackSlider } from '../../../components/HsvTrackSlider';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { hsvToHex } from '../../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { HsvTrackSlider } from '../../../components/HsvTrackSlider';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { hsvToHex } from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/AlbersInductionView.tsx
~~~~~
~~~~~typescript
export function AlbersInductionView({
  question,
  showAnswer,
  userAnswer,
  userRightH,
  userRightS,
  userRightV,
  onUserRightHChange,
  onUserRightSChange,
  onUserRightVChange,
  onSubmit,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AlbersInductionViewProps) {
  const isLightnessMode = question.mode === 'LIGHTNESS_INDUCTION';
~~~~~
~~~~~typescript
export function AlbersInductionView({
  question,
  showAnswer,
  userAnswer,
  userRightH,
  userRightS,
  userRightV,
  onUserRightHChange,
  onUserRightSChange,
  onUserRightVChange,
  onSubmit,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AlbersInductionViewProps) {
  const { t } = useTranslation();
  const isLightnessMode = question.mode === 'LIGHTNESS_INDUCTION';
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/AlbersInductionView.tsx
~~~~~
~~~~~typescript
    <QuestionCardShell
      hintText={
        isLightnessMode
          ? '调节右侧中心明度，使左右两块视觉感知看起来完全一致'
          : '调节右侧中心色彩，反向补偿背景诱导达成视觉感知一致'
      }
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <DualViewportContainer
        leftTitle="左侧固定基准"
        rightTitle="右侧调制区 (达成感知一致)"
        leftContent={
~~~~~
~~~~~typescript
    <QuestionCardShell
      hintText={
        isLightnessMode
          ? t('packs.relative_color.views.lightnessHint')
          : t('packs.relative_color.views.inductionHint')
      }
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <DualViewportContainer
        leftTitle={t('packs.relative_color.views.leftBase')}
        rightTitle={t('packs.relative_color.views.rightModulate')}
        leftContent={
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/Decontextual2AfcView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';

interface Decontextual2AfcViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
  selectedChoice?: 'A' | 'B' | null;
  onSelectChoice: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function Decontextual2AfcView({
  question,
  showAnswer,
  onSelectChoice,
  disabled = false,
  showCanvasHints = true,
}: Decontextual2AfcViewProps) {
  const isAHit = question.largerPhysicalSide === 'A';
  const isBHit = question.largerPhysicalSide === 'B';

  const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
  const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
  const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
  const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText="穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onSelectChoice}
      optionA={{
        title: '区域 A',
        isCorrect: isAHit,
        badge: isAHit
          ? `物理明度更高 (V: ${question.centerColorA?.[2]}%)`
          : `物理更暗 (V: ${question.centerColorA?.[2]}%)`,
        content: (
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
          </div>
        ),
      }}
      optionB={{
        title: '区域 B',
        isCorrect: isBHit,
        badge: isBHit
          ? `物理明度更高 (V: ${question.centerColorB?.[2]}%)`
          : `物理更暗 (V: ${question.centerColorB?.[2]}%)`,
        content: (
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
          </div>
        ),
      }}
    />
  );
}
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';

interface Decontextual2AfcViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer?: RelativeColorHitResult | null;
  selectedChoice?: 'A' | 'B' | null;
  onSelectChoice: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function Decontextual2AfcView({
  question,
  showAnswer,
  onSelectChoice,
  disabled = false,
  showCanvasHints = true,
}: Decontextual2AfcViewProps) {
  const { t } = useTranslation();
  const isAHit = question.largerPhysicalSide === 'A';
  const isBHit = question.largerPhysicalSide === 'B';

  const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
  const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
  const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
  const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('packs.relative_color.views.decontextualHint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onSelectChoice}
      optionA={{
        title: t('common.areaA'),
        isCorrect: isAHit,
        badge: isAHit
          ? t('packs.relative_color.views.physicallyBrighter', { v: question.centerColorA?.[2] ?? 50 })
          : t('packs.relative_color.views.physicallyDarker', { v: question.centerColorA?.[2] ?? 50 }),
        content: (
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: isBHit
          ? t('packs.relative_color.views.physicallyBrighter', { v: question.centerColorB?.[2] ?? 50 })
          : t('packs.relative_color.views.physicallyDarker', { v: question.centerColorB?.[2] ?? 50 }),
        content: (
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
            style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
          >
            <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
          </div>
        ),
      }}
    />
  );
}
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/HueInductionView.tsx
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/HueInductionView.tsx
~~~~~
~~~~~typescript
export function HueInductionView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: HueInductionViewProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
~~~~~
~~~~~typescript
export function HueInductionView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: HueInductionViewProps) {
  const { t } = useTranslation();
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/HueInductionView.tsx
~~~~~
~~~~~typescript
  return (
    <StandardNafcView<[number, number, number]>
      questionId={question.id}
      hintText="观察左侧基准，在下方切换选项预览并确认提交 (键 1-4 切换，Space 提交)"
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      columns={4}
      options={nafcOptions}
      selectedIndex={selectedIdx}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="button"
      submitButtonText="确认提交 (Space)"
      onSelectIndex={(idx) => setSelectedIdx(idx)}
      onAnswer={(_idx, option) => {
        const chosen = option.value ?? activeColor;
        onAnswer(chosen);
      }}
      preview={
        <DualViewportContainer
          leftTitle="左侧固定基准"
          rightTitle="右侧环境补偿区 (实时预览)"
          leftContent={
~~~~~
~~~~~typescript
  return (
    <StandardNafcView<[number, number, number]>
      questionId={question.id}
      hintText={t('packs.relative_color.views.hueSelectHint')}
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
      columns={4}
      options={nafcOptions}
      selectedIndex={selectedIdx}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="button"
      submitButtonText={t('common.confirmSpace')}
      onSelectIndex={(idx) => setSelectedIdx(idx)}
      onAnswer={(_idx, option) => {
        const chosen = option.value ?? activeColor;
        onAnswer(chosen);
      }}
      preview={
        <DualViewportContainer
          leftTitle={t('packs.relative_color.views.leftBase')}
          rightTitle={t('packs.relative_color.views.rightPreview')}
          leftContent={
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/VectorShiftView.tsx
~~~~~
~~~~~typescript
import { ArrowRight, Shuffle } from 'lucide-preact';
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';
~~~~~
~~~~~typescript
import { ArrowRight, Shuffle } from 'lucide-preact';
import { StandardNafcView } from '../../../components/common/StandardNafcView';
import { hsvToHex } from '../../../core/color/colorUtils';
import { useTranslation } from '../../../core/i18n';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/index';
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/VectorShiftView.tsx
~~~~~
~~~~~typescript
export function VectorShiftView({
  question,
  showAnswer,
  selectedIndex,
  onSelectIndex,
  onSubmit,
  disabled = false,
  showCanvasHints = true,
}: VectorShiftViewProps) {
  const { colorA, colorB, colorC, targetD, options, correctIndex } = question;
~~~~~
~~~~~typescript
export function VectorShiftView({
  question,
  showAnswer,
  selectedIndex,
  onSelectIndex,
  onSubmit,
  disabled = false,
  showCanvasHints = true,
}: VectorShiftViewProps) {
  const { t } = useTranslation();
  const { colorA, colorB, colorC, targetD, options, correctIndex } = question;
~~~~~

~~~~~act
patch_file
src/packs/relative_color/components/VectorShiftView.tsx
~~~~~
~~~~~typescript
  return (
    <StandardNafcView<[number, number, number]>
      questionId={question.id}
      hintText="观察上方 A➔B 色彩推移，在候选区选出符合 C➔D 的同向推移色"
      hintIcon={Shuffle}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      columns={4}
      options={nafcOptions}
      selectedIndex={selectedIndex}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="button"
      submitButtonText="确认提交 (Space)"
      onSelectIndex={(idx) => onSelectIndex(idx)}
      onAnswer={() => onSubmit()}
      preview={
~~~~~
~~~~~typescript
  return (
    <StandardNafcView<[number, number, number]>
      questionId={question.id}
      hintText={t('packs.relative_color.views.vectorPrompt')}
      hintIcon={Shuffle}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      columns={4}
      options={nafcOptions}
      selectedIndex={selectedIndex}
      showAnswer={showAnswer}
      disabled={disabled}
      submitMode="button"
      submitButtonText={t('common.confirmSpace')}
      onSelectIndex={(idx) => onSelectIndex(idx)}
      onAnswer={() => onSubmit()}
      preview={
~~~~~

#### Acts 5: 改造正负形空间扩展包 (Negative Space Pack) 双语词典与视图

~~~~~act
write_file
src/packs/negative_space/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "正负形空间感知",
    "subTitle": "Negative Space",
    "desc": "切换观察视角，通过对几何剪影周围留白（负形）面积占比的估算与反切定点，打破具象认知偏见，培养专业起形与比例感知力。"
  },
  "cards": {
    "neg_ratio_estimation": {
      "title": "负形占比滑块评估",
      "desc": "估计不规则几何多边形外部留白（负形）占整幅画面的面积百分比，强化空间直觉。",
      "instruction": "估计黑色主体周围的白色留白（负形）占画面总面积的百分比",
      "badge": "负形占比估算"
    },
    "neg_area_comparison_2afc": {
      "title": "负形面积二分判别",
      "desc": "快速对比两个形状各异的不规则多边形留白（负形），二选一判别哪侧留白面积更大 (2AFC)。",
      "instruction": "二选一判别哪一侧画面的白色留白（负形）面积更大",
      "badge": "负形面积二分判别"
    },
    "neg_vertex_fitting": {
      "title": "负形边界反切定点",
      "desc": "观察被负形空隙挤压的转折形态，从局部点阵中精准定位被遮挡的关键顶点。",
      "instruction": "观察左侧完整参考的负形挤压轮廓，在右侧点阵中点击定位被截断的正形顶点",
      "badge": "负形边界反切定点"
    },
    "neg_shape_match_2afc": {
      "title": "负形轮廓记忆匹配",
      "desc": "瞬时记忆负形空隙轮廓，在两张 1:1 等大形状中二选一辨识目标。",
      "instruction": "瞬时记忆负形空隙轮廓特征，在候选区二选一选出完全相同的形状",
      "badge": "负形轮廓记忆匹配"
    }
  },
  "views": {
    "ratioHint": "估计白色留白 (负形) 占整幅画面的面积百分比",
    "ratioLabel": "负形空间占比估计:",
    "areaHint": "判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)",
    "whiteSpace": "留白 {{ratio}}%",
    "vertexHint": "对比左侧负形空间，在右侧点阵中点击定位被截断的顶点",
    "vertexRefTitle": "完整剪影参考",
    "vertexCanvasTitle": "交互定点画布 (点击定位)",
    "memoryStimulusHint": "瞬时记忆负形轮廓特征 ({{ms}}ms)",
    "memoryRecallHint": "匹配回忆：哪一侧与刚才展示完全相同？(键 1 / 2)"
  },
  "analytics": {
    "ratioScatter": {
      "tabLabel": "留白占比评估",
      "title": "负形留白占比评估分析",
      "subTitle": "洞察你对留白空间面积占比估算的直觉灵敏度",
      "cardTitle": "空间留白敏感度诊断",
      "avgError": "负形占比平均绝对误差:",
      "desc": "散点越紧贴对角线，代表对负形几何空隙的面积直觉越敏锐精准。"
    }
  }
}
~~~~~

~~~~~act
write_file
src/packs/negative_space/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Negative Space Perception",
    "subTitle": "Negative Space",
    "desc": "Overcome object-recognition bias by estimating white space ratios and fitting obscured vertices."
  },
  "cards": {
    "neg_ratio_estimation": {
      "title": "Negative Space Ratio",
      "desc": "Estimate the area percentage of negative space outside the irregular polygon.",
      "instruction": "Estimate the percentage of white negative space relative to the whole canvas.",
      "badge": "Ratio Estimation"
    },
    "neg_area_comparison_2afc": {
      "title": "Negative Area 2AFC",
      "desc": "Compare two silhouettes and identify which one has greater negative space area.",
      "instruction": "Identify which side contains more negative white space (Keys 1 / 2).",
      "badge": "Area 2AFC"
    },
    "neg_vertex_fitting": {
      "title": "Negative Vertex Fitting",
      "desc": "Observe the negative space contours and locate the truncated vertex on the grid.",
      "instruction": "Click to locate the truncated vertex based on negative space contours.",
      "badge": "Vertex Fitting"
    },
    "neg_shape_match_2afc": {
      "title": "Negative Shape Match",
      "desc": "Memorize negative space contours and match the identical silhouette (2AFC).",
      "instruction": "Memorize the shape and select the identical one (Keys 1 / 2).",
      "badge": "Shape Match"
    }
  },
  "views": {
    "ratioHint": "Estimate the area percentage of white negative space relative to the whole scene",
    "ratioLabel": "Negative Space Ratio Estimation:",
    "areaHint": "Identify which side contains larger negative white space area (Keys 1 / 2)",
    "whiteSpace": "White Space {{ratio}}%",
    "vertexHint": "Compare negative space and click to locate the truncated vertex on the right",
    "vertexRefTitle": "Full Reference Silhouette",
    "vertexCanvasTitle": "Interactive Point Grid (Click to Locate)",
    "memoryStimulusHint": "Memorize the negative space contour ({{ms}}ms)",
    "memoryRecallHint": "Recall Match: Which side matches the shape just shown? (Keys 1 / 2)"
  },
  "analytics": {
    "ratioScatter": {
      "tabLabel": "Ratio Estimation",
      "title": "Negative Space Ratio Analysis",
      "subTitle": "Insights into your perceptual sensitivity for negative space area",
      "cardTitle": "Space Sensitivity Diagnostics",
      "avgError": "Average Ratio Error:",
      "desc": "The closer points lie to the diagonal, the sharper your spatial area intuition."
    }
  }
}
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/AreaComparison2AfcView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../utils/index';
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { useTranslation } from '../../../core/i18n';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
  TWO_AFC_CANVAS_SIZE,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/AreaComparison2AfcView.tsx
~~~~~
~~~~~typescript
export function AreaComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AreaComparison2AfcViewProps) {
  const largerSide = question.largerSide;
  const isAHit = largerSide === 'A';
  const isBHit = largerSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText="判别哪一侧的白色留白 (负形) 面积更大 (键 1 / 2)"
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: '区域 A',
        isCorrect: isAHit,
        badge: `留白 ${question.negRatioA}%`,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesA,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: '#0F172A',
                  strokeColor: '#1E293B',
                })
              }
              deps={[question.verticesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: '区域 B',
        isCorrect: isBHit,
        badge: `留白 ${question.negRatioB}%`,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesB,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: '#0F172A',
                  strokeColor: '#1E293B',
                })
              }
              deps={[question.verticesB]}
            />
          </div>
        ),
      }}
    />
  );
}
~~~~~
~~~~~typescript
export function AreaComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AreaComparison2AfcViewProps) {
  const { t } = useTranslation();
  const largerSide = question.largerSide;
  const isAHit = largerSide === 'A';
  const isBHit = largerSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('packs.negative_space.views.areaHint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('common.areaA'),
        isCorrect: isAHit,
        badge: t('packs.negative_space.views.whiteSpace', { ratio: question.negRatioA ?? 50 }),
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesA,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: '#0F172A',
                  strokeColor: '#1E293B',
                })
              }
              deps={[question.verticesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: t('packs.negative_space.views.whiteSpace', { ratio: question.negRatioB ?? 50 }),
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={TWO_AFC_CANVAS_SIZE}
              height={TWO_AFC_CANVAS_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm"
              draw={(canvas) =>
                drawPolygonCanvas({
                  canvas,
                  vertices: question.verticesB,
                  size: TWO_AFC_CANVAS_SIZE,
                  fillColor: '#0F172A',
                  strokeColor: '#1E293B',
                })
              }
              deps={[question.verticesB]}
            />
          </div>
        ),
      }}
    />
  );
}
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/RatioEstimationView.tsx
~~~~~
~~~~~typescript
import { Maximize2 } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/index';
~~~~~
~~~~~typescript
import { Maximize2 } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { useTranslation } from '../../../core/i18n';
import {
  NEGATIVE_SPACE_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/RatioEstimationView.tsx
~~~~~
~~~~~typescript
export function RatioEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: RatioEstimationViewProps) {
  const { targetNegativeRatio, tolerance } = question;
  const isHit = Boolean(userAnswer?.isHit);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText="估计白色留白 (负形) 占整幅画面的面积百分比"
      hintIcon={Maximize2}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label="负形空间占比估计:"
      max={100}
      step={0.1}
      initialValue={50.0}
      unit="%"
      targetValue={targetNegativeRatio}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userAnswer?.userRatio}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="button"
      submitButtonText="确认提交 (Space)"
      onAnswer={onAnswer}
      preview={
~~~~~
~~~~~typescript
export function RatioEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: RatioEstimationViewProps) {
  const { t } = useTranslation();
  const { targetNegativeRatio, tolerance } = question;
  const isHit = Boolean(userAnswer?.isHit);

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('packs.negative_space.views.ratioHint')}
      hintIcon={Maximize2}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('packs.negative_space.views.ratioLabel')}
      max={100}
      step={0.1}
      initialValue={50.0}
      unit="%"
      targetValue={targetNegativeRatio}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userAnswer?.userRatio}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="button"
      submitButtonText={t('common.confirmSpace')}
      onAnswer={onAnswer}
      preview={
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/ShapeMemory2AfcView.tsx
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Choice2AfcContainer } from '../../../components/common/Choice2AfcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { NEGATIVE_SPACE_CANVAS_SIZE, type NegativeSpaceQuestionData } from '../utils/index';
~~~~~
~~~~~typescript
import { Sparkles } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Choice2AfcContainer } from '../../../components/common/Choice2AfcContainer';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { useTranslation } from '../../../core/i18n';
import { NEGATIVE_SPACE_CANVAS_SIZE, type NegativeSpaceQuestionData } from '../utils/index';
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/ShapeMemory2AfcView.tsx
~~~~~
~~~~~typescript
export function ShapeMemory2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ShapeMemory2AfcViewProps) {
  const [matchPhase, setMatchPhase] = useState<'stimulus' | 'recall'>('stimulus');
  const [selectedMatchChoice, setSelectedMatchChoice] = useState<'A' | 'B' | null>(null);
~~~~~
~~~~~typescript
export function ShapeMemory2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ShapeMemory2AfcViewProps) {
  const { t } = useTranslation();
  const [matchPhase, setMatchPhase] = useState<'stimulus' | 'recall'>('stimulus');
  const [selectedMatchChoice, setSelectedMatchChoice] = useState<'A' | 'B' | null>(null);
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/ShapeMemory2AfcView.tsx
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell
      hintText={
        matchPhase === 'stimulus' && !isRevealed
          ? `瞬时记忆负形轮廓特征 (${question.displayTimeMs}ms)`
          : '匹配回忆：哪一侧与刚才展示完全相同？(键 1 / 2)'
      }
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {matchPhase === 'stimulus' && !isRevealed ? (
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-inner flex flex-col items-center gap-3 w-full max-w-sm">
          <canvas
            ref={canvasRef}
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full aspect-square rounded-2xl border border-slate-200 shadow-sm"
          />
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              key={`${question.id}-${matchPhase}`}
              className="bg-indigo-600 h-full"
              style={{
                width: '100%',
                animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
              }}
            />
          </div>
        </div>
      ) : (
        <Choice2AfcContainer
          optionA={{
            key: 'A',
            title: '区域 A',
            isCorrect: isTargetA,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={matchOptionRefA}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            ),
          }}
          optionB={{
            key: 'B',
            title: '区域 B',
            isCorrect: isTargetB,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={matchOptionRefB}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            ),
          }}
          selectedChoice={selectedMatchChoice}
          showAnswer={showAnswer}
          disabled={disabled || matchPhase !== 'recall'}
          enableKeyboardShortcuts={true}
          onSelect={handleSelectMatchChoice}
        />
      )}
    </QuestionCardShell>
  );
}
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell
      hintText={
        matchPhase === 'stimulus' && !isRevealed
          ? t('packs.negative_space.views.memoryStimulusHint', { ms: question.displayTimeMs ?? 1500 })
          : t('packs.negative_space.views.memoryRecallHint')
      }
      hintIcon={Sparkles}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      {matchPhase === 'stimulus' && !isRevealed ? (
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-inner flex flex-col items-center gap-3 w-full max-w-sm">
          <canvas
            ref={canvasRef}
            width={NEGATIVE_SPACE_CANVAS_SIZE}
            height={NEGATIVE_SPACE_CANVAS_SIZE}
            className="w-full aspect-square rounded-2xl border border-slate-200 shadow-sm"
          />
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              key={`${question.id}-${matchPhase}`}
              className="bg-indigo-600 h-full"
              style={{
                width: '100%',
                animation: `shrinkWidth ${question.displayTimeMs}ms linear forwards`,
              }}
            />
          </div>
        </div>
      ) : (
        <Choice2AfcContainer
          optionA={{
            key: 'A',
            title: t('common.areaA'),
            isCorrect: isTargetA,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={matchOptionRefA}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            ),
          }}
          optionB={{
            key: 'B',
            title: t('common.areaB'),
            isCorrect: isTargetB,
            content: (
              <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
                <canvas
                  ref={matchOptionRefB}
                  width={NEGATIVE_SPACE_CANVAS_SIZE}
                  height={NEGATIVE_SPACE_CANVAS_SIZE}
                  className="w-full max-w-[260px] aspect-square rounded-xl shadow-sm"
                />
              </div>
            ),
          }}
          selectedChoice={selectedMatchChoice}
          showAnswer={showAnswer}
          disabled={disabled || matchPhase !== 'recall'}
          enableKeyboardShortcuts={true}
          onSelect={handleSelectMatchChoice}
        />
      )}
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/VertexFittingView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import type { Point } from '../../../types';
import {
  FITTING_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/index';
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';
import { DualViewportContainer } from '../../../components/common/DualViewportContainer';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { drawPolygonCanvas } from '../../../core/canvas/drawPolygon';
import { useTranslation } from '../../../core/i18n';
import type { Point } from '../../../types';
import {
  FITTING_CANVAS_SIZE,
  type NegativeSpaceHitResult,
  type NegativeSpaceQuestionData,
} from '../utils/index';
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/VertexFittingView.tsx
~~~~~
~~~~~typescript
export function VertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: VertexFittingViewProps) {
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);
~~~~~
~~~~~typescript
export function VertexFittingView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: VertexFittingViewProps) {
  const { t } = useTranslation();
  const leftFittingRef = useRef<HTMLCanvasElement | null>(null);
~~~~~

~~~~~act
patch_file
src/packs/negative_space/components/VertexFittingView.tsx
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell
      hintText="对比左侧负形空间，在右侧点阵中点击定位被截断的顶点"
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-4xl"
    >
      <DualViewportContainer
        leftTitle="完整剪影参考"
        rightTitle="交互定点画布 (点击定位)"
        leftContent={
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell
      hintText={t('packs.negative_space.views.vertexHint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-4xl"
    >
      <DualViewportContainer
        leftTitle={t('packs.negative_space.views.vertexRefTitle')}
        rightTitle={t('packs.negative_space.views.vertexCanvasTitle')}
        leftContent={
~~~~~

~~~~~act
patch_file
src/packs/negative_space/analytics.tsx
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { getTrialRecordsByCard } from '../../utils/db/index';

export const negRatioAnalyticsPlugin: CardAnalyticsPlugin = {
  cardId: 'neg_ratio_estimation',
  fetchRecords: async (id) => getTrialRecordsByCard(id),
  views: [
    {
      id: 'ratio_scatter',
      tabLabel: '留白占比评估',
      title: '负形留白占比评估分析',
      subTitle: '洞察你对留白空间面积占比估算的直觉灵敏度',
      icon: Crosshair,
      renderVisualizer: (canvas, records) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, h - 30);
        ctx.lineTo(w - 20, 20);
        ctx.stroke();

        for (const r of records) {
          const target = Number(r.targetNegativeRatio ?? 50);
          const user = Number(r.userRatio ?? 50);
          const px = 30 + (target / 100) * (w - 50);
          const py = h - 30 - (user / 100) * (h - 50);

          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = r.isHit ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
          ctx.fill();
        }
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const avgRatioErr =
          totalCount > 0
            ? Math.round(
                (records.reduce((acc, c) => acc + Number(c.errorValue || 0), 0) / totalCount) * 10,
              ) / 10
            : 0;

        return (
          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-2 text-xs">
            <div className="font-bold text-emerald-900 flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
              空间留白敏感度诊断
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-700">
              <div className="flex justify-between font-mono bg-white p-2 rounded-xl border border-emerald-100">
                <span className="text-slate-600">负形占比平均绝对误差:</span>
                <span className="font-bold text-emerald-700">±{avgRatioErr}%</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                散点越紧贴对角线，代表对负形几何空隙的面积直觉越敏锐精准。
              </p>
            </div>
          </div>
        );
      },
      getOverallStats: (records) => {
        const total = records.length;
        const hits = records.filter((r) => r.isHit).length;
        const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
        return { accuracy, total };
      },
    },
  ],
};
~~~~~
~~~~~typescript
import { Crosshair } from 'lucide-preact';
import type { CardAnalyticsPlugin } from '../../core/contracts';
import { i18n } from '../../core/i18n';
import { getTrialRecordsByCard } from '../../utils/db/index';

export const negRatioAnalyticsPlugin: CardAnalyticsPlugin = {
  cardId: 'neg_ratio_estimation',
  fetchRecords: async (id) => getTrialRecordsByCard(id),
  views: [
    {
      id: 'ratio_scatter',
      tabLabel: 'packs.negative_space.analytics.ratioScatter.tabLabel',
      title: 'packs.negative_space.analytics.ratioScatter.title',
      subTitle: 'packs.negative_space.analytics.ratioScatter.subTitle',
      icon: Crosshair,
      renderVisualizer: (canvas, records) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, h - 30);
        ctx.lineTo(w - 20, 20);
        ctx.stroke();

        for (const r of records) {
          const target = Number(r.targetNegativeRatio ?? 50);
          const user = Number(r.userRatio ?? 50);
          const px = 30 + (target / 100) * (w - 50);
          const py = h - 30 - (user / 100) * (h - 50);

          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = r.isHit ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
          ctx.fill();
        }
      },
      renderDiagnostics: (records) => {
        const totalCount = records.length;
        if (totalCount === 0) return null;

        const avgRatioErr =
          totalCount > 0
            ? Math.round(
                (records.reduce((acc, c) => acc + Number(c.errorValue || 0), 0) / totalCount) * 10,
              ) / 10
            : 0;

        return (
          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-2 text-xs">
            <div className="font-bold text-emerald-900 flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
              {i18n.t('packs.negative_space.analytics.ratioScatter.cardTitle')}
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-700">
              <div className="flex justify-between font-mono bg-white p-2 rounded-xl border border-emerald-100">
                <span className="text-slate-600">
                  {i18n.t('packs.negative_space.analytics.ratioScatter.avgError')}
                </span>
                <span className="font-bold text-emerald-700">±{avgRatioErr}%</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                {i18n.t('packs.negative_space.analytics.ratioScatter.desc')}
              </p>
            </div>
          </div>
        );
      },
      getOverallStats: (records) => {
        const total = records.length;
        const hits = records.filter((r) => r.isHit).length;
        const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
        return { accuracy, total };
      },
    },
  ],
};
~~~~~

#### Acts 6: 改造角度与透视扩展包 (Angle & Perspective Packs) 双语词典与视图

~~~~~act
write_file
src/packs/angle/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "角度感知",
    "subTitle": "Angle Perception",
    "desc": "以极简白底黑线剥离干扰，通过夹角大小估算、微小角度二分对比与平行线对偶辨识，构建坚实的正负形起形与角度感知直觉。"
  },
  "cards": {
    "angle_estimation": {
      "title": "夹角大小估算",
      "desc": "观察由纯黑线段构成的夹角，使用连续滑块精准评估夹角弧度大小 (0°~180°)。",
      "instruction": "观察极简两条射线夹角，调制滑块逼近精准度数 (0°~180°)",
      "badge": "夹角大小估算"
    },
    "angle_comparison_2afc": {
      "title": "角度二分对比",
      "desc": "在消除空间正交基准干扰下，二选一快速判别哪一侧的两射线夹角更大 (2AFC)。",
      "instruction": "二选一快速判别哪一侧夹角更大 (键 1 / 2)",
      "badge": "角度二分对比"
    },
    "angle_parallel_2afc": {
      "title": "平行线基准辨识",
      "desc": "观察上方给定的斜率基准线，在下方两个候选项中二选一找出与其绝对平行的线段 (2AFC)。",
      "instruction": "观察上方基准线，在下方选出与其保持绝对平行的线 (键 1 / 2)",
      "badge": "平行线基准辨识"
    }
  },
  "views": {
    "estimationHint": "观察两射线夹角，调制滑块逼近精准度数 (0°~180°)",
    "estimationLabel": "夹角估算值:",
    "comparisonHint": "二选一辨识哪一侧的两射线夹角更大 (键 1 / 2)",
    "parallelHint": "观察上方基准线，选出下方与它严格平行的线 (键 1 / 2)",
    "parallelPromptTitle": "平行基准线 (Prompt)",
    "absoluteParallel": "绝对平行",
    "deviationBadge": "偏转 {{deg}}°",
    "trueAngle": "绝对真理值:",
    "errorInfo": "误差: {{error}}° (容错: ±{{tolerance}}°)"
  }
}
~~~~~

~~~~~act
write_file
src/packs/angle/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Angle Perception",
    "subTitle": "Angle Perception",
    "desc": "Eliminate distractions with minimalist line drawings. Develop sharp intuitions for angles and parallel lines via estimation, 2AFC comparison, and parallel detection."
  },
  "cards": {
    "angle_estimation": {
      "title": "Angle Estimation",
      "desc": "Observe the angle formed by two rays and estimate its degree using a slider (0°~180°).",
      "instruction": "Observe the two rays and adjust the slider to match the true angle (0°~180°).",
      "badge": "Angle Estimation"
    },
    "angle_comparison_2afc": {
      "title": "Angle 2AFC Comparison",
      "desc": "Quickly identify which side has a larger angle under non-orthogonal orientations (2AFC).",
      "instruction": "Identify which angle is larger (Keys 1 / 2).",
      "badge": "Angle Comparison"
    },
    "angle_parallel_2afc": {
      "title": "Parallel Alignment",
      "desc": "Observe the prompt orientation and identify the strictly parallel line below (2AFC).",
      "instruction": "Find the line that is strictly parallel to the prompt line (Keys 1 / 2).",
      "badge": "Parallel Alignment"
    }
  },
  "views": {
    "estimationHint": "Observe the angle formed by rays and modulate the slider to match (0°~180°)",
    "estimationLabel": "Angle Estimation Value:",
    "comparisonHint": "Identify which side contains a larger angle (Keys 1 / 2)",
    "parallelHint": "Observe the prompt line and select the parallel one below (Keys 1 / 2)",
    "parallelPromptTitle": "Parallel Alignment Reference (Prompt)",
    "absoluteParallel": "Strictly Parallel",
    "deviationBadge": "Deviation {{deg}}°",
    "trueAngle": "Ground Truth Value:",
    "errorInfo": "Error: {{error}}° (Tolerance: ±{{tolerance}}°)"
  }
}
~~~~~

~~~~~act
patch_file
src/packs/angle/components/AngleEstimationView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import {
  ANGLE_CANVAS_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../utils/angleUtils';
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { useTranslation } from '../../../core/i18n';
import {
  ANGLE_CANVAS_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../utils/angleUtils';
~~~~~

~~~~~act
patch_file
src/packs/angle/components/AngleEstimationView.tsx
~~~~~
~~~~~typescript
export function AngleEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AngleEstimationViewProps) {
  const targetVal = question.targetAngleDeg ?? 90;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText="观察两射线夹角，调制滑块逼近精准度数 (0°~180°)"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label="夹角估算值:"
      max={180}
      step={0.5}
      initialValue={90}
      unit="°"
      targetValue={targetVal}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userVal}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onAnswer={onAnswer}
      preview={
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={ANGLE_CANVAS_SIZE}
            height={ANGLE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white"
            draw={(canvas) => {
              if (question.lineA && question.lineB) {
                drawAngleCanvas(canvas, [question.lineA, question.lineB], ANGLE_CANVAS_SIZE);
              }
            }}
            deps={[question.lineA, question.lineB]}
          />
        </div>
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              绝对真理值: <span className="font-bold text-slate-800 font-mono">{targetVal}°</span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              误差: {Math.round(Math.abs(userVal - targetVal) * 10) / 10}° (容错: ±{tolerance}°)
            </span>
          </div>
        ) : null
      }
    />
  );
}
~~~~~
~~~~~typescript
export function AngleEstimationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: AngleEstimationViewProps) {
  const { t } = useTranslation();
  const targetVal = question.targetAngleDeg ?? 90;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('packs.angle.views.estimationHint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('packs.angle.views.estimationLabel')}
      max={180}
      step={0.5}
      initialValue={90}
      unit="°"
      targetValue={targetVal}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userVal}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onAnswer={onAnswer}
      preview={
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={ANGLE_CANVAS_SIZE}
            height={ANGLE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white"
            draw={(canvas) => {
              if (question.lineA && question.lineB) {
                drawAngleCanvas(canvas, [question.lineA, question.lineB], ANGLE_CANVAS_SIZE);
              }
            }}
            deps={[question.lineA, question.lineB]}
          />
        </div>
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              {t('packs.angle.views.trueAngle')}{' '}
              <span className="font-bold text-slate-800 font-mono">{targetVal}°</span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {t('packs.angle.views.errorInfo', {
                error: Math.round(Math.abs(userVal - targetVal) * 10) / 10,
                tolerance,
              })}
            </span>
          </div>
        ) : null
      }
    />
  );
}
~~~~~

~~~~~act
patch_file
src/packs/angle/components/AngleComparison2AfcView.tsx
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import {
  ANGLE_2AFC_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../utils/angleUtils';

interface AngleComparison2AfcViewProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleComparison2AfcViewProps) {
  const isAHit = question.largerSide === 'A';
  const isBHit = question.largerSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText="二选一辨识哪一侧的两射线夹角更大 (键 1 / 2)"
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: '区域 A',
        isCorrect: isAHit,
        badge: showAnswer ? `${question.angleA}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesA, ANGLE_2AFC_SIZE)}
              deps={[question.linesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: '区域 B',
        isCorrect: isBHit,
        badge: showAnswer ? `${question.angleB}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesB, ANGLE_2AFC_SIZE)}
              deps={[question.linesB]}
            />
          </div>
        ),
      }}
    />
  );
}
~~~~~
~~~~~typescript
import { Columns } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { useTranslation } from '../../../core/i18n';
import {
  ANGLE_2AFC_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawAngleCanvas,
} from '../utils/angleUtils';

interface AngleComparison2AfcViewProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleComparison2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleComparison2AfcViewProps) {
  const { t } = useTranslation();
  const isAHit = question.largerSide === 'A';
  const isBHit = question.largerSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('packs.angle.views.comparisonHint')}
      hintIcon={Columns}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('common.areaA'),
        isCorrect: isAHit,
        badge: showAnswer ? `${question.angleA}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesA, ANGLE_2AFC_SIZE)}
              deps={[question.linesA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.areaB'),
        isCorrect: isBHit,
        badge: showAnswer ? `${question.angleB}°` : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) => drawAngleCanvas(canvas, question.linesB, ANGLE_2AFC_SIZE)}
              deps={[question.linesB]}
            />
          </div>
        ),
      }}
    />
  );
}
~~~~~

~~~~~act
patch_file
src/packs/angle/components/AngleParallel2AfcView.tsx
~~~~~
~~~~~typescript
import { Split } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import {
  ANGLE_2AFC_SIZE,
  ANGLE_PROMPT_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawSingleLineCanvas,
} from '../utils/angleUtils';

interface AngleParallel2AfcViewProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleParallel2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleParallel2AfcViewProps) {
  const isAHit = question.parallelSide === 'A';
  const isBHit = question.parallelSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText="观察上方基准线，选出下方与它严格平行的线 (键 1 / 2)"
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            平行基准线 (Prompt)
          </span>
          <CanvasView
            width={ANGLE_PROMPT_SIZE}
            height={ANGLE_PROMPT_SIZE}
            className="w-28 h-28 rounded-xl border border-slate-200 shadow-sm bg-white"
            draw={(canvas) =>
              drawSingleLineCanvas(canvas, question.promptLine, ANGLE_PROMPT_SIZE, '#4F46E5', 3.0)
            }
            deps={[question.promptLine]}
          />
        </div>
      }
      optionA={{
        title: '选项 A',
        isCorrect: isAHit,
        badge: showAnswer
          ? isAHit
            ? '绝对平行'
            : `偏转 ${question.angularDeviation}°`
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawSingleLineCanvas(canvas, question.lineOptionA, ANGLE_2AFC_SIZE, '#0F172A', 2.5)
              }
              deps={[question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: '选项 B',
        isCorrect: isBHit,
        badge: showAnswer
          ? isBHit
            ? '绝对平行'
            : `偏转 ${question.angularDeviation}°`
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawSingleLineCanvas(canvas, question.lineOptionB, ANGLE_2AFC_SIZE, '#0F172A', 2.5)
              }
              deps={[question.lineOptionB]}
            />
          </div>
        ),
      }}
    />
  );
}
~~~~~
~~~~~typescript
import { Split } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { useTranslation } from '../../../core/i18n';
import {
  ANGLE_2AFC_SIZE,
  ANGLE_PROMPT_SIZE,
  type AngleHitResult,
  type AngleQuestionData,
  drawSingleLineCanvas,
} from '../utils/angleUtils';

interface AngleParallel2AfcViewProps {
  question: AngleQuestionData;
  showAnswer: boolean;
  userAnswer: AngleHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function AngleParallel2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: AngleParallel2AfcViewProps) {
  const { t } = useTranslation();
  const isAHit = question.parallelSide === 'A';
  const isBHit = question.parallelSide === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('packs.angle.views.parallelHint')}
      hintIcon={Split}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      prompt={
        <div className="flex flex-col items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('packs.angle.views.parallelPromptTitle')}
          </span>
          <CanvasView
            width={ANGLE_PROMPT_SIZE}
            height={ANGLE_PROMPT_SIZE}
            className="w-28 h-28 rounded-xl border border-slate-200 shadow-sm bg-white"
            draw={(canvas) =>
              drawSingleLineCanvas(canvas, question.promptLine, ANGLE_PROMPT_SIZE, '#4F46E5', 3.0)
            }
            deps={[question.promptLine]}
          />
        </div>
      }
      optionA={{
        title: t('common.optionA'),
        isCorrect: isAHit,
        badge: showAnswer
          ? isAHit
            ? t('packs.angle.views.absoluteParallel')
            : t('packs.angle.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawSingleLineCanvas(canvas, question.lineOptionA, ANGLE_2AFC_SIZE, '#0F172A', 2.5)
              }
              deps={[question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.optionB'),
        isCorrect: isBHit,
        badge: showAnswer
          ? isBHit
            ? t('packs.angle.views.absoluteParallel')
            : t('packs.angle.views.deviationBadge', { deg: question.angularDeviation ?? 0 })
          : undefined,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={ANGLE_2AFC_SIZE}
              height={ANGLE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawSingleLineCanvas(canvas, question.lineOptionB, ANGLE_2AFC_SIZE, '#0F172A', 2.5)
              }
              deps={[question.lineOptionB]}
            />
          </div>
        ),
      }}
    />
  );
}
~~~~~

~~~~~act
write_file
src/packs/perspective/locales/zh-CN.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "透视空间感知",
    "subTitle": "Perspective & Spatial Perception",
    "desc": "涵盖灭点统一感、比例黄金分割盲切、格式塔穿透遮挡完形延续与 3D 轴测结构空间翻转，全方位锤炼硬核空间素描起形直觉。"
  },
  "cards": {
    "perspective_vp_convergence": {
      "title": "透视灭点汇聚感",
      "desc": "观察已有倾角透视线，通过滑块调制第三条线段倾斜度，使其精准延长交汇于同一灭点 (VP)。",
      "instruction": "观察已有透视线，调制滑块旋转第三条线使其交汇于同一灭点",
      "badge": "灭点汇聚"
    },
    "perspective_proportion_division": {
      "title": "平面比例与黄金分割盲切",
      "desc": "观察倾斜线段，单次点击盲切估测 1/2、1/3、1/4 或黄金分割点 (0.618)。",
      "instruction": "观察线段并在指定比例位置单次点击",
      "badge": "比例盲切"
    },
    "perspective_proportion_migration": {
      "title": "空间比例角度迁移",
      "desc": "观察上方水平基准线上的任意比例目标点，在下方随机倾斜角度的线段上准确标出相同比例位置。",
      "instruction": "观察上方基准线目标点，在下方倾斜线段上点选相同比例位置",
      "badge": "比例迁移"
    },
    "perspective_gestalt_continuation_2afc": {
      "title": "断线完形连续性辨识",
      "desc": "基于格式塔完形心理学，二选一快速辨识穿透中间障碍物的真实延续线段 (2AFC)。",
      "instruction": "二选一选出保持绝对连续贯穿的延伸线 (键 1 / 2)",
      "badge": "完形断线"
    },
    "perspective_structure_3d": {
      "title": "3D 结构空间翻转",
      "desc": "观察正交三视图标点，在 3D 透视立方体点阵中定位对应的三维空间坐标点。",
      "instruction": "结合三视图坐标，在 3D 立方体点阵中点选对应点",
      "badge": "3D 结构翻转"
    }
  },
  "views": {
    "vpHint": "观察已有透视基准线，调制滑块旋转第三条射线使其交汇于同一灭点 (0°~360°)",
    "rayAngle": "射线倾角:",
    "vpTrueAngle": "精准交汇角:",
    "vpErrorInfo": "误差: {{error}}° (容错: ±{{tolerance}}°)",
    "proportionDivisionHint": "在倾斜线段上滑动试探，松手确认比例位置（也可直接点击）",
    "proportionMigrationHint": "观察上方基准线目标点，在下方倾斜线段滑动试探并松手确认",
    "targetRatio": "目标比例:",
    "userPosition": "作答位置: {{pos}}% (误差: ±{{error}}%)",
    "gestaltHint": "观察穿入线段，二选一辨识哪一侧保持了绝对真实的贯穿延伸 (键 1 / 2)",
    "structureHint": "观察左侧正交三视图标点，在右侧 3D 立方体透视点阵中选出对应空间坐标点"
  }
}
~~~~~

~~~~~act
write_file
src/packs/perspective/locales/en-US.json
~~~~~
~~~~~json
{
  "meta": {
    "title": "Perspective & Spatial Perception",
    "subTitle": "Perspective & Spatial Perception",
    "desc": "Sharpen structural drawing intuition through Vanishing Point convergence, proportional division, Gestalt continuation, and 3D axonometric translation."
  },
  "cards": {
    "perspective_vp_convergence": {
      "title": "VP Convergence",
      "desc": "Modulate the ray angle to make it converge at the exact same vanishing point.",
      "instruction": "Adjust the ray angle using the slider so all lines meet at the vanishing point.",
      "badge": "VP Convergence"
    },
    "perspective_proportion_division": {
      "title": "Proportion Division",
      "desc": "Blindly cut lines at 1/2, 1/3, 1/4, or golden ratio (0.618).",
      "instruction": "Click at the designated target proportion along the tilted line.",
      "badge": "Proportion Division"
    },
    "perspective_proportion_migration": {
      "title": "Proportion Migration",
      "desc": "Migrate proportional divisions from horizontal references onto randomly tilted lines.",
      "instruction": "Observe the target point above and mark the identical proportion below.",
      "badge": "Proportion Migration"
    },
    "perspective_gestalt_continuation_2afc": {
      "title": "Gestalt Continuation 2AFC",
      "desc": "Identify the true collinear continuation penetrating an obstacle (2AFC).",
      "instruction": "Select the line that maintains true collinear continuation (Keys 1 / 2).",
      "badge": "Gestalt Continuation"
    },
    "perspective_structure_3d": {
      "title": "3D Structural Rotation",
      "desc": "Translate orthographic tri-views into 3D isometric cube grid coordinates.",
      "instruction": "Locate the 3D point in the axonometric cube grid based on the 3 views.",
      "badge": "3D Structural Rotation"
    }
  },
  "views": {
    "vpHint": "Observe the existing perspective lines and adjust the slider to converge rays at the vanishing point (0°~360°)",
    "rayAngle": "Ray Angle:",
    "vpTrueAngle": "True Convergence Angle:",
    "vpErrorInfo": "Error: {{error}}° (Tolerance: ±{{tolerance}}°)",
    "proportionDivisionHint": "Slide along the tilted segment and release to confirm proportional division (or click directly)",
    "proportionMigrationHint": "Observe the horizontal reference above and confirm the corresponding proportion on the tilted segment below",
    "targetRatio": "Target Proportion:",
    "userPosition": "User Position: {{pos}}% (Error: ±{{error}}%)",
    "gestaltHint": "Observe incoming line and identify the true collinear continuation penetrating the obstacle (Keys 1 / 2)",
    "structureHint": "Observe the tri-view coordinates and select the corresponding 3D vertex inside the isometric grid"
  }
}
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/PerspectiveVpView.tsx
~~~~~
~~~~~typescript
import { Sliders } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawVpConvergenceCanvas,
} from '../utils/perspectiveUtils';

interface PerspectiveVpViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

import { useEffect, useState } from 'preact/hooks';

export function PerspectiveVpView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: PerspectiveVpViewProps) {
  const targetVal = question.targetAngleDeg ?? 0;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue as number | undefined;

  const [liveAngle, setLiveAngle] = useState<number>(180);

  // 当题目切换时重置当前调制角度为 180°
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset liveAngle on new question
  useEffect(() => {
    setLiveAngle(180);
  }, [question.id]);

  const currentActiveAngle = showAnswer && userVal !== undefined ? userVal : liveAngle;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText="观察已有透视基准线，调制滑块旋转第三条射线使其交汇于同一灭点 (0°~360°)"
      hintIcon={Sliders}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label="射线倾角:"
      max={360}
      step={0.5}
      initialValue={180}
      unit="°"
      targetValue={targetVal}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userVal}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onValueChange={(_cur, active) => setLiveAngle(active)}
      onAnswer={onAnswer}
      preview={
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={PERSPECTIVE_CANVAS_SIZE}
            height={PERSPECTIVE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white"
            draw={(canvas) => {
              drawVpConvergenceCanvas(
                canvas,
                question.referenceLines,
                question.testLineAnchor,
                currentActiveAngle,
                question.testLineLength ?? 95,
                PERSPECTIVE_CANVAS_SIZE,
                showAnswer,
                targetVal,
              );
            }}
            deps={[
              question.referenceLines,
              question.testLineAnchor,
              question.testLineLength,
              currentActiveAngle,
              showAnswer,
              targetVal,
            ]}
          />
        </div>
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              精准交汇角: <span className="font-bold text-slate-800 font-mono">{targetVal}°</span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              误差: {userAnswer?.errorValue}° (容错: ±{tolerance}°)
            </span>
          </div>
        ) : null
      }
    />
  );
}
~~~~~
~~~~~typescript
import { Sliders } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { StandardSliderView } from '../../../components/common/StandardSliderView';
import { useTranslation } from '../../../core/i18n';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawVpConvergenceCanvas,
} from '../utils/perspectiveUtils';

interface PerspectiveVpViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (val: number) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  showCanvasHints?: boolean;
}

export function PerspectiveVpView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: PerspectiveVpViewProps) {
  const { t } = useTranslation();
  const targetVal = question.targetAngleDeg ?? 0;
  const tolerance = question.tolerance;
  const isHit = Boolean(userAnswer?.isHit);
  const userVal = userAnswer?.userValue as number | undefined;

  const [liveAngle, setLiveAngle] = useState<number>(180);

  // 当题目切换时重置当前调制角度为 180°
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset liveAngle on new question
  useEffect(() => {
    setLiveAngle(180);
  }, [question.id]);

  const currentActiveAngle = showAnswer && userVal !== undefined ? userVal : liveAngle;

  return (
    <StandardSliderView
      questionId={question.id}
      hintText={t('packs.perspective.views.vpHint')}
      hintIcon={Sliders}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      label={t('packs.perspective.views.rayAngle')}
      max={360}
      step={0.5}
      initialValue={180}
      unit="°"
      targetValue={targetVal}
      tolerance={tolerance}
      showToleranceBand={showToleranceBand}
      showAnswer={showAnswer}
      isHit={isHit}
      userValue={userVal}
      disabled={disabled}
      hitMargin={hitMargin}
      submitMode="commit_on_release"
      onValueChange={(_cur, active) => setLiveAngle(active)}
      onAnswer={onAnswer}
      preview={
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex justify-center items-center">
          <CanvasView
            width={PERSPECTIVE_CANVAS_SIZE}
            height={PERSPECTIVE_CANVAS_SIZE}
            className="w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white"
            draw={(canvas) => {
              drawVpConvergenceCanvas(
                canvas,
                question.referenceLines,
                question.testLineAnchor,
                currentActiveAngle,
                question.testLineLength ?? 95,
                PERSPECTIVE_CANVAS_SIZE,
                showAnswer,
                targetVal,
              );
            }}
            deps={[
              question.referenceLines,
              question.testLineAnchor,
              question.testLineLength,
              currentActiveAngle,
              showAnswer,
              targetVal,
            ]}
          />
        </div>
      }
      footerDetails={
        showAnswer && userVal !== undefined ? (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              {t('packs.perspective.views.vpTrueAngle')}{' '}
              <span className="font-bold text-slate-800 font-mono">{targetVal}°</span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {t('packs.perspective.views.vpErrorInfo', {
                error: userAnswer?.errorValue ?? 0,
                tolerance,
              })}
            </span>
          </div>
        ) : null
      }
    />
  );
}
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionDivisionView.tsx
~~~~~
~~~~~typescript
import { Disc } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import type { Point } from '../../../types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawProportionCanvas,
} from '../utils/perspectiveUtils';
~~~~~
~~~~~typescript
import { Disc } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { useTranslation } from '../../../core/i18n';
import type { Point } from '../../../types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawProportionCanvas,
} from '../utils/perspectiveUtils';
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionDivisionView.tsx
~~~~~
~~~~~typescript
export function ProportionDivisionView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ProportionDivisionViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
~~~~~
~~~~~typescript
export function ProportionDivisionView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ProportionDivisionViewProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionDivisionView.tsx
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell
      hintText="在倾斜线段上滑动试探，松手确认比例位置（也可直接点击）"
      hintIcon={Disc}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              目标比例:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              作答位置: {((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1)}% (误差: ±
              {((userAnswer?.errorValue ?? 0) * 100).toFixed(1)}%)
            </span>
          </div>
        ) : null
      }
    >
      {/* 极简纯数字目标面板 */}
      <div className="w-full bg-indigo-50/80 border border-indigo-100/90 rounded-2xl py-2 px-4 flex items-center justify-center shadow-xs">
        <span className="text-2xl font-black text-indigo-900 font-mono tracking-widest">
          {question.targetRatioName ?? '1/2'}
        </span>
      </div>

      <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label="比例盲切答题画布"
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-indigo-600 inline-block" />
            <span>起点 (0%)</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span>终点 (100%)</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell
      hintText={t('packs.perspective.views.proportionDivisionHint')}
      hintIcon={Disc}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              {t('packs.perspective.views.targetRatio')}{' '}
              <span className="font-bold text-slate-800 font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {t('packs.perspective.views.userPosition', {
                pos: ((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1),
                error: ((userAnswer?.errorValue ?? 0) * 100).toFixed(1),
              })}
            </span>
          </div>
        ) : null
      }
    >
      {/* 极简纯数字目标面板 */}
      <div className="w-full bg-indigo-50/80 border border-indigo-100/90 rounded-2xl py-2 px-4 flex items-center justify-center shadow-xs">
        <span className="text-2xl font-black text-indigo-900 font-mono tracking-widest">
          {question.targetRatioName ?? '1/2'}
        </span>
      </div>

      <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label="比例盲切答题画布"
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-indigo-600 inline-block" />
            <span>{t('common.startPercent')}</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span>{t('common.endPercent')}</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionMigrationView.tsx
~~~~~
~~~~~typescript
import { ArrowRightLeft } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import type { Point } from '../../../types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawHorizontalReferenceCanvas,
  drawProportionCanvas,
} from '../utils/perspectiveUtils';
~~~~~
~~~~~typescript
import { ArrowRightLeft } from 'lucide-preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { CanvasView } from '../../../components/common/CanvasView';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { useTranslation } from '../../../core/i18n';
import type { Point } from '../../../types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawHorizontalReferenceCanvas,
  drawProportionCanvas,
} from '../utils/perspectiveUtils';
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionMigrationView.tsx
~~~~~
~~~~~typescript
export function ProportionMigrationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ProportionMigrationViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
~~~~~
~~~~~typescript
export function ProportionMigrationView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: ProportionMigrationViewProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userClickedPoint, setUserClickedPoint] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/ProportionMigrationView.tsx
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell
      hintText="观察上方基准线目标点，在下方倾斜线段滑动试探并松手确认"
      hintIcon={ArrowRightLeft}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              目标比例:{' '}
              <span className="font-bold text-slate-800 font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              作答位置: {((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1)}% (误差: ±
              {((userAnswer?.errorValue ?? 0) * 100).toFixed(1)}%)
            </span>
          </div>
        ) : null
      }
    >
      {/* 顶部水平参考基准线面板 */}
      <div className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 flex justify-center shadow-inner">
        <CanvasView
          width={280}
          height={48}
          className="w-full max-w-[280px] h-[48px] bg-white rounded-xl border border-slate-200 shadow-sm"
          draw={(canvas) => {
            drawHorizontalReferenceCanvas(canvas, question.targetRatio ?? 0.5, 280, 48);
          }}
          deps={[question.targetRatio]}
        />
      </div>

      {/* 下方倾斜角度作答画布 */}
      <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label="比例迁移答题画布"
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-indigo-600 inline-block" />
            <span>起点 (0%)</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span>终点 (100%)</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~
~~~~~typescript
  return (
    <QuestionCardShell
      hintText={t('packs.perspective.views.proportionMigrationHint')}
      hintIcon={ArrowRightLeft}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-lg"
      footer={
        showAnswer ? (
          <div className="w-full pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">
              {t('packs.perspective.views.targetRatio')}{' '}
              <span className="font-bold text-slate-800 font-mono">
                {((question.targetRatio ?? 0) * 100).toFixed(1)}%
              </span>
            </span>
            <span className={isHit ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
              {t('packs.perspective.views.userPosition', {
                pos: ((userAnswer?.ratioProgress ?? 0) * 100).toFixed(1),
                error: ((userAnswer?.errorValue ?? 0) * 100).toFixed(1),
              })}
            </span>
          </div>
        ) : null
      }
    >
      {/* 顶部水平参考基准线面板 */}
      <div className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 flex justify-center shadow-inner">
        <CanvasView
          width={280}
          height={48}
          className="w-full max-w-[280px] h-[48px] bg-white rounded-xl border border-slate-200 shadow-sm"
          draw={(canvas) => {
            drawHorizontalReferenceCanvas(canvas, question.targetRatio ?? 0.5, 280, 48);
          }}
          deps={[question.targetRatio]}
        />
      </div>

      {/* 下方倾斜角度作答画布 */}
      <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center gap-2">
        <canvas
          ref={canvasRef}
          width={PERSPECTIVE_CANVAS_SIZE}
          height={PERSPECTIVE_CANVAS_SIZE}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
          }}
          tabIndex={0}
          role="button"
          aria-label="比例迁移答题画布"
          className={`w-full max-w-[320px] aspect-square rounded-xl border border-slate-300 shadow-sm bg-white touch-none select-none transition-all ${
            disabled || showAnswer
              ? 'cursor-default'
              : 'cursor-crosshair md:cursor-none hover:border-indigo-400 hover:shadow-md'
          }`}
        />
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-indigo-600 inline-block" />
            <span>{t('common.startPercent')}</span>
          </span>
          <span>→</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            <span>{t('common.endPercent')}</span>
          </span>
        </div>
      </div>
    </QuestionCardShell>
  );
}
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/GestaltContinuation2AfcView.tsx
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import {
  PERSPECTIVE_2AFC_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawGestaltCanvas,
} from '../utils/perspectiveUtils';

interface GestaltContinuation2AfcViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function GestaltContinuation2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: GestaltContinuation2AfcViewProps) {
  const isAHit = question.correctChoice === 'A';
  const isBHit = question.correctChoice === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText="观察穿入线段，二选一辨识哪一侧保持了绝对真实的贯穿延伸 (键 1 / 2)"
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: '选项 A',
        isCorrect: isAHit,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionA,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: '选项 B',
        isCorrect: isBHit,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionB,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionB]}
            />
          </div>
        ),
      }}
    />
  );
}
~~~~~
~~~~~typescript
import { Eye } from 'lucide-preact';
import { CanvasView } from '../../../components/common/CanvasView';
import { Standard2AfcView } from '../../../components/common/Standard2AfcView';
import { useTranslation } from '../../../core/i18n';
import {
  PERSPECTIVE_2AFC_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  drawGestaltCanvas,
} from '../utils/perspectiveUtils';

interface GestaltContinuation2AfcViewProps {
  question: PerspectiveQuestionData;
  showAnswer: boolean;
  userAnswer: PerspectiveHitResult | null;
  onAnswer: (choice: 'A' | 'B') => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function GestaltContinuation2AfcView({
  question,
  showAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: GestaltContinuation2AfcViewProps) {
  const { t } = useTranslation();
  const isAHit = question.correctChoice === 'A';
  const isBHit = question.correctChoice === 'B';

  return (
    <Standard2AfcView
      questionId={question.id}
      hintText={t('packs.perspective.views.gestaltHint')}
      hintIcon={Eye}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-2xl"
      showAnswer={showAnswer}
      disabled={disabled}
      onAnswer={onAnswer}
      optionA={{
        title: t('common.optionA'),
        isCorrect: isAHit,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionA,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionA]}
            />
          </div>
        ),
      }}
      optionB={{
        title: t('common.optionB'),
        isCorrect: isBHit,
        content: (
          <div className="w-full flex justify-center bg-white p-2 rounded-2xl border border-slate-200 shadow-inner">
            <CanvasView
              width={PERSPECTIVE_2AFC_SIZE}
              height={PERSPECTIVE_2AFC_SIZE}
              className="w-full max-w-[210px] aspect-square rounded-xl shadow-sm bg-white"
              draw={(canvas) =>
                drawGestaltCanvas(
                  canvas,
                  question.obstacle,
                  question.incomingLine,
                  question.lineOptionB,
                  PERSPECTIVE_2AFC_SIZE,
                )
              }
              deps={[question.incomingLine, question.lineOptionB]}
            />
          </div>
        ),
      }}
    />
  );
}
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/StructureProjection3DView.tsx
~~~~~
~~~~~typescript
import { Box } from 'lucide-preact';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import type { Point } from '../../../types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  draw3DCubeWireframe,
} from '../utils/perspectiveUtils';
~~~~~
~~~~~typescript
import { Box } from 'lucide-preact';
import { PointClickCanvas } from '../../../components/common/PointClickCanvas';
import { QuestionCardShell } from '../../../components/common/QuestionCardShell';
import { useTranslation } from '../../../core/i18n';
import type { Point } from '../../../types';
import {
  PERSPECTIVE_CANVAS_SIZE,
  type PerspectiveHitResult,
  type PerspectiveQuestionData,
  draw3DCubeWireframe,
} from '../utils/perspectiveUtils';
~~~~~

~~~~~act
patch_file
src/packs/perspective/components/StructureProjection3DView.tsx
~~~~~
~~~~~typescript
export function StructureProjection3DView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: StructureProjection3DViewProps) {
  const isHit = Boolean(userAnswer?.isHit);
  const targetPt3D = question.targetPoint3D;
  const dim = question.gridDim3D ?? 3;

  return (
    <QuestionCardShell
      hintText="观察左侧正交三视图标点，在右侧 3D 立方体透视点阵中选出对应空间坐标点"
      hintIcon={Box}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full items-center">
        {/* 左侧三视图正交切面预览 */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
            三视图正交坐标 (Top / Front / Side)
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-slate-600">
            {/* 顶视图 (X-Z) */}
            <div className="flex flex-col items-center gap-1 bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-bold">顶视图 (Top)</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 rounded grid relative bg-slate-50"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 正视图 (X-Y) */}
            <div className="flex flex-col items-center gap-1 bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-bold">正视图 (Front)</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 rounded grid relative bg-slate-50"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 侧视图 (Z-Y) */}
            <div className="flex flex-col items-center gap-1 bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-bold">侧视图 (Side)</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 rounded grid relative bg-slate-50"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
~~~~~
~~~~~typescript
export function StructureProjection3DView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: StructureProjection3DViewProps) {
  const { t } = useTranslation();
  const isHit = Boolean(userAnswer?.isHit);
  const targetPt3D = question.targetPoint3D;
  const dim = question.gridDim3D ?? 3;

  return (
    <QuestionCardShell
      hintText={t('packs.perspective.views.structureHint')}
      hintIcon={Box}
      showCanvasHints={showCanvasHints}
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full items-center">
        {/* 左侧三视图正交切面预览 */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
            {t('common.viewTriAxis')}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-slate-600">
            {/* 顶视图 (X-Z) */}
            <div className="flex flex-col items-center gap-1 bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-bold">{t('common.topView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 rounded grid relative bg-slate-50"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 正视图 (X-Y) */}
            <div className="flex flex-col items-center gap-1 bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-bold">{t('common.frontView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 rounded grid relative bg-slate-50"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.x + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* 侧视图 (Z-Y) */}
            <div className="flex flex-col items-center gap-1 bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 font-bold">{t('common.sideView')}</span>
              <div
                className="w-14 h-14 border border-dashed border-indigo-200 rounded grid relative bg-slate-50"
                style={{
                  gridTemplateColumns: `repeat(${dim}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${dim}, minmax(0, 1fr))`,
                }}
              >
                {targetPt3D && (
                  <div
                    className="absolute w-2.5 h-2.5 bg-indigo-600 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${((targetPt3D.z + 0.5) / dim) * 100}%`,
                      top: `${((dim - 1 - targetPt3D.y + 0.5) / dim) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
~~~~~

好的，我们开始将大盘卡片重构为 **方案 C：大圆角浮动流 (Floating Action Tile)** 风格。

## [WIP] feat(ui): 重构大盘训练卡片为方案C浮动动作流风格

### 用户需求
采用方案 C（大圆角浮动流）重构 `src/components/common/ModeCard.tsx`，精简卡片冗余按钮与视觉噪音，提升卡片整体质感、呼吸感与层级对比度。

### 评论
方案 C 将原本双层通栏的笨重大按钮重构为右下角的轻量化动作组合（自适应主入口 + 紧凑基准测试入口），同时将技能层阶提升至卡片右上角徽章，左下角融合展现正确率与今日训练量，极大降低了主页多卡片陈列时的视觉负荷。

### 目标
1. 重构 `src/components/common/ModeCard.tsx` 的视觉结构与交互实现。
2. 保持对弱点分析、偏好设置、实验性状态、今日刷题数/耗时以及双训练模式调用的完全兼容。
3. 优化卡片 Hover 动效与微交互，支持点击卡片主体与快捷按钮的事件解耦。

### 基本原理
采用现代浮动控制台设计语言：
* **头部**：图标与标题融合，右上角放置高亮 Lvl 层阶胶囊徽章与快捷工具组；
* **中段**：弹性自适应描述文本，避免硬编码高度截断；
* **底栏**：左侧展示精炼的核心指标（正确率 + 今日累计题量/时长），右侧浮动组合动作按钮（次级基准测试 + 主自适应训练按钮），层次分明且视觉轻快。

### 标签
#intent/refine #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/mode-card #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 重构 ModeCard 组件代码

重写 `src/components/common/ModeCard.tsx`，应用方案 C 浮动动作流样式规范。

~~~~~act
write_file
src/components/common/ModeCard.tsx
~~~~~
~~~~~tsx
import { BarChart2, FlaskConical, Play, Sliders, Target } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useTranslation } from '../../core/i18n';

export function formatTodayTimeWithT(ms: number, t: (key: string) => string): string {
  if (ms <= 0) return `0${t('common.sec')}`;
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}${t('common.sec')}`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0
    ? `${min}${t('common.min')}${sec}${t('common.sec')}`
    : `${min}${t('common.minFull')}`;
}

interface ModeCardProps {
  title: string;
  desc: string;
  icon: (props: { className?: string }) => ComponentChildren;
  todayCount: number;
  todayTimeMs?: number;
  currentLevel: number;
  accuracy: number;
  hasAnalytics?: boolean;
  isExperimental?: boolean;
  onStartTraining: () => void;
  onStartBenchmark: () => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export function ModeCard({
  title,
  desc,
  icon: Icon,
  todayCount,
  todayTimeMs = 0,
  currentLevel,
  accuracy,
  hasAnalytics = false,
  isExperimental = false,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
  onOpenAnalytics,
}: ModeCardProps) {
  const { t } = useTranslation();

  return (
    <div
      role="presentation"
      onClick={onStartTraining}
      className="group bg-white border border-slate-200/90 hover:border-indigo-500 rounded-3xl p-6 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative cursor-pointer select-none"
    >
      <div>
        {/* 顶部标题、图标与右上角状态徽章 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-105 transition-all shadow-xs flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                  {title}
                </h3>
                {isExperimental && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg flex-shrink-0">
                    <FlaskConical className="w-3 h-3 text-amber-600" />
                    {t('card.experimentalBadge')}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {todayCount > 0
                  ? `${t('card.todayTrials')}: ${todayCount} ${t('common.trialsUnit')}${
                      todayTimeMs > 0 ? ` (${formatTodayTimeWithT(todayTimeMs, t)})` : ''
                    }`
                  : t('common.empty')}
              </div>
            </div>
          </div>

          {/* 右上角：等级胶囊与快捷操作 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs font-mono font-black bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-700 border border-slate-200/80 group-hover:border-indigo-200 px-2.5 py-1 rounded-xl text-slate-700 transition-colors">
              Lvl {currentLevel}
            </span>

            <div
              className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity ml-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              {hasAnalytics && onOpenAnalytics && (
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                  title={t('card.analyticsTooltip', { title })}
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                title={t('card.settingsTooltip', { title })}
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 卡片描述 */}
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-[2.5rem] mb-5">
          {desc}
        </p>
      </div>

      {/* 底部指标栏与浮动操作按钮 */}
      <div
        className="flex items-end justify-between border-t border-slate-100 pt-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {/* 左侧：正确率综合指示 */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('card.accuracy')}
          </div>
          <div className="text-sm font-black text-slate-800 font-mono flex items-baseline gap-1.5">
            <span className={accuracy >= 80 ? 'text-emerald-600' : 'text-slate-800'}>
              {accuracy}%
            </span>
            {todayCount > 0 && (
              <span className="text-[11px] font-normal text-slate-400 font-sans">
                ({todayCount} {t('common.trialsUnit')})
              </span>
            )}
          </div>
        </div>

        {/* 右侧：紧凑动作按钮组 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStartBenchmark}
            className="p-2.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all cursor-pointer"
            title={t('card.startBenchmark')}
          >
            <Target className="w-4 h-4 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={onStartTraining}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 group-hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('card.startAdaptive')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
~~~~~

### 下一步建议
1. 运行 `npm run check` 或启动 `npm run dev` 在本地浏览器中检查主页卡片布局与响应式体验。
2. 确认满意后，我们可以继续检查是否有其他组件（如筛选栏、计划卡片）需要同步微调设计系统统一性。

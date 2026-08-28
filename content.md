这个设计非常符合认知训练产品的**冷启动引导（Onboarding）**原则：当用户初次接触某个卡片模块时，推荐先进行「基准测试」以快速度量初始感知基准；一旦有了练习记录，则切换为日常「自适应强化」为主。

我将更新 `ModeCard.tsx` 和 `Home.tsx`，加入 `totalTrials` 状态判断，实现按钮的动态权重与形态倒转。

## [WIP] feat(ui): 针对未练习卡片反转自适应与基准测试按钮权重

### 用户需求
如果某张卡片用户从未练习过（生涯总做答数 `totalTrials === 0`）：
1. 将「基准测试」作为主要行动按钮高亮显示（包含文字与图标）；
2. 将「自适应训练」简化为次级图标按钮（不显示文字，仅显示三角形 Play 图标）；
3. 点击卡片主体时，未做过的卡片默认快速进入基准测试，已有记录的卡片进入自适应训练。

### 评论
该改动极大地增强了产品的新人引导逻辑，能够引导用户自然地先定级再训练，且在 UI 上通过三角形图标与高亮胶囊形成清晰的主次对比。

### 目标
1. 在 `ModeCardProps` 中增加 `totalTrials?: number` 属性并在 `Home.tsx` 中透传生涯总题量。
2. 在 `ModeCard` 内实现基于 `isNewCard`（`totalTrials === 0`）的动态倒转渲染逻辑。
3. 保持卡片主体点击与底部按钮组的交互完全统一。

### 基本原理
* **新卡片（未做过）**：
  * 主按钮（高亮 + 文本）：`Target` 图标 + 基准测试文字；
  * 次按钮（灰底胶囊 + 三角形）：`Play` 三角形图标，点击进入自适应训练；
  * 卡片主体点击：触发 `onStartBenchmark`。
* **已有练习记录的卡片**：
  * 主按钮（高亮 + 文本）：`Play` 图标 + 自适应训练文字；
  * 次按钮（灰底胶囊 + 靶心）：`Target` 图标，点击进入基准测试；
  * 卡片主体点击：触发 `onStartTraining`。

### 标签
#intent/refine #flow/ready #priority/high #comp/cli #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/mode-card #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 更新 `ModeCard.tsx` 动态按钮反转逻辑

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
  totalTrials?: number;
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
  totalTrials = 0,
  hasAnalytics = false,
  isExperimental = false,
  onStartTraining,
  onStartBenchmark,
  onOpenSettings,
  onOpenAnalytics,
}: ModeCardProps) {
  const { t } = useTranslation();
  const isNeverPracticed = totalTrials === 0;

  // 未练习过的卡片默认进入基准测试，已有做答记录的默认进入自适应强化
  const handleCardClick = isNeverPracticed ? onStartBenchmark : onStartTraining;

  return (
    <div
      role="presentation"
      onClick={handleCardClick}
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
                  : isNeverPracticed
                    ? t('common.empty')
                    : `${t('card.todayTrials')}: 0 ${t('common.trialsUnit')}`}
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
            <span
              className={
                isNeverPracticed
                  ? 'text-slate-400'
                  : accuracy >= 80
                    ? 'text-emerald-600'
                    : 'text-slate-800'
              }
            >
              {isNeverPracticed ? '--' : `${accuracy}%`}
            </span>
            {todayCount > 0 && (
              <span className="text-[11px] font-normal text-slate-400 font-sans">
                ({todayCount} {t('common.trialsUnit')})
              </span>
            )}
          </div>
        </div>

        {/* 右侧：紧凑动作按钮组（根据 isNeverPracticed 动态倒转权重） */}
        <div className="flex items-center gap-2">
          {isNeverPracticed ? (
            <>
              {/* 次级：仅显示三角形 Play 图标的自适应训练按钮 */}
              <button
                type="button"
                onClick={onStartTraining}
                className="p-2.5 text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all cursor-pointer"
                title={t('card.startAdaptive')}
              >
                <Play className="w-4 h-4 fill-current text-slate-500" />
              </button>

              {/* 主要：高亮文字「基准测试」按钮 */}
              <button
                type="button"
                onClick={onStartBenchmark}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 group-hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                <span>{t('card.startBenchmark')}</span>
              </button>
            </>
          ) : (
            <>
              {/* 次级：仅显示靶心 Target 图标的基准测试按钮 */}
              <button
                type="button"
                onClick={onStartBenchmark}
                className="p-2.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all cursor-pointer"
                title={t('card.startBenchmark')}
              >
                <Target className="w-4 h-4 text-slate-500" />
              </button>

              {/* 主要：高亮文字「自适应训练」按钮 */}
              <button
                type="button"
                onClick={onStartTraining}
                className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 group-hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('card.startAdaptive')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
~~~~~

#### Acts 2: 在 `Home.tsx` 中向 `ModeCard` 传入 `totalTrials`

~~~~~act
patch_file
src/views/Home.tsx
~~~~~
~~~~~tsx
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
~~~~~
~~~~~tsx
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
                totalTrials={totalTrials}
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
1. 启动 `npm run dev` 验证主页卡片在“从未做过的卡片”与“已有做答记录的卡片”两种状态下的按钮渲染与点击交互；
2. 确认无误后，可以针对卡片测试覆盖率或后续视觉细节进行微调。

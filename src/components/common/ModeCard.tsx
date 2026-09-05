import { BarChart2, FlaskConical, Play, Sliders, Target } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useTranslation } from '../../core/i18n';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

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
  bestLevel?: number;
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
  bestLevel,
  totalTrials = 0,
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

  const effectiveBestLevel = Math.max(currentLevel, bestLevel || currentLevel);

  return (
    <div
      role="presentation"
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="group bg-card border border-border hover:border-primary/60 rounded-3xl p-6 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative cursor-pointer select-none"
    >
      <div>
        {/* 顶部标题、图标与右上角状态徽章 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-accent text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 transition-all shadow-xs flex-shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors truncate">
                  {title}
                </h3>
                {isExperimental && (
                  <Badge variant="warning" size="sm">
                    <FlaskConical className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {t('card.experimentalBadge')}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                {todayCount > 0
                  ? `${todayCount} ${t('common.trialsUnit')}${
                      todayTimeMs > 0 ? ` (${formatTodayTimeWithT(todayTimeMs, t)})` : ''
                    }`
                  : isNeverPracticed
                    ? t('common.empty')
                    : `0 ${t('common.trialsUnit')}`}
              </div>
            </div>
          </div>

          {/* 右上角：巅峰/基准层阶与快捷操作 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!isNeverPracticed && effectiveBestLevel > currentLevel ? (
              <Badge
                variant="secondary"
                size="default"
                className="font-mono text-xs font-bold text-muted-foreground"
              >
                Peak L{effectiveBestLevel}
              </Badge>
            ) : null}

            <div
              className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity ml-1 gap-0.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              {onOpenAnalytics && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={onOpenAnalytics}
                  title={t('card.statsTooltip', { title })}
                >
                  <BarChart2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onOpenSettings}
                title={t('card.settingsTooltip', { title })}
              >
                <Sliders className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 卡片描述 */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem] mb-5">
          {desc}
        </p>
      </div>

      {/* 底部指标栏与浮动操作按钮（Level 作为主宰一等公民大字） */}
      <div
        className="flex items-end justify-between border-t border-border/60 pt-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {/* 左侧：当前层阶纯粹大字展示 */}
        <div className="flex items-baseline">
          <span
            className={
              isNeverPracticed
                ? 'text-muted-foreground font-mono font-black text-lg'
                : 'text-primary font-mono font-black text-lg'
            }
          >
            {isNeverPracticed ? '--' : `Lvl ${currentLevel}`}
          </span>
        </div>

        {/* 右侧：紧凑动作按钮组 */}
        <div className="flex items-center gap-2">
          {isNeverPracticed ? (
            <>
              <Button
                variant="secondary"
                size="icon"
                onClick={onStartTraining}
                title={t('card.startAdaptive')}
              >
                <Play className="w-4 h-4 fill-current text-muted-foreground" />
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={onStartBenchmark}
                className="gap-1.5 font-bold"
              >
                <Target className="w-3.5 h-3.5" />
                <span>{t('card.startBenchmark')}</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="icon"
                onClick={onStartBenchmark}
                title={t('card.startBenchmark')}
              >
                <Target className="w-4 h-4 text-muted-foreground" />
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={onStartTraining}
                className="gap-1.5 font-bold"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('card.startAdaptive')}</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';

interface ActivityHeatmapCardProps {
  heatmapData: { date: string; count: number }[];
}

interface HeatmapDay {
  dateStr: string;
  count: number;
  isFuture: boolean;
}

interface HeatmapWeek {
  days: HeatmapDay[];
  monthLabel: string | null;
}

const TOTAL_WEEKS = 53;

export function ActivityHeatmapCard({ heatmapData }: ActivityHeatmapCardProps) {
  const { t, locale } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. 构建日期-答题量映射表
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of heatmapData) {
      map.set(item.date, (map.get(item.date) || 0) + item.count);
    }
    return map;
  }, [heatmapData]);

  // 2. 解析多语言月份数组
  const monthNames = useMemo(() => {
    const raw = t<string[]>('stats.heatmapMonths');
    if (Array.isArray(raw)) return raw;
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }, [t, locale]);

  // 3. 构建 53 周 x 7 天 (周日~周六) 矩阵
  const { weeks, totalTrialsPastYear } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay(); // 0: 周日, 1: 周一, ... 6: 周六

    // 以当前周的周六作为热力图终点
    const gridEnd = new Date(today);
    gridEnd.setDate(today.getDate() + (6 - dayOfWeek));

    // 计算起点 (共 53 周，371 天)
    const gridStart = new Date(gridEnd);
    gridStart.setDate(gridEnd.getDate() - (TOTAL_WEEKS * 7 - 1));

    const weeksList: HeatmapWeek[] = [];
    let lastMonth = -1;
    let totalCount = 0;

    for (let w = 0; w < TOTAL_WEEKS; w++) {
      const days: HeatmapDay[] = [];
      let weekMonthLabel: string | null = null;

      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(gridStart);
        currentDate.setDate(gridStart.getDate() + w * 7 + d);

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const isFuture = currentDate > today;
        const count = isFuture ? 0 : countMap.get(dateStr) || 0;

        if (!isFuture) {
          totalCount += count;
        }

        days.push({
          dateStr,
          count,
          isFuture,
        });

        // 识别月份变更 (若该周包含当月 1~7 号，则在该列顶部显示月份标识)
        const currentMonthIdx = currentDate.getMonth();
        if (
          currentDate.getDate() >= 1 &&
          currentDate.getDate() <= 7 &&
          currentMonthIdx !== lastMonth
        ) {
          weekMonthLabel = monthNames[currentMonthIdx] || `${currentMonthIdx + 1}`;
          lastMonth = currentMonthIdx;
        }
      }

      weeksList.push({
        days,
        monthLabel: weekMonthLabel,
      });
    }

    return { weeks: weeksList, totalTrialsPastYear: totalCount };
  }, [countMap, monthNames]);

  // 4. 默认将滚动条推至最右侧 (最新周)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, []);

  const getHeatmapColor = (count: number, isFuture: boolean) => {
    if (isFuture) return 'bg-transparent border border-transparent';
    if (count === 0) return 'bg-slate-100/90 border border-slate-200/40';
    if (count < 10) return 'bg-indigo-200 border border-indigo-300/60';
    if (count < 25) return 'bg-indigo-400 border border-indigo-500/60';
    if (count < 50) return 'bg-indigo-600 border border-indigo-600';
    return 'bg-indigo-800 border border-indigo-900';
  };

  return (
    <div className="bg-white border border-slate-200/80 shadow-sm p-5 sm:p-6 rounded-3xl flex flex-col gap-4">
      {/* 顶栏：标题、年度总刷题数与图例 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-800 tracking-tight">
            {t('stats.heatmapTitle')}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            ({t('stats.heatmapTotalYear', { count: totalTrialsPastYear })})
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium self-end sm:self-auto">
          <span>{t('stats.heatmapLess')}</span>
          <div className="w-3 h-3 rounded-[3px] bg-slate-100 border border-slate-200/60" />
          <div className="w-3 h-3 rounded-[3px] bg-indigo-200" />
          <div className="w-3 h-3 rounded-[3px] bg-indigo-400" />
          <div className="w-3 h-3 rounded-[3px] bg-indigo-600" />
          <div className="w-3 h-3 rounded-[3px] bg-indigo-800" />
          <span>{t('stats.heatmapMore')}</span>
        </div>
      </div>

      {/* GitHub 风格矩阵主体：带横向滚动支持 */}
      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto pb-2 pt-1 scrollbar-thin select-none"
      >
        <div className="inline-flex gap-2 min-w-max">
          {/* 左侧：星期标签 (周一/周三/周五 对齐对应行) */}
          <div className="flex flex-col justify-between pt-5 pb-0.5 pr-1 text-[10px] font-semibold text-slate-400 font-mono select-none h-[116px]">
            <span className="leading-none">{t('stats.weekdayMon')}</span>
            <span className="leading-none">{t('stats.weekdayWed')}</span>
            <span className="leading-none">{t('stats.weekdayFri')}</span>
          </div>

          {/* 右侧：53 列按周排列的矩阵与顶部月份 */}
          <div className="flex gap-1">
            {weeks.map((week, wIdx) => (
              <div key={`week-${wIdx}`} className="flex flex-col gap-1 flex-shrink-0">
                {/* 顶部月份标记槽位 (高度固定，有标签时显示) */}
                <div className="h-4 text-[10px] font-bold text-slate-500 truncate leading-none overflow-visible">
                  {week.monthLabel || ''}
                </div>

                {/* 竖向 7 天方块 (从周日到周六) */}
                <div className="flex flex-col gap-1">
                  {week.days.map((day) => (
                    <div
                      key={day.dateStr}
                      title={
                        day.isFuture
                          ? undefined
                          : `${day.dateStr}: ${day.count} ${t('common.trialsUnit')}`
                      }
                      className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px] transition-all ${
                        day.isFuture
                          ? 'invisible'
                          : 'cursor-pointer hover:scale-125 hover:z-10 hover:shadow-xs'
                      } ${getHeatmapColor(day.count, day.isFuture)}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
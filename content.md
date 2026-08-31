好的，我将把 `ActivityHeatmapCard.tsx` 重构成标准的 GitHub 贡献图矩阵风格（53 周 × 7 天竖直排列），同时增加月份/星期表头、年份滚动容器并完成中英双语国际化支持。

## [WIP] feat(stats): 重构训练活跃度热力图为 GitHub 竖排周矩阵布局

### 用户需求
1. 将原来横向散列分布的训练热力图改为仿 GitHub 贡献图的纵向星期排列模式（每列代表一周，由上至下为周日到周六共 7 天）。
2. 支持展示完整一整年（53 周，约 365~371 天）的历史训练活跃足迹，并在屏幕宽度不足时支持平滑横向滚动，默认自动滚动至最新活跃周。
3. 顶部与左侧分别增加月份（如“一月”、“二月” / “Jan”, “Feb”）与星期指示（如“周一”、“周三”、“周五” / “Mon”, “Wed”, “Fri”），并全面支持 i18n 国际化配置。
4. 保持原有 Indigo 系列的五级色彩阶梯不变。

### 评论
将简单网格重构为标准的 GitHub 53 周时间序列矩阵，不仅在视觉上更符合开发者的认知习惯，而且能够直观反映出用户的连续训练周期、周间训练节奏以及长达一年的感知进阶轨迹。

### 目标
1. 在 `zh-CN.json` 和 `en-US.json` 的 `stats` 命名空间中扩充月份（1~12月）及星期（周一/周三/周五等）标签字典。
2. 重写 `ActivityHeatmapCard.tsx`，建立基于真实日期的 53 周日历推算逻辑，处理未来日期置灰与历史做答频次映射。
3. 实现横向滚动容器并配置自动贴右滚动（聚焦最近活跃日期）与 Tooltip 详细提示。

### 基本原理
1. **周列时间轴映射**：以当前日期所在周的周末作为锚点向前回溯 53 周（371 天），构建一个 `53 列 × 7 行` 的二维坐标矩阵。
2. **表头对齐**：左侧固定星期标签（第 2、4、6 行分别对齐周一、周三、周五），顶部动态在每月第一周插入月份文本。
3. **交互与色彩**：保留原有的 5 档 Indigo 配色阈值，加入悬浮微放大和边框高亮效果，容器支持触控/鼠标横向滚动。

### 标签
#intent/build #flow/ready #priority/medium #comp/ui #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/activity-heatmap #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新中英双语本地化文件配置

为 `zh-CN.json` 和 `en-US.json` 补充月份与星期标签定义。

~~~~~act
patch_file
src/locales/zh-CN.json
~~~~~
~~~~~json.old
    "challengeMasterySubtitle": "抗错觉 / 图底反转得分",
    "heatmapTitle": "近 12 周训练热力图",
    "trendTitle": "能力峰值演进轨迹",
    "heatmapLess": "少",
    "heatmapMore": "多",
    "dailyMaxLevel": "每日最高 Level",
~~~~~
~~~~~json.new
    "challengeMasterySubtitle": "抗错觉 / 图底反转得分",
    "heatmapTitle": "年度训练活跃度热力图",
    "heatmapTotalYear": "近一年累计训练 {{count}} 题",
    "heatmapMonths": ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
    "weekdayMon": "周一",
    "weekdayWed": "周三",
    "weekdayFri": "周五",
    "trendTitle": "能力峰值演进轨迹",
    "heatmapLess": "少",
    "heatmapMore": "多",
    "dailyMaxLevel": "每日最高 Level",
~~~~~

~~~~~act
patch_file
src/locales/en-US.json
~~~~~
~~~~~json.old
    "challengeMasterySubtitle": "Anti-illusion & figure-ground reversal score",
    "heatmapTitle": "12-Week Activity Heatmap",
    "trendTitle": "Skill Peak Trajectory",
    "heatmapLess": "Less",
    "heatmapMore": "More",
    "dailyMaxLevel": "Daily Max Level",
~~~~~
~~~~~json.new
    "challengeMasterySubtitle": "Anti-illusion & figure-ground reversal score",
    "heatmapTitle": "Annual Activity Heatmap",
    "heatmapTotalYear": "{{count}} trials in the past year",
    "heatmapMonths": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "weekdayMon": "Mon",
    "weekdayWed": "Wed",
    "weekdayFri": "Fri",
    "trendTitle": "Skill Peak Trajectory",
    "heatmapLess": "Less",
    "heatmapMore": "More",
    "dailyMaxLevel": "Daily Max Level",
~~~~~

#### Acts 2: 重构 ActivityHeatmapCard 实现 GitHub 风格 53 周竖排矩阵

重写 `ActivityHeatmapCard.tsx`，计算 53 周各天数据分布，并构建带月份列头、星期行标的横向滚动热力图。

~~~~~act
write_file
src/components/stats/ActivityHeatmapCard.tsx
~~~~~
~~~~~tsx
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
  const { t } = useTranslation();
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
    const raw = t('stats.heatmapMonths');
    if (Array.isArray(raw)) return raw as string[];
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }, [t]);

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
~~~~~

### 下一步建议
1. **联动筛选**：后续可考虑在用户点击热力图中的某一天时，触发全局日期过滤，查看当天的具体答题卡片与错误分布。
2. **连续打卡高亮**：可以在热力图头部同步展示“当前连续打卡天数（Streak）”及“历史最高连续天数”统计徽章。

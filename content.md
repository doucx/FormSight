好的，我将为你实现此功能。在每个模式子卡片的右上角展示今日练习的题数与耗时。

## [WIP] feat: 在色感与寻星训练看板卡片右上角展示今日刷题数量与时间

### 用户需求
在每个训练子卡片（如色相、明度、饱和度、单锚点、水平双锚点、旋转双锚点等）的右上角，添加一个样式淡雅的“今日刷题”数据展示（包含今日刷题数量与用时）。

### 评论
这个改进能给用户提供更直观、即时的今日练习反馈，帮助用户快速感知自己在各个专项模式上的当日练习进度与投入时长。

### 目标
1. 在 `ColorDashboard.tsx` 中统计并展示今日各色感模式（H/S/V）的答题数与累计耗时。
2. 在 `Dashboard.tsx` 中统计并展示今日各寻星模式（single/double_h/double_r）的答题数与累计耗时。
3. 保持 UI 统一与轻便，不破坏原有的卡片布局。

### 基本原理
从 IndexedDB 读取当天的试题做答记录 (`records` / `color_records`)，根据记录的 `timestamp`（大于等于当日 00:00:00）筛选出今日记录，累加答题数量与 `responseTimeMs`，并在子卡片右上角以淡色优雅文本进行显示。

### 标签
#intent/build #flow/ready #priority/medium #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/dashboard-cards #task/action/feature-add #task/state/begin

---

### Script

#### Acts 1: 更新 `ColorDashboard.tsx` 以展示今日刷题数据

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
import { Award, Play, RotateCw, Sliders, Target, TrendingUp } from 'lucide-preact';
import type { ColorMode } from '../utils/colorUtils';
import type { ColorProfileData } from '../utils/db';

interface ColorDashboardProps {
~~~~~
~~~~~typescript.new
import { Award, Play, RotateCw, Sliders, Target, TrendingUp } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import type { ColorMode } from '../utils/colorUtils';
import { type ColorProfileData, getAllColorTrialRecords } from '../utils/db';

interface ColorDashboardProps {
~~~~~

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
export function ColorDashboard({
  profiles,
  onStart,
  onBackToHome,
  onOpenSettings,
}: ColorDashboardProps) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
~~~~~
~~~~~typescript.new
function formatTodayTime(ms: number): string {
  if (ms <= 0) return '0秒';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}秒`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`;
}

export function ColorDashboard({
  profiles,
  onStart,
  onBackToHome,
  onOpenSettings,
}: ColorDashboardProps) {
  const [todayStats, setTodayStats] = useState<Record<ColorMode, { count: number; timeMs: number }>>({
    H: { count: 0, timeMs: 0 },
    V: { count: 0, timeMs: 0 },
    S: { count: 0, timeMs: 0 },
  });

  useEffect(() => {
    let isMounted = true;
    const fetchTodayStats = async () => {
      const records = await getAllColorTrialRecords();
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const stats: Record<ColorMode, { count: number; timeMs: number }> = {
        H: { count: 0, timeMs: 0 },
        V: { count: 0, timeMs: 0 },
        S: { count: 0, timeMs: 0 },
      };

      for (const r of records) {
        if (r.timestamp >= startOfToday && stats[r.mode]) {
          stats[r.mode].count += 1;
          stats[r.mode].timeMs += r.responseTimeMs || 0;
        }
      }

      if (isMounted) {
        setTodayStats(stats);
      }
    };
    fetchTodayStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
~~~~~

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <RotateCw className="w-6 h-6" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
~~~~~
~~~~~typescript.new
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <RotateCw className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-slate-400">今日刷题</div>
                    <div className="text-xs font-bold text-slate-500 font-mono">
                      {todayStats[config.id].count} 题
                      {todayStats[config.id].count > 0 && (
                        <span className="text-[11px] text-slate-400 font-normal ml-1">
                          ({formatTodayTime(todayStats[config.id].timeMs)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
~~~~~

#### Acts 2: 更新 `Dashboard.tsx` 以展示今日刷题数据

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript.old
import {
  Award,
  BarChart2,
  type Compass,
  Crosshair,
  Play,
  RotateCw,
  Sliders,
  Target,
  TrendingUp,
} from 'lucide-preact';
import type { TrainingMode } from '../types';
import type { UserProfileData } from '../utils/db';
~~~~~
~~~~~typescript.new
import {
  Award,
  BarChart2,
  type Compass,
  Crosshair,
  Play,
  RotateCw,
  Sliders,
  Target,
  TrendingUp,
} from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import type { TrainingMode } from '../types';
import { type UserProfileData, getAllTrialRecords } from '../utils/db';
~~~~~

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript.old
export function Dashboard({
  profiles,
  onStart,
  onOpenSettings,
  onOpenAnalytics,
  onBackToHome,
}: DashboardProps) {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
~~~~~
~~~~~typescript.new
function formatTodayTime(ms: number): string {
  if (ms <= 0) return '0秒';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}秒`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`;
}

export function Dashboard({
  profiles,
  onStart,
  onOpenSettings,
  onOpenAnalytics,
  onBackToHome,
}: DashboardProps) {
  const [todayStats, setTodayStats] = useState<Record<TrainingMode, { count: number; timeMs: number }>>({
    single: { count: 0, timeMs: 0 },
    double_h: { count: 0, timeMs: 0 },
    double_r: { count: 0, timeMs: 0 },
  });

  useEffect(() => {
    let isMounted = true;
    const fetchTodayStats = async () => {
      const records = await getAllTrialRecords();
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const stats: Record<TrainingMode, { count: number; timeMs: number }> = {
        single: { count: 0, timeMs: 0 },
        double_h: { count: 0, timeMs: 0 },
        double_r: { count: 0, timeMs: 0 },
      };

      for (const r of records) {
        if (r.timestamp >= startOfToday && stats[r.mode]) {
          stats[r.mode].count += 1;
          stats[r.mode].timeMs += r.responseTimeMs || 0;
        }
      }

      if (isMounted) {
        setTodayStats(stats);
      }
    };
    fetchTodayStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
~~~~~

~~~~~act
patch_file
src/views/Dashboard.tsx
~~~~~
~~~~~typescript.old
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-6 h-6" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
~~~~~
~~~~~typescript.new
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-slate-400">今日刷题</div>
                    <div className="text-xs font-bold text-slate-500 font-mono">
                      {todayStats[config.id].count} 题
                      {todayStats[config.id].count > 0 && (
                        <span className="text-[11px] text-slate-400 font-normal ml-1">
                          ({formatTodayTime(todayStats[config.id].timeMs)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>
~~~~~

### 下一步建议
1. 启动本地开发服务验证子卡片右上角的渲染效果，确保在未刷题时显示 `0 题`，在刷题后实时更新今日题数与用时（如 `15 题 (2分30秒)`）。
2. 可考虑在完成训练后自动刷新该统计数据。

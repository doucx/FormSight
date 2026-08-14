好的，我将帮助你移除 `AnalyticsModal.tsx` 与 `ColorAnalyticsModal.tsx` 中“一键开启专项强化”按钮及相关设置触发逻辑，保留弱点数据展示功能。

## [WIP] refactor: 移除视角与色相弱点分析中的一键开启专项强化功能

### 用户需求
移除视角误差分析模态框 (`AnalyticsModal`) 和色相感知弱点分析模态框 (`ColorAnalyticsModal`) 中的“一键开启该方向/色相专项强化”按钮及相关设置写入逻辑，保留弱点方向/色相数据的展示。

### 评论
当前的一键开启按钮通过 `alert` 提示和强制改变全局设置给用户带来了较差的交互体验，直接在偏好设置中手动勾选弱点扇区更加直观且受控。移除此功能可以简化分析界面的交互，降低逻辑耦合。

### 目标
1. 从 `AnalyticsModal.tsx` 中移除 `handleApplyTargeting` 函数、“一键开启该方向专项强化”按钮以及未使用的 import。
2. 从 `ColorAnalyticsModal.tsx` 中移除 `handleApplyTargeting` 函数、“一键开启该色相专项强化”按钮以及未使用的 import。

### 基本原理
保持弱点诊断信息（最弱扇区和正确率）展示不变，仅移除自动触发设置变更的操作按钮和配套 Handler 函数，恢复纯粹的数据分析报告定位。

### 标签
#intent/refine #flow/ready #priority/medium #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/analytics-modal #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 移除 AnalyticsModal 中的一键开启按钮及相关逻辑

~~~~~act
patch_file
src/components/AnalyticsModal.tsx
~~~~~
~~~~~typescript.old
import { AlertCircle, BarChart2, Compass, Crosshair, Info, Target, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { TrainingMode, TrialRecord } from '../types';
import { getAllTrialRecords } from '../utils/db';
import { loadSettings, saveSettings } from '../utils/settings';
~~~~~
~~~~~typescript.new
import { AlertCircle, BarChart2, Compass, Info, Target, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { TrainingMode, TrialRecord } from '../types';
import { getAllTrialRecords } from '../utils/db';
~~~~~

~~~~~act
patch_file
src/components/AnalyticsModal.tsx
~~~~~
~~~~~typescript.old
  const sectorStats = sectorBuckets.map((b, i) => {
    const acc = b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0;
    const avgErr = b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0;
    return {
      sectorIdx: i,
      label: SECTOR_LABELS[i],
      total: b.total,
      accuracy: acc,
      avgError: avgErr,
    };
  });

  const handleApplyTargeting = (sectorIdx: number) => {
    const settings = loadSettings();
    saveSettings({
      ...settings,
      targetingMode: 'manual',
      manualTargetSectors: [sectorIdx],
    });
    alert(`🎯 已成功设置：将在训练中专项强化【${SECTOR_LABELS[sectorIdx]}】视角！`);
    onClose();
  };

  // 找最弱方向（做答数 >= 3 中正确率最低或误差最大的方向）
~~~~~
~~~~~typescript.new
  const sectorStats = sectorBuckets.map((b, i) => {
    const acc = b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0;
    const avgErr = b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0;
    return {
      sectorIdx: i,
      label: SECTOR_LABELS[i],
      total: b.total,
      accuracy: acc,
      avgError: avgErr,
    };
  });

  // 找最弱方向（做答数 >= 3 中正确率最低或误差最大的方向）
~~~~~

~~~~~act
patch_file
src/components/AnalyticsModal.tsx
~~~~~
~~~~~typescript.old
                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60">
                        <span className="font-bold text-slate-800">{weakestSector.label}</span>
                        <span className="font-black text-rose-600 text-sm">
                          {weakestSector.accuracy}% 正确率
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyTargeting(weakestSector.sectorIdx)}
                        className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        一键开启该方向专项强化
                      </button>
                    </div>
~~~~~
~~~~~typescript.new
                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-amber-200/60">
                        <span className="font-bold text-slate-800">{weakestSector.label}</span>
                        <span className="font-black text-rose-600 text-sm">
                          {weakestSector.accuracy}% 正确率
                        </span>
                      </div>
                    </div>
~~~~~

#### Acts 2: 移除 ColorAnalyticsModal 中的一键开启按钮及相关逻辑

~~~~~act
patch_file
src/components/ColorAnalyticsModal.tsx
~~~~~
~~~~~typescript.old
import { AlertCircle, BarChart2, Crosshair, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import { type ColorTrialRecord, getAllColorTrialRecords } from '../utils/db';
import { loadSettings, saveSettings } from '../utils/settings';
~~~~~
~~~~~typescript.new
import { AlertCircle, BarChart2, Info, X } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import { type ColorTrialRecord, getAllColorTrialRecords } from '../utils/db';
~~~~~

~~~~~act
patch_file
src/components/ColorAnalyticsModal.tsx
~~~~~
~~~~~typescript.old
  const sectorStats = sectorBuckets.map((b, i) => {
    const acc = b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0;
    const avgErr = b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0;
    return {
      sectorIdx: i,
      label: SECTOR_LABELS[i],
      total: b.total,
      accuracy: acc,
      avgError: avgErr,
    };
  });

  const handleApplyTargeting = (sectorIdx: number) => {
    const settings = loadSettings();
    saveSettings({
      ...settings,
      colorTargetingMode: 'manual',
      colorManualTargetSectors: [sectorIdx],
    });
    alert(`🎯 已成功设置：将在色感训练中专项强化【${SECTOR_LABELS[sectorIdx]}】区间！`);
    onClose();
  };

  // 找最弱方向（做答数 >= 3 中正确率最低的方向）
~~~~~
~~~~~typescript.new
  const sectorStats = sectorBuckets.map((b, i) => {
    const acc = b.total > 0 ? Math.round((b.hits / b.total) * 100) : 0;
    const avgErr = b.total > 0 ? Math.round((b.sumError / b.total) * 10) / 10 : 0;
    return {
      sectorIdx: i,
      label: SECTOR_LABELS[i],
      total: b.total,
      accuracy: acc,
      avgError: avgErr,
    };
  });

  // 找最弱方向（做答数 >= 3 中正确率最低的方向）
~~~~~

~~~~~act
patch_file
src/components/ColorAnalyticsModal.tsx
~~~~~
~~~~~typescript.old
                      <span className="font-black text-rose-600 text-sm">
                        {weakestSector.accuracy}% 正确率
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyTargeting(weakestSector.sectorIdx)}
                      className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      一键开启该色相专项强化
                    </button>
                  </div>
~~~~~
~~~~~typescript.new
                      <span className="font-black text-rose-600 text-sm">
                        {weakestSector.accuracy}% 正确率
                      </span>
                    </div>
                  </div>
~~~~~

### 下一步建议
1. 验证代码类型检查和 Formatter 校验，确保无未使用的变量或格式问题。
2. 在浏览器中打开视角与色相分析弹窗，确认最弱方向诊断卡片渲染正常，且不再有按钮干扰。

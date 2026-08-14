好的，我将帮助你彻底删除设置中的“智能自动”靶向模式，仅保留“关闭 (全随机)”与“手动指定”，并清理相关的自动诊断算子与界面标注。

## [WIP] refactor: 删除偏好训练中的智能自动模式

### 用户需求
彻底移除寻星与色感训练设置中的“智能自动”靶向模式选项，清理基于历史做答记录自动分析并锁定弱点的算子，仅保留“关闭 (全随机)”和“手动指定”模式。

### 评论
“智能自动”模式的判断逻辑依赖于固定的阈值统计，在样本较少或交替练习时效果不可控，且增加了额外的后台计算开销。保留“手动指定”能让用户更清晰掌控强化目标。

### 目标
1. 在类型定义 `TargetingMode` 中移除 `'auto'`，并在加载设置时将旧配置中的 `'auto'` 自动迁移回 `'off'`。
2. 从 `SettingsModal` 设置弹窗中移除“智能自动”按钮。
3. 从 `TrainingView` 和 `ColorTrainingView` 中清理自动拉取弱点扇区的 `useEffect` 逻辑及无用数据接口导入。
4. 简化训练顶栏的靶向标识为“靶向强化训练”。

### 基本原理
通过修改 `TargetingMode = 'off' | 'manual'` 类型约束，重构偏好设置面板选项，同时移除训练视图中静默读取 IDB 历史日志计算弱点扇区的相关逻辑。

### 标签
#intent/refine #flow/ready #priority/medium #concept/config #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/settings-modal #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 更新类型定义与配置加载逻辑

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'auto' | 'manual';

export interface UserSettings {
~~~~~
~~~~~typescript.new
export type StepGranularity = 'standard' | 'fine';
export type AdaptiveMode = 'block' | 'staircase';
export type TargetingMode = 'off' | 'manual';

export interface UserSettings {
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript.old
export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load user settings:', e);
  }
  return DEFAULT_SETTINGS;
}
~~~~~
~~~~~typescript.new
export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.targetingMode === 'auto') parsed.targetingMode = 'off';
      if (parsed.colorTargetingMode === 'auto') parsed.colorTargetingMode = 'off';
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load user settings:', e);
  }
  return DEFAULT_SETTINGS;
}
~~~~~

#### Acts 2: 更新几何与色彩发题选项类型定义

~~~~~act
patch_file
src/utils/geometry.ts
~~~~~
~~~~~typescript.old
export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'auto' | 'manual';
  targetSectors?: number[]; // [0~7]
  gridSize?: number;
}
~~~~~
~~~~~typescript.new
export interface QuestionGenerateOptions {
  targetingMode?: 'off' | 'manual';
  targetSectors?: number[]; // [0~7]
  gridSize?: number;
}
~~~~~

~~~~~act
patch_file
src/utils/colorUtils.ts
~~~~~
~~~~~typescript.old
export interface ColorQuestionGenerateOptions {
  targetingMode?: 'off' | 'auto' | 'manual';
  targetSectors?: number[]; // [0~11] 代表 12 个 30° 的色相扇区
}
~~~~~
~~~~~typescript.new
export interface ColorQuestionGenerateOptions {
  targetingMode?: 'off' | 'manual';
  targetSectors?: number[]; // [0~11] 代表 12 个 30° 的色相扇区
}
~~~~~

#### Acts 3: 移除 SettingsModal 中的“智能自动”按钮选项

~~~~~act
patch_file
src/components/SettingsModal.tsx
~~~~~
~~~~~typescript.old
          {/* 专项靶向强化训练设置 (两者共用) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Crosshair className="w-4 h-4 text-indigo-600" />
              弱点专项靶向强化
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'off', label: '关闭 (全随机)' },
                { id: 'auto', label: '智能自动' },
                { id: 'manual', label: '手动指定' },
              ].map((m) => {
~~~~~
~~~~~typescript.new
          {/* 专项靶向强化训练设置 (两者共用) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Crosshair className="w-4 h-4 text-indigo-600" />
              弱点专项靶向强化
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'off', label: '关闭 (全随机)' },
                { id: 'manual', label: '手动指定' },
              ].map((m) => {
~~~~~

#### Acts 4: 清理 TrainingView 中的自动强化逻辑与标识

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
import type { HitResult, Point, QuestionData, TrainingMode, TrialRecord } from '../types';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { type SessionData, getAllTrialRecords, saveSession, saveTrialRecord } from '../utils/db';
import { type QuestionGenerateOptions, generateQuestion } from '../utils/geometry';
~~~~~
~~~~~typescript.new
import type { HitResult, Point, QuestionData, TrainingMode, TrialRecord } from '../types';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import { type SessionData, saveSession, saveTrialRecord } from '../utils/db';
import { type QuestionGenerateOptions, generateQuestion } from '../utils/geometry';
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // 自动拉取弱点扇区（若为 auto 模式）
  useEffect(() => {
    if (settings.targetingMode === 'auto') {
      getAllTrialRecords(mode).then((records) => {
        if (records.length >= 3) {
          const buckets = Array.from({ length: 8 }, () => ({ total: 0, hits: 0 }));
          for (const r of records) {
            const idx = Math.floor(((r.angleDegree + 22.5) % 360) / 45);
            buckets[idx].total += 1;
            if (r.isHit) buckets[idx].hits += 1;
          }
          let minAcc = 1.0;
          let minIdx = 0;
          for (let i = 0; i < buckets.length; i++) {
            const b = buckets[i];
            if (b.total >= 1) {
              const acc = b.hits / b.total;
              if (acc < minAcc) {
                minAcc = acc;
                minIdx = i;
              }
            }
          }
          targetSectorsRef.current = [minIdx];
        }
      });
    }
  }, [mode, settings.targetingMode]);

  const [showAnswer, setShowAnswer] = useState<boolean>(false);
~~~~~
~~~~~typescript.new
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  const [showAnswer, setShowAnswer] = useState<boolean>(false);
~~~~~

~~~~~act
patch_file
src/views/TrainingView.tsx
~~~~~
~~~~~typescript.old
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
          {settings.targetingMode !== 'off' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              {settings.targetingMode === 'auto' ? '智能靶向强化' : '手动靶向强化'}
            </span>
          )}
        </div>
~~~~~
~~~~~typescript.new
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode} | {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
          {settings.targetingMode === 'manual' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              靶向强化训练
            </span>
          )}
        </div>
~~~~~

#### Acts 5: 清理 ColorTrainingView 中的自动强化逻辑与标识

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript.old
import {
  type ColorSessionData,
  type ColorTrialRecord,
  getAllColorTrialRecords,
  saveColorSession,
  saveColorTrialRecord,
} from '../utils/db';
~~~~~
~~~~~typescript.new
import {
  type ColorSessionData,
  type ColorTrialRecord,
  saveColorSession,
  saveColorTrialRecord,
} from '../utils/db';
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript.old
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showAnswer, setShowAnswer] = useState<boolean>(false);

  // 智能自动模式下，加载历史色相盲点
  useEffect(() => {
    if (settings.colorTargetingMode === 'auto' && mode === 'H') {
      getAllColorTrialRecords('H').then((records) => {
        if (records.length >= 3) {
          const buckets = Array.from({ length: 12 }, () => ({ total: 0, hits: 0 }));
          for (const r of records) {
            const targetH = r.targetHSV[0];
            const idx = Math.floor(targetH / 30);
            const safeIdx = Math.max(0, Math.min(11, idx));
            buckets[safeIdx].total += 1;
            if (r.isHit) buckets[safeIdx].hits += 1;
          }
          let minAcc = 1.0;
          let minIdx = 0;
          for (let i = 0; i < buckets.length; i++) {
            const b = buckets[i];
            if (b.total >= 1) {
              const acc = b.hits / b.total;
              if (acc < minAcc) {
                minAcc = acc;
                minIdx = i;
              }
            }
          }
          targetSectorsRef.current = [minIdx];
        }
      });
    }
  }, [mode, settings.colorTargetingMode]);
  const [userAnswer, setUserAnswer] = useState<ColorHitResult | null>(null);
~~~~~
~~~~~typescript.new
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<ColorHitResult | null>(null);
~~~~~

~~~~~act
patch_file
src/views/ColorTrainingView.tsx
~~~~~
~~~~~typescript.old
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode === 'H' ? '色相' : mode === 'V' ? '明度' : '饱和度'} |{' '}
            {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
          {settings.colorTargetingMode !== 'off' && mode === 'H' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              {settings.colorTargetingMode === 'auto' ? '智能靶向强化' : '手动靶向强化'}
            </span>
          )}
        </div>
~~~~~
~~~~~typescript.new
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
            {mode === 'H' ? '色相' : mode === 'V' ? '明度' : '饱和度'} |{' '}
            {sessionType === 'benchmark' ? '基准测试' : '自适应训练'}
          </span>
          {settings.colorTargetingMode === 'manual' && mode === 'H' && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-amber-600" />
              靶向强化训练
            </span>
          )}
        </div>
~~~~~

### 下一步建议
1. 检查各组件与工具库中的 TypeScript 类型编译，确保无类型报错。
2. 打开偏好设置面板，验证“弱点专项靶向强化”区域仅保留“关闭”与“手动指定”两个选项。

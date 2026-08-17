这个建议非常棒！在手眼协调与知觉训练（如 Aim Lab、OSU 等）中，即时的音频听觉反馈能够形成多模态神经正反馈回路，极大地强化训练沉浸感和节奏感。

我们将使用原生 **Web Audio API**（基于 `OscillatorNode` + `GainNode` 合成，零外部音频资源依赖，超低延迟），设计如下：
1. **答对音效 (Hit)**：正弦波高频短促的“叮”声（类似金属击靶的爽快感，80ms 指数衰减），并随着 **Streak 连胜次数** 按等比半音阶动态升高音调（Pitch 上升）。
2. **答错音效 (Miss)**：低沉、柔和的下行平滑音（200Hz -> 140Hz 柔和三角波），不刺耳但有清晰的边界提示。
3. **全局控制**：在 `GlobalSettings` 中加入 `soundEnabled`（默认开启），并在全局设置界面中提供实时开关。

---

## [WIP] feat: 引入基于 Web Audio API 的连击音效反馈系统与全局音频设置

### 用户需求
引入轻量化 Web Audio API 音效反馈：
1. 答对时播放高频短促的“叮”声，连胜次数（Streak）越高，音调（Pitch）越强。
2. 答错时播放低沉柔和的提示音。
3. 提供全局声音开关控制。

### 评论
纯合成的 Web Audio API 不依赖任何外部 mp3/wav 资源，加载零延迟，且可以精确根据答题连击（Streak）动态计算音频振荡频率和音高包络，不仅极大幅度提升答题正向反馈，还不会增加构建包体积。

### 目标
1. 创建 `src/utils/sound.ts` 音频合成模块，实现 `playHitSound(streak)` 与 `playMissSound()`。
2. 在 `src/utils/settings.ts` 的 `GlobalSettings` 中增加 `soundEnabled` 属性，并兼容持久化与数据迁移。
3. 在 `src/components/GlobalSettingsModal.tsx` 全局设置弹窗中增加音效开关切换项。
4. 在 `src/hooks/useTrainingSession.ts` 中维护连胜计数器，并在做答判定时自动触发对应音效。
5. 补充与更新相关单元测试。

### 基本原理
1. 通过浏览器的 `AudioContext` 构造振荡器 (`OscillatorNode`) 与增益包络 (`GainNode`)。
2. 击中时以基频 1046.5Hz (C6) 为底，根据连胜计数 $n$ 按公式 $f = f_0 \times 1.06^{\min(n, 12)}$ 计算音高，形成明亮清脆的上升琶音阶梯。
3. 闲置或静音时自动拦截，避免产生无意义的音频调度开销。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #concept/config #scope/ux #ai/instruct #task/domain/ui #task/object/audio-feedback-system #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 创建轻量化 Web Audio 音效管理器 `src/utils/sound.ts`

~~~~~act
write_file
src/utils/sound.ts
~~~~~
~~~~~typescript
import { loadSettings } from './settings';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * 播放答对音效 (Aim Lab 风格高频短促清脆“叮”声)
 * @param streak 当前连击次数 (0..N)
 */
export function playHitSound(streak = 0): void {
  const settings = loadSettings();
  if (!settings.global.soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 基频 1046.5Hz (C6)，根据 streak 连胜阶梯按半音等比上扬，上限限制在 ~2200Hz
  const cappedStreak = Math.min(Math.max(0, streak - 1), 12);
  const baseFreq = 1046.5;
  const targetFreq = baseFreq * 1.059463 ** cappedStreak;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(targetFreq, now);
  // 轻微的向上频移增强打击感
  osc.frequency.exponentialRampToValueAtTime(targetFreq * 1.08, now + 0.08);

  // 极速起音，指数衰减
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.22, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * 播放答错提示音 (柔和低沉的下行平滑提示)
 */
export function playMissSound(): void {
  const settings = loadSettings();
  if (!settings.global.soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle'; // 三角波柔和不刺耳
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.16);
}
~~~~~

#### Acts 2: 更新 `src/utils/settings.ts` 支持声音配置

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
/**
 * 全局通用设置
 */
export interface GlobalSettings {
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
}
~~~~~
~~~~~typescript
/**
 * 全局通用设置
 */
export interface GlobalSettings {
  idleTimeout: number; // 闲置自动暂停计时时长 (秒)，0 表示关闭
  soundEnabled: boolean; // 是否启用答题音效反馈
}
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
  },
  star: {
~~~~~
~~~~~typescript
export const DEFAULT_SETTINGS: UserSettings = {
  global: {
    idleTimeout: 60,
    soundEnabled: true,
  },
  star: {
~~~~~

~~~~~act
patch_file
src/utils/settings.ts
~~~~~
~~~~~typescript
    // === 向下兼容迁移：解析老版本扁平结构 ===
    const migrated: UserSettings = {
      global: {
        idleTimeout: parsed.idleTimeout ?? DEFAULT_SETTINGS.global.idleTimeout,
      },
      star: {
~~~~~
~~~~~typescript
    // === 向下兼容迁移：解析老版本扁平结构 ===
    const migrated: UserSettings = {
      global: {
        idleTimeout: parsed.idleTimeout ?? DEFAULT_SETTINGS.global.idleTimeout,
        soundEnabled: parsed.soundEnabled ?? DEFAULT_SETTINGS.global.soundEnabled,
      },
      star: {
~~~~~

#### Acts 3: 在 `src/hooks/useTrainingSession.ts` 中集成答题音效与连胜计数

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import type { AdaptiveMode, StepGranularity } from '../utils/settings';
~~~~~
~~~~~typescript
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../utils/adaptiveEngine';
import type { AdaptiveMode, StepGranularity } from '../utils/settings';
import { playHitSound, playMissSound } from '../utils/sound';
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
~~~~~
~~~~~typescript
  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const streakRef = useRef<number>(0);
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
      const hit = isHit(hitResult);

      setUserAnswer(hitResult);
      setShowAnswer(true);
~~~~~
~~~~~typescript
      const hit = isHit(hitResult);

      if (hit) {
        streakRef.current += 1;
        playHitSound(streakRef.current);
      } else {
        streakRef.current = 0;
        playMissSound();
      }

      setUserAnswer(hitResult);
      setShowAnswer(true);
~~~~~

~~~~~act
patch_file
src/hooks/useTrainingSession.ts
~~~~~
~~~~~typescript
  const handleRestartSession = useCallback(() => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    sessionIdRef.current = `${domain}_${mode}_session_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, mode, generateQuestion]);
~~~~~
~~~~~typescript
  const handleRestartSession = useCallback(() => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    streakRef.current = 0;
    sessionIdRef.current = `${domain}_${mode}_session_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, mode, generateQuestion]);
~~~~~

#### Acts 4: 在全局设置 `src/components/GlobalSettingsModal.tsx` 中加入声音配置选项

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
import { Download, Sliders, Trash2, Upload, X } from 'lucide-preact';
import { useRef } from 'preact/hooks';
import { clearAllData, exportAllData, importAllData } from '../utils/db';
~~~~~
~~~~~typescript
import { Download, Sliders, ToggleLeft, ToggleRight, Trash2, Upload, Volume2, X } from 'lucide-preact';
import { useRef, useState } from 'preact/hooks';
import { clearAllData, exportAllData, importAllData } from '../utils/db';
import { loadSettings, saveSettings } from '../utils/settings';
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
export function GlobalSettingsModal({ onClose, onDataChanged }: GlobalSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
~~~~~
~~~~~typescript
export function GlobalSettingsModal({ onClose, onDataChanged }: GlobalSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState(loadSettings);

  const handleToggleSound = () => {
    const updated = {
      ...settings,
      global: {
        ...settings.global,
        soundEnabled: !settings.global.soundEnabled,
      },
    };
    saveSettings(updated);
    setSettings(updated);
    onDataChanged();
  };

  const handleExport = async () => {
~~~~~

~~~~~act
patch_file
src/components/GlobalSettingsModal.tsx
~~~~~
~~~~~typescript
        {/* 数据管理 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            数据备份与恢复
          </div>
~~~~~
~~~~~typescript
        {/* 常规偏好 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            系统偏好
          </div>
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-700">训练音效反馈</div>
                <div className="text-[11px] text-slate-400">答对清脆升调提示，答错低沉提示</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className="text-indigo-600 hover:opacity-80 transition-opacity"
            >
              {settings.global.soundEnabled ? (
                <ToggleRight className="w-8 h-8 fill-indigo-600 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>
        </div>

        {/* 数据管理 */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            数据备份与恢复
          </div>
~~~~~

#### Acts 5: 更新单元测试 `src/utils/__tests__/settings.test.ts` 并创建 `src/utils/__tests__/sound.test.ts`

~~~~~act
patch_file
src/utils/__tests__/settings.test.ts
~~~~~
~~~~~typescript
  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.star.autoNext).toBe(true);
    expect(settings.color.autoNext).toBe(true);
    expect(settings.relative_color.autoNext).toBe(true);
    expect(settings.star.gridSize).toBe(3);
    expect(settings.color.showToleranceBand).toBe(true);
  });
~~~~~
~~~~~typescript
  it('loadSettings - should return default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.global.soundEnabled).toBe(true);
    expect(settings.star.autoNext).toBe(true);
    expect(settings.color.autoNext).toBe(true);
    expect(settings.relative_color.autoNext).toBe(true);
    expect(settings.star.gridSize).toBe(3);
    expect(settings.color.showToleranceBand).toBe(true);
  });
~~~~~

~~~~~act
write_file
src/utils/__tests__/sound.test.ts
~~~~~
~~~~~typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSettings, saveSettings } from '../settings';
import { playHitSound, playMissSound } from '../sound';

describe('Web Audio Sound Manager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should not throw in non-browser or disabled environments', () => {
    // 默认启用下调用不抛异常
    expect(() => playHitSound(1)).not.toThrow();
    expect(() => playHitSound(5)).not.toThrow();
    expect(() => playMissSound()).not.toThrow();

    // 禁用声音
    const settings = loadSettings();
    settings.global.soundEnabled = false;
    saveSettings(settings);

    expect(() => playHitSound(1)).not.toThrow();
    expect(() => playMissSound()).not.toThrow();
  });
});
~~~~~

### 下一步建议
- 可以运行 `npm test` 验证单元测试通过性。
- 在真实浏览器体验连击时音调连续抬升（C6 -> C7）的 Aim Lab 击靶正反馈手感，如需微调基准频率或包络时长可直接在 `src/utils/sound.ts` 中微调。

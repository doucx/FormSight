我将把“补色残像调和”（`rel_hue_induction` / `HUE_INDUCTION`）从连续滑块调制模式重构为 4AFC（四选一）离散判别模式，使用 OKLab 色彩空间的正四面体等距对抗干扰算法生成 3 个干扰色，并参考主调色群提炼的视觉布局与快捷键交互。

## [WIP] feat(relative-color): 将补色残像调和重构为基于四面体算法的 4AFC 模式

### 用户需求
将相对色感训练中的“补色残像调和”（`HUE_INDUCTION`）模块从连续滑动条调节模式升级为 4 选 1（4AFC）辨识模式。题目生成时需利用 OKLab 空间的四面体算法（`generateTetrahedralDistractors`）生成 3 个等距对抗干扰色，UI 呈现与交互参考“主调色群提炼”的设计，支持数字键 1-4 快捷选择与即时视觉预览反馈。

### 评论
将补色残像调和调整为 4AFC 模式能够极大提升刷题的节奏感与训练效率，同时利用正四面体算法保证了 3 个干扰项在感知均匀色彩空间（OKLab）中具有严格一致的色差（$\Delta E$）对抗强度，避免了连续调节模式下多维滑块操作繁琐、判断标准模糊的问题。

### 目标
1. **题目生成**: 修改 `generateHueInductionQuestion`，利用 OKLab 理论补偿色作为中心，通过 `generateTetrahedralDistractors` 生成 3 个高质量正四面体等距干扰色，洗牌生成 4 个候选项及 `correctIndex`。
2. **视图组件**: 新建 `HueInductionView.tsx`，参考主调色群提炼的 UI 规范，呈现左右双环境背景对比、4 列候选色彩卡片、键盘 1-4 快捷响应以及即时判别反馈。
3. **卡片配置与画布联动**: 在 `RelativeColorCanvas.tsx`、`cards.ts` 与 `relativeColorPlugin.tsx` 中更新交互标签（`choice_nafc`）、说明文案与记录持久化格式。

### 基本原理
在 OKLab 色彩空间中，环境色的侧抑制诱导会导致感知色彩偏转。理论补偿目标色为 $Lab_{ideal}$。通过以 $Lab_{ideal}$ 为球心、当前难度对应的色差半径 $R(level)$ 为球半径，在三维 OKLab 球面上构造 3 个相互等距的正四面体对抗干扰色，使得 4 个选项在物理色彩空间中保持感知几何对称性。用户在右侧诱导背景下快速选择视觉感知与左侧基准一致的色块。

### 标签
#intent/build #flow/ready #priority/high #comp/runtime #concept/ui #scope/ux #ai/instruct #task/domain/relative-color #task/object/hue-induction-4afc #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 创建 4AFC 补色残像调和视图组件 `HueInductionView.tsx`

~~~~~act
write_file
src/components/relativeColor/HueInductionView.tsx
~~~~~
~~~~~tsx
import { Check, Sparkles, X } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../../utils/colorUtils';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../../utils/relativeColor';

interface HueInductionViewProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  onAnswer: (chosenColor: [number, number, number]) => void;
  disabled?: boolean;
  showCanvasHints?: boolean;
}

export function HueInductionView({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  showCanvasHints = true,
}: HueInductionViewProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const { bgLeft, bgRight, targetLeftCenter, idealRightCenter, options, correctIndex } = question;

  const bgLeftHex = hsvToHex(...(bgLeft ?? [0, 0, 90]));
  const bgRightHex = hsvToHex(...(bgRight ?? [0, 0, 20]));
  const centerLeftHex = hsvToHex(...(targetLeftCenter ?? [0, 0, 50]));
  const idealRightHex = hsvToHex(...(idealRightCenter ?? [0, 0, 50]));

  // 重置题目选择状态
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedIdx(null);
  }, [question.id]);

  // 键盘快捷键监听 1-4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || showAnswer || !options) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const idx = Number.parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < options.length) {
          setSelectedIdx(idx);
          onAnswer(options[idx]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, showAnswer, options, onAnswer]);

  const targetIdx = correctIndex ?? 0;
  const chosenIdx = selectedIdx;
  const activeColor =
    chosenIdx !== null && options ? options[chosenIdx] : idealRightCenter ?? [0, 0, 50];
  const activeRightHex = hsvToHex(...activeColor);

  return (
    <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          观察左侧基准中心色，在下方选出右侧达成「视觉感知一致」的补偿色 (键 1-4)
        </div>
      )}

      {/* 左右双环境视错觉对比区 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            左侧固定基准
          </span>
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
            style={{ backgroundColor: bgLeftHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all"
              style={{ backgroundColor: centerLeftHex }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
            右侧环境补偿区
          </span>
          <div
            className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
            style={{ backgroundColor: bgRightHex }}
          >
            <div
              className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
              style={{
                backgroundColor: showAnswer ? idealRightHex : chosenIdx !== null ? activeRightHex : 'transparent',
                border: chosenIdx === null && !showAnswer ? '2px dashed rgba(255,255,255,0.4)' : undefined,
              }}
            >
              {showAnswer && chosenIdx !== null && chosenIdx !== targetIdx && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2"
                  style={{ backgroundColor: hsvToHex(...(options?.[chosenIdx] ?? [0, 0, 0])) }}
                  title="下方为您的选择，上方为理论真理色"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4 选 1 候选色彩卡片区 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        {options?.map((opt, idx) => {
          const isSelected = chosenIdx === idx;
          const isTarget = idx === targetIdx;
          const hexVal = hsvToHex(...opt);
          const keyLabel = (idx + 1).toString();

          let borderStyle = 'border-slate-200 hover:border-indigo-300 hover:shadow-md bg-slate-50';
          if (showAnswer) {
            if (isTarget) {
              borderStyle = 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md';
            } else if (isSelected) {
              borderStyle = 'bg-rose-50/50 border-rose-400 shadow-sm';
            } else {
              borderStyle = 'bg-slate-50/60 border-slate-200 opacity-50';
            }
          } else if (isSelected) {
            borderStyle = 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-md';
          }

          return (
            <button
              key={`hue-induction-option-${idx}-${hexVal}`}
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => {
                setSelectedIdx(idx);
                onAnswer(opt);
              }}
              className={`group flex flex-col items-center gap-2.5 p-3 rounded-2xl border transition-all duration-200 text-left active:scale-[0.98] ${borderStyle}`}
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                  <span className="w-5 h-5 rounded-lg bg-slate-800 text-white flex items-center justify-center font-mono text-[11px]">
                    {keyLabel}
                  </span>
                  候选 {keyLabel}
                </span>
                {showAnswer && isTarget && (
                  <Check className="w-4 h-4 text-emerald-600 font-extrabold" />
                )}
              </div>

              <div className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60 p-1 flex items-center justify-center bg-white">
                <div
                  className="w-full h-full rounded-lg shadow-sm border border-slate-200/50"
                  style={{ backgroundColor: hexVal }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* 答案揭晓诊断条 */}
      {showAnswer && (
        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl ${
                userAnswer?.isHit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-800">
                {userAnswer?.isHit ? '精准补偿环境补色残像！' : '环境色诱导调和判断出现偏差'}
              </span>
              <span className="text-slate-400 ml-2">
                (正确项为: 候选 {targetIdx + 1}，色差 ΔE ={' '}
                <strong className="font-mono text-slate-700">{userAnswer?.deltaEError}</strong>)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
~~~~~

#### Acts 2: 更新 `src/utils/relativeColor/generators.ts` 生成 4AFC 选项

~~~~~act
patch_file
src/utils/relativeColor/generators.ts
~~~~~
~~~~~ts.old
/**
 * 生成补色残像与色相诱导补偿题目 (HUE_INDUCTION)
 */
export function generateHueInductionQuestion(level: number): RelativeColorQuestionData {
  const id = `ahi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);

  const bgLHue = Math.floor(Math.random() * 360);
  const bgLSat = Math.floor(Math.random() * 30) + 70;
  const bgLVal = Math.floor(Math.random() * 30) + 50;
  const bgLeft: [number, number, number] = [bgLHue, bgLSat, bgLVal];

  const bgRHue = (bgLHue + 180 + (Math.floor(Math.random() * 40) - 20)) % 360;
  const bgRSat = Math.floor(Math.random() * 25);
  const bgRVal = Math.floor(Math.random() * 30) + 50;
  const bgRight: [number, number, number] = [bgRHue, bgRSat, bgRVal];

  const centerHue = (bgLHue + 60 + Math.floor(Math.random() * 120)) % 360;
  const centerSat = Math.floor(Math.random() * 30) + 30;
  const centerVal = Math.floor(Math.random() * 30) + 45;
  const targetLeftCenter: [number, number, number] = [centerHue, centerSat, centerVal];

  const labBgL = hsvToOkLab(...bgLeft);
  const labCenterL = hsvToOkLab(...targetLeftCenter);
  const labBgR = hsvToOkLab(...bgRight);

  const idealLabR = calcCompensatedRightColor(labBgL, labCenterL, labBgR, 0.22);
  const idealRightCenter = okLabToHsv(idealLabR);

  return {
    id,
    mode: 'HUE_INDUCTION',
    difficultyLevel: clampedLevel,
    colorA: bgLeft,
    colorB: targetLeftCenter,
    colorC: bgRight,
    targetD: idealRightCenter,
    bgLeft,
    bgRight,
    targetLeftCenter,
    idealRightCenter,
    tolerance,
  };
}
~~~~~
~~~~~ts.new
/**
 * 生成补色残像与色相诱导补偿题目 (HUE_INDUCTION - 4AFC 模式)
 */
export function generateHueInductionQuestion(level: number): RelativeColorQuestionData {
  const id = `ahi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clampedLevel = Math.max(1, Math.min(35, level));
  const tolerance = getTargetDeltaEForLevel(clampedLevel);
  const distractorDeltaE = getDistractorDistanceForLevel(clampedLevel);

  const bgLHue = Math.floor(Math.random() * 360);
  const bgLSat = Math.floor(Math.random() * 30) + 70;
  const bgLVal = Math.floor(Math.random() * 30) + 50;
  const bgLeft: [number, number, number] = [bgLHue, bgLSat, bgLVal];

  const bgRHue = (bgLHue + 180 + (Math.floor(Math.random() * 40) - 20)) % 360;
  const bgRSat = Math.floor(Math.random() * 25);
  const bgRVal = Math.floor(Math.random() * 30) + 50;
  const bgRight: [number, number, number] = [bgRHue, bgRSat, bgRVal];

  const centerHue = (bgLHue + 60 + Math.floor(Math.random() * 120)) % 360;
  const centerSat = Math.floor(Math.random() * 30) + 30;
  const centerVal = Math.floor(Math.random() * 30) + 45;
  const targetLeftCenter: [number, number, number] = [centerHue, centerSat, centerVal];

  const labBgL = hsvToOkLab(...bgLeft);
  const labCenterL = hsvToOkLab(...targetLeftCenter);
  const labBgR = hsvToOkLab(...bgRight);

  const idealLabR = calcCompensatedRightColor(labBgL, labCenterL, labBgR, 0.22);
  const idealRightCenter = okLabToHsv(idealLabR);

  // 利用正四面体算法生成 3 个等距对抗干扰色
  const distractors = generateTetrahedralDistractors(idealLabR, distractorDeltaE);
  const rawOptions: [number, number, number][] = [idealRightCenter, ...distractors];
  const indexed = rawOptions.map((opt, index) => ({ opt, isTarget: index === 0 }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }

  const options = indexed.map((item) => item.opt);
  const correctIndex = indexed.findIndex((item) => item.isTarget);

  return {
    id,
    mode: 'HUE_INDUCTION',
    difficultyLevel: clampedLevel,
    colorA: bgLeft,
    colorB: targetLeftCenter,
    colorC: bgRight,
    targetD: idealRightCenter,
    bgLeft,
    bgRight,
    targetLeftCenter,
    idealRightCenter,
    options,
    correctIndex,
    tolerance,
  };
}
~~~~~

#### Acts 3: 更新 `RelativeColorCanvas.tsx` 支持 `HueInductionView`

~~~~~act
patch_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~tsx.old
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/relativeColor';
import { AlbersInductionView } from './relativeColor/AlbersInductionView';
import { Decontextual2AfcView } from './relativeColor/Decontextual2AfcView';
import { VectorShiftView } from './relativeColor/VectorShiftView';

interface RelativeColorCanvasProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  onAnswer: (userD: [number, number, number] | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
  showCanvasHints?: boolean;
}

export function RelativeColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: RelativeColorCanvasProps) {
  const { mode } = question;

  // === 1. VECTOR_SHIFT 模式状态 ===
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // === 2. 阿尔伯斯诱导补偿模式状态 (调节右侧中心色) ===
  const [userRightH, setUserRightH] = useState<number>(180);
  const [userRightS, setUserRightS] = useState<number>(50);
  const [userRightV, setUserRightV] = useState<number>(50);

  // === 3. DECONTEXTUAL_2AFC 模式状态 ===
  const [selected2AfcChoice, setSelected2AfcChoice] = useState<'A' | 'B' | null>(null);

  // 题目切换时重置状态
  useEffect(() => {
    if (question.id) {
      setSelectedIndex(0);
      setSelected2AfcChoice(null);

      if (question.targetLeftCenter) {
        setUserRightH(question.targetLeftCenter[0]);
        setUserRightS(question.targetLeftCenter[1]);
        setUserRightV(question.targetLeftCenter[2]);
      }
    }
  }, [question.id, question.targetLeftCenter]);

  // 2AFC 选择处理
  const handleSelect2Afc = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelected2AfcChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  // 提交调制结果
  const handleSubmitInduction = useCallback(() => {
    if (disabled || showAnswer) return;
    onAnswer([userRightH, userRightS, userRightV]);
  }, [disabled, showAnswer, userRightH, userRightS, userRightV, onAnswer]);

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (disabled || showAnswer) return;

      if (mode === 'DECONTEXTUAL_2AFC') {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelect2Afc('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelect2Afc('B');
        }
        return;
      }

      if (mode === 'VECTOR_SHIFT') {
        let targetIdx: number | null = null;
        if (['1', '2', '3', '4'].includes(e.key)) {
          targetIdx = Number.parseInt(e.key, 10) - 1;
        } else if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
          const num = Number.parseInt(e.code.replace(/\D/g, ''), 10);
          if (num >= 1 && num <= 4) {
            targetIdx = num - 1;
          }
        }

        if (targetIdx !== null && question.options && targetIdx < question.options.length) {
          e.preventDefault();
          setSelectedIndex(targetIdx);
          return;
        }

        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          const chosenColor = question.options?.[selectedIndex] ?? question.targetD;
          onAnswer(chosenColor);
        }
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleSubmitInduction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode,
    showAnswer,
    disabled,
    selectedIndex,
    question.options,
    question.targetD,
    onAnswer,
    handleSelect2Afc,
    handleSubmitInduction,
  ]);

  if (mode === 'DECONTEXTUAL_2AFC') {
    return (
      <Decontextual2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        selectedChoice={selected2AfcChoice}
        onSelectChoice={handleSelect2Afc}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'LIGHTNESS_INDUCTION' || mode === 'HUE_INDUCTION') {
    return (
      <AlbersInductionView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        userRightH={userRightH}
        userRightS={userRightS}
        userRightV={userRightV}
        onUserRightHChange={setUserRightH}
        onUserRightSChange={setUserRightS}
        onUserRightVChange={setUserRightV}
        onSubmit={handleSubmitInduction}
        disabled={disabled}
        hitMargin={hitMargin}
        showToleranceBand={showToleranceBand}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  return (
    <VectorShiftView
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      selectedIndex={selectedIndex}
      onSelectIndex={setSelectedIndex}
      onSubmit={() => {
        const chosenColor = question.options?.[selectedIndex] ?? question.targetD;
        onAnswer(chosenColor);
      }}
      disabled={disabled}
      hitMargin={hitMargin}
      showToleranceBand={showToleranceBand}
      showCanvasHints={showCanvasHints}
    />
  );
}
~~~~~
~~~~~tsx.new
import { useCallback, useEffect, useState } from 'preact/hooks';
import type { RelativeColorHitResult, RelativeColorQuestionData } from '../utils/relativeColor';
import { AlbersInductionView } from './relativeColor/AlbersInductionView';
import { Decontextual2AfcView } from './relativeColor/Decontextual2AfcView';
import { HueInductionView } from './relativeColor/HueInductionView';
import { VectorShiftView } from './relativeColor/VectorShiftView';

interface RelativeColorCanvasProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  onAnswer: (userD: [number, number, number] | 'A' | 'B') => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
  enableHoverColorPreview?: boolean;
  showCanvasHints?: boolean;
}

export function RelativeColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
  showCanvasHints = true,
}: RelativeColorCanvasProps) {
  const { mode } = question;

  // === 1. VECTOR_SHIFT 模式状态 ===
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // === 2. 阿尔伯斯明度诱导补偿模式状态 ===
  const [userRightH, setUserRightH] = useState<number>(180);
  const [userRightS, setUserRightS] = useState<number>(50);
  const [userRightV, setUserRightV] = useState<number>(50);

  // === 3. DECONTEXTUAL_2AFC 模式状态 ===
  const [selected2AfcChoice, setSelected2AfcChoice] = useState<'A' | 'B' | null>(null);

  // 题目切换时重置状态
  useEffect(() => {
    if (question.id) {
      setSelectedIndex(0);
      setSelected2AfcChoice(null);

      if (question.targetLeftCenter) {
        setUserRightH(question.targetLeftCenter[0]);
        setUserRightS(question.targetLeftCenter[1]);
        setUserRightV(question.targetLeftCenter[2]);
      }
    }
  }, [question.id, question.targetLeftCenter]);

  // 2AFC 选择处理
  const handleSelect2Afc = useCallback(
    (choice: 'A' | 'B') => {
      if (disabled || showAnswer) return;
      setSelected2AfcChoice(choice);
      onAnswer(choice);
    },
    [disabled, showAnswer, onAnswer],
  );

  // 提交明度补偿调制结果
  const handleSubmitLightnessInduction = useCallback(() => {
    if (disabled || showAnswer) return;
    onAnswer([userRightH, userRightS, userRightV]);
  }, [disabled, showAnswer, userRightH, userRightS, userRightV, onAnswer]);

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (disabled || showAnswer) return;

      if (mode === 'DECONTEXTUAL_2AFC') {
        if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelect2Afc('A');
        } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelect2Afc('B');
        }
        return;
      }

      if (mode === 'VECTOR_SHIFT') {
        let targetIdx: number | null = null;
        if (['1', '2', '3', '4'].includes(e.key)) {
          targetIdx = Number.parseInt(e.key, 10) - 1;
        } else if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
          const num = Number.parseInt(e.code.replace(/\D/g, ''), 10);
          if (num >= 1 && num <= 4) {
            targetIdx = num - 1;
          }
        }

        if (targetIdx !== null && question.options && targetIdx < question.options.length) {
          e.preventDefault();
          setSelectedIndex(targetIdx);
          return;
        }

        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          const chosenColor = question.options?.[selectedIndex] ?? question.targetD;
          onAnswer(chosenColor);
        }
        return;
      }

      if (mode === 'LIGHTNESS_INDUCTION') {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          handleSubmitLightnessInduction();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode,
    showAnswer,
    disabled,
    selectedIndex,
    question.options,
    question.targetD,
    onAnswer,
    handleSelect2Afc,
    handleSubmitLightnessInduction,
  ]);

  if (mode === 'DECONTEXTUAL_2AFC') {
    return (
      <Decontextual2AfcView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        selectedChoice={selected2AfcChoice}
        onSelectChoice={handleSelect2Afc}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'HUE_INDUCTION') {
    return (
      <HueInductionView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        onAnswer={(chosenColor) => onAnswer(chosenColor)}
        disabled={disabled}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  if (mode === 'LIGHTNESS_INDUCTION') {
    return (
      <AlbersInductionView
        question={question}
        showAnswer={showAnswer}
        userAnswer={userAnswer}
        userRightH={userRightH}
        userRightS={userRightS}
        userRightV={userRightV}
        onUserRightHChange={setUserRightH}
        onUserRightSChange={setUserRightS}
        onUserRightVChange={setUserRightV}
        onSubmit={handleSubmitLightnessInduction}
        disabled={disabled}
        hitMargin={hitMargin}
        showToleranceBand={showToleranceBand}
        showCanvasHints={showCanvasHints}
      />
    );
  }

  return (
    <VectorShiftView
      question={question}
      showAnswer={showAnswer}
      userAnswer={userAnswer}
      selectedIndex={selectedIndex}
      onSelectIndex={setSelectedIndex}
      onSubmit={() => {
        const chosenColor = question.options?.[selectedIndex] ?? question.targetD;
        onAnswer(chosenColor);
      }}
      disabled={disabled}
      hitMargin={hitMargin}
      showToleranceBand={showToleranceBand}
      showCanvasHints={showCanvasHints}
    />
  );
}
~~~~~

#### Acts 4: 更新卡片配置 `src/config/cards.ts` 与插件 `src/config/plugins/relativeColorPlugin.tsx`

~~~~~act
patch_file
src/config/cards.ts
~~~~~
~~~~~ts.old
  {
    id: 'rel_hue_induction',
    domain: 'relative_color',
    mode: 'HUE_INDUCTION',
    title: '补色残像调和',
    desc: '在强色相与饱和度背景下，逆向补偿色彩推移，训练环境光色感知调和力。',
    instruction: '调节右侧中心色彩，反向补偿背景诱导偏色，使左右达成感知一致',
    icon: Palette,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['continuous_slider'],
    },
    hasWeaknessAnalytics: false,
    settingSchemas: SLIDER_COMMON_SCHEMAS,
  },
~~~~~
~~~~~ts.new
  {
    id: 'rel_hue_induction',
    domain: 'relative_color',
    mode: 'HUE_INDUCTION',
    title: '补色残像调和',
    desc: '在强色相与饱和度背景下，四选一选出逆向补偿后的目标色，训练环境光色感知调和力。',
    instruction: '观察左侧强色相背景下的基准色，选出右侧达成感知一致的补偿色 (键 1-4)',
    icon: Palette,
    tags: {
      target: ['relative_color'],
      skill: ['illusion_invariance'],
      interaction: ['choice_nafc'],
    },
    hasWeaknessAnalytics: false,
  },
~~~~~

~~~~~act
patch_file
src/config/plugins/relativeColorPlugin.tsx
~~~~~
~~~~~tsx.old
    if (mode === 'LIGHTNESS_INDUCTION' || mode === 'HUE_INDUCTION') {
      return {
        mode,
        bgLeft: q.bgLeft,
        bgRight: q.bgRight,
        targetLeftCenter: q.targetLeftCenter,
        idealRightCenter: q.idealRightCenter,
        userRightColor: userVal,
        deltaEError: hitResult.deltaEError,
      };
    }
~~~~~
~~~~~tsx.new
    if (mode === 'HUE_INDUCTION') {
      return {
        mode,
        bgLeft: q.bgLeft,
        bgRight: q.bgRight,
        targetLeftCenter: q.targetLeftCenter,
        idealRightCenter: q.idealRightCenter,
        userRightColor: userVal,
        options: q.options,
        correctIndex: q.correctIndex,
        deltaEError: hitResult.deltaEError,
      };
    }
    if (mode === 'LIGHTNESS_INDUCTION') {
      return {
        mode,
        bgLeft: q.bgLeft,
        bgRight: q.bgRight,
        targetLeftCenter: q.targetLeftCenter,
        idealRightCenter: q.idealRightCenter,
        userRightColor: userVal,
        deltaEError: hitResult.deltaEError,
      };
    }
~~~~~

### 下一步建议
1. **运行静态检查与测试**: 执行 `npm run check` 与 `npm test`，确保 TypeScript 类型与现有相对色感单元测试完全通过。
2. **弱点分析扩展**: 考虑为 `HUE_INDUCTION` 添加专属弱点分析插件（例如统计在不同环境色相下的补偿辨识正确率）。

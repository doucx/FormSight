## [WIP] 修复键盘快捷键失效

经过排查，键盘 `1~4` 无法生效的原因主要有两点：

1. **键码兼容性问题**：原先仅严格匹配了 `e.code` 为 `'Digit1'`~`'Digit4'`，这会导致**小键盘数字键（`Numpad1`~`Numpad4`）**、部分非标准键盘布局、或输入法激活状态下无法被捕获。
2. **事件优先与键值判定**：应同时兼容 `e.key`（`'1'`~`'4'`）和 `e.code`，并在触发时阻止默认滚动行为（`e.preventDefault()`），同时确保闭包中正确引用最新的 `selectedIndex`。

以下是修复后的完整 `src/components/RelativeColorCanvas.tsx` 代码：

~~~~~act
write_file
src/components/RelativeColorCanvas.tsx
~~~~~
~~~~~tsx
import { ArrowRight } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../utils/relativeColorUtils';
import { HsvTrackSlider } from './HsvTrackSlider';

interface RelativeColorCanvasProps {
  question: RelativeColorQuestionData;
  showAnswer: boolean;
  userAnswer: RelativeColorHitResult | null;
  onAnswer: (userD: [number, number, number]) => void;
  disabled?: boolean;
  hitMargin?: number;
  showToleranceBand?: boolean;
}

export function RelativeColorCanvas({
  question,
  showAnswer,
  userAnswer,
  onAnswer,
  disabled = false,
  hitMargin = 12,
  showToleranceBand = true,
}: RelativeColorCanvasProps) {
  const { colorA, colorB, colorC, targetD, options, correctIndex, difficultyLevel } = question;

  // 默认选中第 0 个选项
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // 题目切换时重置为第 0 项
  useEffect(() => {
    setSelectedIndex(0);
  }, [question.id]);

  const activeColor = options?.[selectedIndex] ?? targetD;
  const userH = activeColor[0];
  const userS = activeColor[1];
  const userV = activeColor[2];

  const handleSubmit = () => {
    if (disabled || showAnswer) return;
    onAnswer(activeColor);
  };

  // 全键盘监听支持 (主键盘 1~4, 小键盘 1~4, 空格 Space 提交)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 若当前聚焦在输入框或弹窗表单中，则不拦截快捷键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (disabled || showAnswer) return;

      // 1. 判断是否按下 1 ~ 4 键 (同时兼容 e.key 与 e.code)
      let targetIdx: number | null = null;
      if (['1', '2', '3', '4'].includes(e.key)) {
        targetIdx = Number.parseInt(e.key, 10) - 1;
      } else if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
        const num = Number.parseInt(e.code.replace(/\D/g, ''), 10);
        if (num >= 1 && num <= 4) {
          targetIdx = num - 1;
        }
      }

      if (targetIdx !== null && options && targetIdx < options.length) {
        e.preventDefault();
        setSelectedIndex(targetIdx);
        return;
      }

      // 2. 空格 Space 提交
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        const chosenColor = options?.[selectedIndex] ?? targetD;
        onAnswer(chosenColor);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, disabled, selectedIndex, options, targetD, onAnswer]);

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);

  const hexSelectedD = hsvToHex(userH, userS, userV);
  const hexTargetD = hsvToHex(...targetD);

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(userH, 0, userV)}, ${hsvToHex(userH, 100, userV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(userH, 100, 100)})`;

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-6 mx-auto">
      {/* 1. 上方对比展示区 (A -> B  VS  C -> D) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* 基准推移组 (A -> B) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            基准推移 (A ➔ B)
          </div>
          <div className="flex items-center justify-center gap-3 w-full">
            <div
              className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexA }}
            />
            <ArrowRight className="w-5 h-5 text-indigo-400" />
            <div
              className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexB }}
            />
          </div>
        </div>

        {/* 目标推移组 (C -> D) */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            目标推移 (C ➔ D)
          </div>
          <div className="flex items-center justify-center gap-3 w-full">
            <div
              className="w-24 h-24 rounded-2xl border-2 border-white shadow-md"
              style={{ backgroundColor: hexC }}
            />
            <ArrowRight className="w-5 h-5 text-indigo-400" />
            <div
              className="w-24 h-24 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
              style={{ backgroundColor: hexSelectedD }}
            >
              {showAnswer && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/2 border-t border-white/40"
                  style={{ backgroundColor: hexTargetD }}
                  title="下方半区为真理目标色 D"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 中间 HSV 滑块轨道区 (锁定为观察仪表盘，跟随选中选项的值实时联动) */}
      <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="text-[11px] font-bold text-slate-400 mb-1">
          当前选中色彩的分色成分 (Locked Slider):
        </div>
        <HsvTrackSlider
          label="H"
          gradient={hueGradient}
          val={userH}
          max={360}
          unit="°"
          targetHSV={targetD}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetD[0]}
          userVal={userAnswer?.userD?.[0] ?? userH}
          isHit={userAnswer?.isHit}
          onValChange={() => {}}
          allUserHSV={[userH, userS, userV]}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
        <HsvTrackSlider
          label="S"
          gradient={satGradient}
          val={userS}
          max={100}
          unit="%"
          targetHSV={targetD}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetD[1]}
          userVal={userAnswer?.userD?.[1] ?? userS}
          isHit={userAnswer?.isHit}
          onValChange={() => {}}
          allUserHSV={[userH, userS, userV]}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
        <HsvTrackSlider
          label="V"
          gradient={valGradient}
          val={userV}
          max={100}
          unit="%"
          targetHSV={targetD}
          difficultyLevel={difficultyLevel}
          showAnswer={showAnswer}
          targetVal={targetD[2]}
          userVal={userAnswer?.userD?.[2] ?? userV}
          isHit={userAnswer?.isHit}
          onValChange={() => {}}
          allUserHSV={[userH, userS, userV]}
          disabled={true}
          hitMargin={hitMargin}
          showToleranceBand={showToleranceBand}
        />
      </div>

      {/* 3. 下方 4 个色彩候选选项卡片 (轻量级反馈) */}
      <div className="w-full space-y-2">
        <div className="text-xs font-bold text-slate-600 flex justify-between items-center px-1">
          <span>选择符合矢量推移规律的正确颜色 D：</span>
          <span className="text-[10px] text-slate-400 font-normal">支持键盘数字键 1~4 选择</span>
        </div>

        <div className="grid grid-cols-4 gap-3 w-full">
          {options?.map((opt, idx) => {
            const isSelected = selectedIndex === idx;
            const isTarget = idx === correctIndex;
            const hexVal = hsvToHex(...opt);

            // 揭晓答案后的轻量级样式
            let borderStyle = 'border-slate-200 hover:border-slate-300';
            let bgStyle = 'bg-white';
            let statusBadge = null;

            if (showAnswer) {
              if (isTarget) {
                // 正确选项：细绿框 + 极简绿点标记
                borderStyle = 'border-emerald-500 ring-1 ring-emerald-500/30';
                bgStyle = 'bg-emerald-50/20';
                statusBadge = (
                  <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                    正确
                  </span>
                );
              } else if (isSelected && !isTarget) {
                // 选错项：淡红框 + 选错标记
                borderStyle = 'border-rose-300';
                bgStyle = 'bg-rose-50/20';
                statusBadge = (
                  <span className="text-[10px] font-medium text-rose-500 bg-rose-100 px-1.5 py-0.5 rounded">
                    选择
                  </span>
                );
              } else {
                // 其他未选中的非目标项：轻微降低不透明度
                borderStyle = 'border-slate-100 opacity-40';
              }
            } else if (isSelected) {
              // 答题中选中项：Indigo 细边框 + 轻微阴影
              borderStyle = 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm';
              bgStyle = 'bg-indigo-50/10';
            }

            return (
              <button
                key={`${idx}-${hexVal}`}
                type="button"
                disabled={disabled || showAnswer}
                onClick={() => setSelectedIndex(idx)}
                className={`relative flex flex-col items-center gap-2 p-2.5 rounded-2xl border transition-all duration-150 active:scale-95 text-left cursor-pointer ${borderStyle} ${bgStyle}`}
              >
                {/* 顶部按键角标 & 揭晓状态 Badge */}
                <div className="w-full flex justify-between items-center px-0.5">
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isSelected && !showAnswer ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  {statusBadge}
                </div>

                {/* 色块卡片 */}
                <div
                  className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
                  style={{ backgroundColor: hexVal }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. 提交按钮 */}
      {!showAnswer && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
        >
          确认提交 (Space)
        </button>
      )}
    </div>
  );
}
~~~~~

### 修复要点：
1. **多键码联合检测**：现在支持 `e.key`（`'1'`, `'2'`, `'3'`, `'4'`）以及各种键盘环境下的 `e.code`（主键盘 `Digit1~4` 与小键盘 `Numpad1~4`），无需切换输入法或依赖特定物理键盘布局。
2. **闭包数据解绑与防冲突**：将 `selectedIndex` 加入依赖项并直接索引 `options?.[targetIdx]`，避免 Space 提交和数字键切换之间的竞态问题。

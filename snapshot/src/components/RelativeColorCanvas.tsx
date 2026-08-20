import { ArrowRight, Eye } from 'lucide-preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { hsvToHex } from '../utils/colorUtils';
import type {
  RelativeColorHitResult,
  RelativeColorQuestionData,
} from '../utils/relativeColorUtils';
import { HsvTrackSlider } from './HsvTrackSlider';
import { AnswerDiagnosticBar } from './common/AnswerDiagnosticBar';
import { Choice2AfcContainer } from './common/Choice2AfcContainer';

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

      // 明度/色相对抗模式下的 Space 确认
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

  // =========================================================================
  // 视图 A：DECONTEXTUAL_2AFC 环境穿透判别
  // =========================================================================
  if (mode === 'DECONTEXTUAL_2AFC') {
    const isAHit = question.largerPhysicalSide === 'A';
    const isBHit = question.largerPhysicalSide === 'B';

    const hexBgA = hsvToHex(...(question.bgLeft ?? [0, 0, 90]));
    const hexBgB = hsvToHex(...(question.bgRight ?? [0, 0, 10]));
    const hexCenterA = hsvToHex(...(question.centerColorA ?? [0, 0, 50]));
    const hexCenterB = hsvToHex(...(question.centerColorB ?? [0, 0, 50]));

    return (
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            穿透背景视错觉，判别哪一侧中心色块「客观物理明度更高」
          </div>
        )}

        <Choice2AfcContainer
          optionA={{
            key: 'A',
            title: '区域 A',
            isCorrect: isAHit,
            badge: isAHit
              ? `物理明度更高 (V: ${question.centerColorA?.[2]}%)`
              : `物理更暗 (V: ${question.centerColorA?.[2]}%)`,
            content: (
              <div
                className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
                style={{ backgroundColor: showAnswer ? '#808080' : hexBgA }}
              >
                <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterA }} />
              </div>
            ),
          }}
          optionB={{
            key: 'B',
            title: '区域 B',
            isCorrect: isBHit,
            badge: isBHit
              ? `物理明度更高 (V: ${question.centerColorB?.[2]}%)`
              : `物理更暗 (V: ${question.centerColorB?.[2]}%)`,
            content: (
              <div
                className="w-full h-44 rounded-2xl flex items-center justify-center border-2 border-white shadow-inner transition-colors duration-300"
                style={{ backgroundColor: showAnswer ? '#808080' : hexBgB }}
              >
                <div className="w-16 h-16 rounded-xl" style={{ backgroundColor: hexCenterB }} />
              </div>
            ),
          }}
          selectedChoice={selected2AfcChoice}
          showAnswer={showAnswer}
          disabled={disabled}
          onSelect={handleSelect2Afc}
        />

        {showAnswer && (
          <AnswerDiagnosticBar
            isHit={Boolean(userAnswer?.isHit)}
            successTitle="成功穿透背景视错觉！"
            failTitle="受背景诱导产生了认知偏差"
            subText={`(已统一切换至中性灰背景对比，物理明度差 ΔV = ${question.physicalValueDiff}%)`}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // 视图 B：阿尔伯斯诱导补偿模式 (LIGHTNESS_INDUCTION / HUE_INDUCTION)
  // =========================================================================
  if (mode === 'LIGHTNESS_INDUCTION' || mode === 'HUE_INDUCTION') {
    const isLightnessMode = mode === 'LIGHTNESS_INDUCTION';

    const bgLeftHex = hsvToHex(...(question.bgLeft ?? [0, 0, 100]));
    const bgRightHex = hsvToHex(...(question.bgRight ?? [0, 0, 0]));
    const centerLeftHex = hsvToHex(...(question.targetLeftCenter ?? [0, 0, 50]));

    const userRightHex = hsvToHex(userRightH, userRightS, userRightV);
    const idealRightHex = hsvToHex(...(question.idealRightCenter ?? question.targetD));

    const rightSatGradient = `linear-gradient(to right, ${hsvToHex(userRightH, 0, userRightV)}, ${hsvToHex(userRightH, 100, userRightV)})`;
    const rightValGradient = `linear-gradient(to right, #000000, ${hsvToHex(userRightH, 100, 100)})`;
    const hueGradient =
      'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';

    return (
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
        {showCanvasHints && (
          <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
            {isLightnessMode ? (
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-purple-600" />
            )}
            {isLightnessMode
              ? '调节右侧中心明度，使左右两块视觉感知看起来完全一致'
              : '调节右侧中心色彩，反向补偿背景诱导达成视觉感知一致'}
          </div>
        )}

        {/* 左右双背景对照视口 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {/* 左侧固定参考 */}
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

          {/* 右侧作答与调制 */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
              右侧调制区 (达成感知一致)
            </span>
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center border-4 border-white shadow-md relative"
              style={{ backgroundColor: bgRightHex }}
            >
              <div
                className="w-16 h-16 rounded-xl transition-all relative overflow-hidden"
                style={{ backgroundColor: userRightHex }}
              >
                {showAnswer && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1/2"
                    style={{ backgroundColor: idealRightHex }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 调节滑块面板 */}
        <div className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {!isLightnessMode && (
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={userRightH}
              max={360}
              unit="°"
              targetHSV={question.targetD}
              difficultyLevel={question.difficultyLevel}
              showAnswer={showAnswer}
              targetVal={question.idealRightCenter?.[0] ?? question.targetD[0]}
              userVal={userRightH}
              isHit={userAnswer?.isHit}
              onValChange={setUserRightH}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
          )}

          {!isLightnessMode && (
            <HsvTrackSlider
              label="S"
              gradient={rightSatGradient}
              val={userRightS}
              max={100}
              unit="%"
              targetHSV={question.targetD}
              difficultyLevel={question.difficultyLevel}
              showAnswer={showAnswer}
              targetVal={question.idealRightCenter?.[1] ?? question.targetD[1]}
              userVal={userRightS}
              isHit={userAnswer?.isHit}
              onValChange={setUserRightS}
              disabled={disabled}
              hitMargin={hitMargin}
              showToleranceBand={showToleranceBand}
            />
          )}

          <HsvTrackSlider
            label="V"
            gradient={rightValGradient}
            val={userRightV}
            max={100}
            unit="%"
            targetHSV={question.targetD}
            difficultyLevel={question.difficultyLevel}
            showAnswer={showAnswer}
            targetVal={question.idealRightCenter?.[2] ?? question.targetD[2]}
            userVal={userRightV}
            isHit={userAnswer?.isHit}
            onValChange={setUserRightV}
            disabled={disabled}
            hitMargin={hitMargin}
            showToleranceBand={showToleranceBand}
          />
        </div>

        {/* 答案揭晓诊断 */}
        {showAnswer && (
          <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-xl ${
                  userAnswer?.isHit
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {userAnswer?.isHit ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800">
                  {userAnswer?.isHit ? '精准补偿环境视错觉！' : '环境补偿偏转出现误差'}
                </span>
                <span className="text-slate-400 ml-2">
                  (色差 ΔE ={' '}
                  <strong className="font-mono text-slate-700">{userAnswer?.deltaEError}</strong>)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 确认提交按钮 */}
        {!showAnswer && (
          <button
            type="button"
            onClick={handleSubmitInduction}
            disabled={disabled}
            className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-2xl shadow-md shadow-indigo-200 transition-all"
          >
            确认提交 (Space)
          </button>
        )}
      </div>
    );
  }

  // =========================================================================
  // 视图 C：VECTOR_SHIFT 原有色彩矢量迁移
  // =========================================================================
  const { colorA, colorB, colorC, targetD, options, correctIndex, difficultyLevel } = question;
  const activeColor = options?.[selectedIndex] ?? targetD;
  const userH = activeColor[0];
  const userS = activeColor[1];
  const userV = activeColor[2];

  const handleSubmit = () => {
    if (disabled || showAnswer) return;
    onAnswer(activeColor);
  };

  const hexA = hsvToHex(...colorA);
  const hexB = hsvToHex(...colorB);
  const hexC = hsvToHex(...colorC);

  const hexSelectedD = hsvToHex(userH, userS, userV);
  const hexTargetD = hsvToHex(...targetD);

  const cH = colorC[0];
  const cS = colorC[1];
  const cV = colorC[2];

  const hueGradient =
    'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)';
  const satGradient = `linear-gradient(to right, ${hsvToHex(userH, 0, userV)}, ${hsvToHex(userH, 100, userV)})`;
  const valGradient = `linear-gradient(to right, #000000, ${hsvToHex(userH, 100, 100)})`;

  const cSatGradient = `linear-gradient(to right, ${hsvToHex(cH, 0, cV)}, ${hsvToHex(cH, 100, cV)})`;
  const cValGradient = `linear-gradient(to right, #000000, ${hsvToHex(cH, 100, 100)})`;

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center gap-5 mx-auto">
      {showCanvasHints && (
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200/60">
          观察上方 A➔B 色彩推移，在候选区选出符合 C➔D 的同向推移色
        </div>
      )}

      {/* 对比展示区 (2x2 网格: 上 A -> B，下 C -> D) */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full flex flex-col items-center gap-3">
        {/* 上排: 基准推移组 (A -> B) */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexA }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexB }}
          />
        </div>

        {/* 下排: 目标推移组 (C -> D) */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md"
            style={{ backgroundColor: hexC }}
          />
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <div
            className="w-20 h-20 rounded-2xl border-2 border-white shadow-md transition-all duration-150 relative overflow-hidden"
            style={{ backgroundColor: hexSelectedD }}
          >
            {showAnswer && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1/2"
                style={{ backgroundColor: hexTargetD }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 轨道面板 */}
      <div className="w-full space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 左侧：C 节点颜色 */}
          <div className="space-y-3 md:pr-4 md:border-r border-slate-200/60">
            <HsvTrackSlider
              label="H"
              gradient={hueGradient}
              val={cH}
              max={360}
              unit="°"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cH}
              userVal={cH}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
              onValChange={() => {}}
            />
            <HsvTrackSlider
              label="S"
              gradient={cSatGradient}
              val={cS}
              max={100}
              unit="%"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cS}
              userVal={cS}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
              onValChange={() => {}}
            />
            <HsvTrackSlider
              label="V"
              gradient={cValGradient}
              val={cV}
              max={100}
              unit="%"
              targetHSV={colorC}
              difficultyLevel={difficultyLevel}
              showAnswer={false}
              targetVal={cV}
              userVal={cV}
              allUserHSV={colorC}
              disabled={true}
              hitMargin={hitMargin}
              showToleranceBand={false}
              onValChange={() => {}}
            />
          </div>

          {/* 右侧：D 节点颜色 */}
          <div className="space-y-3">
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
        </div>
      </div>

      {/* 候选色块卡片区 */}
      <div className="grid grid-cols-4 gap-3 w-full">
        {options?.map((opt, idx) => {
          const isSelected = selectedIndex === idx;
          const isTarget = idx === correctIndex;
          const hexVal = hsvToHex(...opt);

          let borderStyle = 'border-slate-200 hover:border-slate-300';
          let ringStyle = '';

          if (showAnswer) {
            if (isTarget) {
              borderStyle = 'border-emerald-500';
              ringStyle = 'ring-2 ring-emerald-500/40';
            } else if (isSelected && !isTarget) {
              borderStyle = 'border-rose-400';
              ringStyle = 'ring-1 ring-rose-400/40 opacity-80';
            } else {
              borderStyle = 'border-slate-200 opacity-40';
            }
          } else if (isSelected) {
            borderStyle = 'border-indigo-600';
            ringStyle = 'ring-2 ring-indigo-500/30 shadow-sm';
          }

          return (
            <button
              key={`${idx}-${hexVal}`}
              type="button"
              disabled={disabled || showAnswer}
              onClick={() => setSelectedIndex(idx)}
              className={`p-1.5 rounded-2xl border bg-white transition-all duration-150 active:scale-95 cursor-pointer ${borderStyle} ${ringStyle}`}
            >
              <div
                className="w-full aspect-[4/3] rounded-xl shadow-inner border border-white/60"
                style={{ backgroundColor: hexVal }}
              />
            </button>
          );
        })}
      </div>

      {/* 确认提交按钮 */}
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

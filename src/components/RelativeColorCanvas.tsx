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

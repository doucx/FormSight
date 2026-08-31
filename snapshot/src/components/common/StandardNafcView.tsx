import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { useTranslation } from '../../core/i18n';
import { Button } from '../ui/button';
import { ChoiceNafcContainer, type ChoiceNafcOption } from './ChoiceNafcContainer';
import { QuestionCardShell } from './QuestionCardShell';

export interface StandardNafcViewProps<T = unknown> {
  questionId: string;
  hintText?: string;
  hintIcon?: (props: { className?: string }) => ComponentChildren;
  showCanvasHints?: boolean;
  maxWidth?: string;

  // 上方预览/题干插槽
  preview?: ComponentChildren;
  // 中间补充内容插槽 (如滑块或对比组件)
  middleContent?: ComponentChildren;

  // N-AFC 选项列表与网格配置
  options: ChoiceNafcOption<T>[];
  columns?: 2 | 3 | 4;
  gridClassName?: string;
  selectedIndex?: number | null;

  // 提交控制模式
  submitMode?: 'immediate' | 'button';
  submitButtonText?: string;
  showAnswer: boolean;
  disabled?: boolean;
  enableKeyboardShortcuts?: boolean;

  onSelectIndex?: (index: number, option: ChoiceNafcOption<T>) => void;
  onAnswer: (index: number, option: ChoiceNafcOption<T>) => void;
}

export function StandardNafcView<T = unknown>({
  questionId,
  hintText,
  hintIcon,
  showCanvasHints = true,
  maxWidth = 'max-w-2xl',
  preview,
  middleContent,
  options,
  columns = 4,
  gridClassName,
  selectedIndex: controlledSelectedIndex,
  submitMode = 'immediate',
  submitButtonText,
  showAnswer,
  disabled = false,
  enableKeyboardShortcuts = true,
  onSelectIndex,
  onAnswer,
}: StandardNafcViewProps<T>) {
  const { t } = useTranslation();
  const effectiveSubmitButtonText = submitButtonText || t('common.submitSpace');

  const [internalSelectedIdx, setInternalSelectedIdx] = useState<number | null>(
    submitMode === 'button' ? 0 : null,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection on question change
  useEffect(() => {
    setInternalSelectedIdx(submitMode === 'button' ? 0 : null);
  }, [questionId, submitMode]);

  const activeIndex =
    controlledSelectedIndex !== undefined ? controlledSelectedIndex : internalSelectedIdx;

  const handleSelectOption = useCallback(
    (index: number, option: ChoiceNafcOption<T>) => {
      if (disabled || showAnswer) return;
      setInternalSelectedIdx(index);
      onSelectIndex?.(index, option);

      if (submitMode === 'immediate') {
        onAnswer(index, option);
      }
    },
    [disabled, showAnswer, onSelectIndex, submitMode, onAnswer],
  );

  const handleExplicitSubmit = useCallback(() => {
    if (disabled || showAnswer || !options.length) return;
    const targetIdx = activeIndex ?? 0;
    const targetOpt = options[targetIdx] ?? options[0];
    onAnswer(targetIdx, targetOpt);
  }, [disabled, showAnswer, options, activeIndex, onAnswer]);

  // 支持键盘 Space 提交（在 button 模式下）
  useEffect(() => {
    if (submitMode !== 'button' || !enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (disabled || showAnswer) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleExplicitSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitMode, enableKeyboardShortcuts, disabled, showAnswer, handleExplicitSubmit]);

  return (
    <QuestionCardShell
      hintText={hintText}
      hintIcon={hintIcon}
      showCanvasHints={showCanvasHints}
      maxWidth={maxWidth}
    >
      {preview}
      {middleContent}

      <ChoiceNafcContainer<T>
        options={options}
        selectedIndex={activeIndex}
        showAnswer={showAnswer}
        disabled={disabled}
        columns={columns}
        gridClassName={gridClassName}
        enableKeyboardShortcuts={enableKeyboardShortcuts}
        onSelect={handleSelectOption}
      />

      {submitMode === 'button' && !showAnswer && (
        <Button
          variant="default"
          onClick={handleExplicitSubmit}
          disabled={disabled}
          className="w-full py-3 h-auto rounded-2xl"
        >
          {effectiveSubmitButtonText}
        </Button>
      )}
    </QuestionCardShell>
  );
}

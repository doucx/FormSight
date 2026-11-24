import { useEffect } from 'preact/hooks';
import { mapKeyToAction } from './sessionDecisions';

export interface UseTrainingKeybindingsOptions {
  isIdle: boolean;
  showAnswer: boolean;
  isFinished: boolean;
  disabled?: boolean;
  isSandbox?: boolean;
  onResumeFromIdle: () => void;
  onNextQuestion: () => void;
  onRequestFinish: () => void;
  onRegenerate?: () => void;
  onAdjustLevel?: (delta: number) => void;
  onToggleInspector?: () => void;
}

export function useTrainingKeybindings({
  isIdle,
  showAnswer,
  isFinished,
  disabled = false,
  isSandbox = false,
  onResumeFromIdle,
  onNextQuestion,
  onRequestFinish,
  onRegenerate,
  onAdjustLevel,
  onToggleInspector,
}: UseTrainingKeybindingsOptions) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (isIdle) {
        e.preventDefault();
        onResumeFromIdle();
        return;
      }

      const action = mapKeyToAction({
        key: e.key,
        code: e.code,
        isIdle,
        showAnswer,
        isFinished,
        isSandbox,
      });

      switch (action) {
        case 'resume':
          e.preventDefault();
          onResumeFromIdle();
          break;
        case 'regenerate':
          e.preventDefault();
          onRegenerate?.();
          break;
        case 'adjust-down':
          e.preventDefault();
          onAdjustLevel?.(-1);
          break;
        case 'adjust-up':
          e.preventDefault();
          onAdjustLevel?.(1);
          break;
        case 'inspector':
          e.preventDefault();
          onToggleInspector?.();
          break;
        case 'next':
          e.preventDefault();
          onNextQuestion();
          break;
        case 'finish':
          e.preventDefault();
          onRequestFinish();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    disabled,
    isIdle,
    showAnswer,
    isFinished,
    isSandbox,
    onResumeFromIdle,
    onNextQuestion,
    onRequestFinish,
    onRegenerate,
    onAdjustLevel,
    onToggleInspector,
  ]);
}

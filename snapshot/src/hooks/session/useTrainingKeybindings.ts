import { useEffect } from 'preact/hooks';

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

      // 沙盒专属快捷键 (R 换题, [ / ] 调级, I 检查器)
      if (isSandbox) {
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          onRegenerate?.();
          return;
        }
        if (e.key === '[') {
          e.preventDefault();
          onAdjustLevel?.(-1);
          return;
        }
        if (e.key === ']') {
          e.preventDefault();
          onAdjustLevel?.(1);
          return;
        }
        if (e.key === 'i' || e.key === 'I') {
          e.preventDefault();
          onToggleInspector?.();
          return;
        }
      }

      if (e.code === 'Space' || e.key === ' ') {
        if (showAnswer) {
          e.preventDefault();
          if (!isFinished) {
            onNextQuestion();
          } else {
            onRequestFinish();
          }
        }
      } else if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        onRequestFinish();
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

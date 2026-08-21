import { useEffect } from 'preact/hooks';

export interface UseTrainingKeybindingsOptions {
  isIdle: boolean;
  showAnswer: boolean;
  isFinished: boolean;
  disabled?: boolean;
  onResumeFromIdle: () => void;
  onNextQuestion: () => void;
  onRequestFinish: () => void;
}

export function useTrainingKeybindings({
  isIdle,
  showAnswer,
  isFinished,
  disabled = false,
  onResumeFromIdle,
  onNextQuestion,
  onRequestFinish,
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
  }, [disabled, isIdle, showAnswer, isFinished, onResumeFromIdle, onNextQuestion, onRequestFinish]);
}

import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Choice2AfcContainer, type Choice2AfcOption } from './Choice2AfcContainer';
import { QuestionCardShell } from './QuestionCardShell';

export interface Standard2AfcViewProps {
  questionId: string;
  hintText?: string;
  hintIcon?: (props: { className?: string }) => ComponentChildren;
  showCanvasHints?: boolean;
  maxWidth?: string;
  prompt?: ComponentChildren;
  optionA: Omit<Choice2AfcOption, 'key'>;
  optionB: Omit<Choice2AfcOption, 'key'>;
  showAnswer: boolean;
  disabled?: boolean;
  onAnswer: (choice: 'A' | 'B') => void;
  enableKeyboardShortcuts?: boolean;
}

export function Standard2AfcView({
  questionId,
  hintText,
  hintIcon,
  showCanvasHints = true,
  maxWidth = 'max-w-2xl',
  prompt,
  optionA,
  optionB,
  showAnswer,
  disabled = false,
  onAnswer,
  enableKeyboardShortcuts = true,
}: Standard2AfcViewProps) {
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when question changes
  useEffect(() => {
    setSelectedChoice(null);
  }, [questionId]);

  const handleSelect = (choice: 'A' | 'B') => {
    if (disabled || showAnswer) return;
    setSelectedChoice(choice);
    onAnswer(choice);
  };

  return (
    <QuestionCardShell
      hintText={hintText}
      hintIcon={hintIcon}
      showCanvasHints={showCanvasHints}
      maxWidth={maxWidth}
    >
      {prompt}
      <Choice2AfcContainer
        optionA={{ ...optionA, key: 'A' }}
        optionB={{ ...optionB, key: 'B' }}
        selectedChoice={selectedChoice}
        showAnswer={showAnswer}
        disabled={disabled}
        enableKeyboardShortcuts={enableKeyboardShortcuts}
        onSelect={handleSelect}
      />
    </QuestionCardShell>
  );
}
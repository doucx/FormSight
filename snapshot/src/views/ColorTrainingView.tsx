import { useCallback, useRef } from 'preact/hooks';
import { ColorCanvas } from '../components/ColorCanvas';
import { TrainingShell } from '../components/training/TrainingShell';
import { useTrainingSession } from '../hooks/useTrainingSession';
import {
  type ColorHitResult,
  type ColorMode,
  type ColorQuestionData,
  type ColorQuestionGenerateOptions,
  checkColorHit,
  generateColorQuestion,
} from '../utils/colorUtils';
import { saveColorSession, saveColorTrialRecord } from '../utils/db';
import type { ColorSenseSettings } from '../utils/settings';

interface ColorTrainingViewProps {
  mode: ColorMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: ColorSenseSettings;
  onExit: () => void;
}

export function ColorTrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: ColorTrainingViewProps) {
  const targetSectorsRef = useRef<number[]>(settings.manualTargetSectors || []);

  const getColorGenerateOptions = useCallback((): ColorQuestionGenerateOptions => {
    return {
      targetingMode: settings.targetingMode,
      targetSectors:
        settings.targetingMode === 'manual'
          ? settings.manualTargetSectors
          : targetSectorsRef.current,
    };
  }, [settings]);

  const session = useTrainingSession<
    ColorQuestionData,
    ColorHitResult,
    number | [number, number, number]
  >({
    domain: 'color',
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => generateColorQuestion(mode, level, getColorGenerateOptions()),
    evaluateAnswer: (userVal, q) => checkColorHit(mode, userVal, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      const computedUserHSV: [number, number, number] =
        mode === 'ALL' && Array.isArray(userVal)
          ? userVal
          : [
              mode === 'H' ? (userVal as number) : q.targetH,
              mode === 'S' ? (userVal as number) : q.targetS,
              mode === 'V' ? (userVal as number) : q.targetV,
            ];

      await saveColorTrialRecord({
        id: `crec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        domain: 'color',
        mode,
        timestamp: Date.now(),
        difficultyLevel: q.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
        details: {
          targetHSV: [q.targetH, q.targetS, q.targetV],
          userHSV: computedUserHSV,
          errorValue: hitResult.errorValue,
        },
      });
    },
    saveSession: async ({
      sessionId,
      totalTrials: t,
      hitTrials: h,
      ended,
      startTimestamp,
      endLevel,
    }) => {
      await saveColorSession({
        id: sessionId,
        domain: 'color',
        mode,
        type: sessionType,
        startTimestamp,
        endTimestamp: ended ? Date.now() : undefined,
        totalTrials: t,
        hitTrials: h,
        startLevel: initialLevel,
        endLevel,
      });
    },
    onExit,
  });

  const modeBadge =
    mode === 'H' ? '色相' : mode === 'V' ? '明度' : mode === 'S' ? '饱和度' : '综合拾色';

  return (
    <TrainingShell
      title="色感训练"
      badge={modeBadge}
      sessionType={sessionType}
      currentLevel={session.question.difficultyLevel}
      isTargeting={settings.targetingMode === 'manual' && mode === 'H'}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled }) => (
        <ColorCanvas
          question={session.question}
          showAnswer={session.showAnswer}
          userAnswer={session.userAnswer}
          onAnswer={session.handleAnswer}
          disabled={disabled}
          hitMargin={settings.sliderHitMargin ?? 12}
          showToleranceBand={settings.showToleranceBand ?? true}
          enableHoverColorPreview={settings.enableHoverColorPreview ?? true}
        />
      )}
    </TrainingShell>
  );
}

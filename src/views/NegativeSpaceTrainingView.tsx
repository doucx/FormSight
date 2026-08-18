import { NegativeSpaceCanvas } from '../components/NegativeSpaceCanvas';
import { TrainingShell } from '../components/training/TrainingShell';
import { useTrainingSession } from '../hooks/useTrainingSession';
import { saveSession, saveTrialRecord } from '../utils/db';
import {
  type NegativeSpaceHitResult,
  type NegativeSpaceMode,
  type NegativeSpaceQuestionData,
  checkNegativeSpaceHit,
  generateNegativeSpaceQuestion,
} from '../utils/negativeSpaceUtils';
import type { NegativeSpaceSettings } from '../utils/settings';

interface NegativeSpaceTrainingViewProps {
  mode: NegativeSpaceMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: NegativeSpaceSettings;
  onExit: () => void;
}

export function NegativeSpaceTrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: NegativeSpaceTrainingViewProps) {
  const session = useTrainingSession<NegativeSpaceQuestionData, NegativeSpaceHitResult, number>({
    domain: 'negative_space',
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => generateNegativeSpaceQuestion(mode, level),
    evaluateAnswer: (userRatio, q) => checkNegativeSpaceHit(userRatio, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      await saveTrialRecord({
        id: `nsrec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        domain: 'negative_space',
        mode,
        timestamp: Date.now(),
        difficultyLevel: q.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
        details: {
          targetNegativeRatio: q.targetNegativeRatio,
          userRatio: userVal,
          errorValue: hitResult.errorValue,
          positiveArea: q.positiveArea,
          negativeArea: q.negativeArea,
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
      await saveSession({
        id: sessionId,
        domain: 'negative_space',
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

  return (
    <TrainingShell
      title="正负形感知"
      badge="负形占比估算"
      sessionType={sessionType}
      currentLevel={session.question.difficultyLevel}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled }) => (
        <NegativeSpaceCanvas
          question={session.question}
          showAnswer={session.showAnswer}
          userAnswer={session.userAnswer}
          onAnswer={session.handleAnswer}
          disabled={disabled}
          hitMargin={settings.sliderHitMargin ?? 12}
          showToleranceBand={settings.showToleranceBand ?? true}
        />
      )}
    </TrainingShell>
  );
}

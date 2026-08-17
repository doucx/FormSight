import { RelativeColorCanvas } from '../components/RelativeColorCanvas';
import { TrainingShell } from '../components/training/TrainingShell';
import { useTrainingSession } from '../hooks/useTrainingSession';
import { saveSession, saveTrialRecord } from '../utils/db';
import {
  type RelativeColorHitResult,
  type RelativeColorMode,
  type RelativeColorQuestionData,
  checkRelativeColorHit,
  generateRelativeColorQuestion,
} from '../utils/relativeColorUtils';
import type { RelativeColorSettings } from '../utils/settings';

interface RelativeColorTrainingViewProps {
  mode: RelativeColorMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: RelativeColorSettings;
  onExit: () => void;
}

export function RelativeColorTrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: RelativeColorTrainingViewProps) {
  const session = useTrainingSession<
    RelativeColorQuestionData,
    RelativeColorHitResult,
    [number, number, number]
  >({
    domain: 'relative_color',
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => generateRelativeColorQuestion(mode, level),
    evaluateAnswer: (userD, q) => checkRelativeColorHit(mode, userD, q),
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      await saveTrialRecord({
        id: `rcrec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        domain: 'relative_color',
        mode,
        timestamp: Date.now(),
        difficultyLevel: q.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
        details: {
          colorA: q.colorA,
          colorB: q.colorB,
          colorC: q.colorC,
          targetD: q.targetD,
          userD: userVal,
          deltaEError: hitResult.deltaEError,
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
        domain: 'relative_color',
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
      title="相对色感"
      badge="色彩矢量迁移"
      sessionType={sessionType}
      currentLevel={session.question.difficultyLevel}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled }) => (
        <RelativeColorCanvas
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
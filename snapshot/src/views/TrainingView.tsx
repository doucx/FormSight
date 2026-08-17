import { useCallback, useRef } from 'preact/hooks';
import { StarCanvas } from '../components/StarCanvas';
import { TrainingShell } from '../components/training/TrainingShell';
import { useTrainingSession } from '../hooks/useTrainingSession';
import type { HitResult, Point, QuestionData, TrainingMode } from '../types';
import { saveSession, saveTrialRecord } from '../utils/db';
import { type QuestionGenerateOptions, checkHit, generateQuestion } from '../utils/geometry';
import type { StarSettings } from '../utils/settings';

interface TrainingViewProps {
  mode: TrainingMode;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: StarSettings;
  onExit: () => void;
}

export function TrainingView({
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: TrainingViewProps) {
  const targetSectorsRef = useRef<number[]>(settings.manualTargetSectors || []);

  const getGenerateOptions = useCallback((): QuestionGenerateOptions => {
    return {
      targetingMode: settings.targetingMode,
      targetSectors:
        settings.targetingMode === 'manual'
          ? settings.manualTargetSectors
          : targetSectorsRef.current,
      gridSize: settings.gridSize,
    };
  }, [settings]);

  const session = useTrainingSession<
    QuestionData,
    HitResult,
    { clickPoint: Point; hitResult: HitResult }
  >({
    domain: 'star',
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => generateQuestion(mode, level, getGenerateOptions()),
    evaluateAnswer: (userVal) => userVal.hitResult,
    isHit: (hitResult) => hitResult.isHit,
    getQuestionLevel: (q) => q.difficultyLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs }) => {
      await saveTrialRecord({
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        domain: 'star',
        mode,
        timestamp: Date.now(),
        difficultyLevel: q.difficultyLevel,
        isHit: hitResult.isHit,
        responseTimeMs,
        details: {
          anchorA: [q.anchorA.x, q.anchorA.y],
          anchorC: q.anchorC ? [q.anchorC.x, q.anchorC.y] : undefined,
          targetB: [q.targetB.x, q.targetB.y],
          userClick: [hitResult.nearestGridPoint.x, hitResult.nearestGridPoint.y],
          angleDegree: q.angleDegree,
          distanceRatio: q.distanceRatio,
          errorPixelDistance: hitResult.errorDistance,
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
        domain: 'star',
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

  const canvasUserAnswer = session.userAnswer
    ? { clickPoint: session.userAnswer.nearestGridPoint, hitResult: session.userAnswer }
    : null;

  return (
    <TrainingShell
      title="寻星练习"
      badge={mode}
      sessionType={sessionType}
      currentLevel={session.question.difficultyLevel}
      isTargeting={settings.targetingMode === 'manual'}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled }) => (
        <StarCanvas
          question={session.question}
          showAnswer={session.showAnswer}
          userAnswer={canvasUserAnswer}
          onAnswer={(clickPoint) => {
            const hitRes = checkHit(
              clickPoint,
              session.question.targetB,
              session.question.distractorPoints,
            );
            if (hitRes.isWithinRange) {
              session.handleAnswer({ clickPoint, hitResult: hitRes });
            }
          }}
          disabled={disabled}
        />
      )}
    </TrainingShell>
  );
}

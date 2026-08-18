import { TrainingShell } from '../components/training/TrainingShell';
import type { TrainingPlugin } from '../config/trainingPlugins';
import { useTrainingSession } from '../hooks/useTrainingSession';
import { saveSession, saveTrialRecord } from '../utils/db';
import type { BaseModuleSettings } from '../utils/settings';

interface GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings extends BaseModuleSettings> {
  plugin: TrainingPlugin<TQuestion, THitResult, TAnswerVal, TSettings>;
  mode: string;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: TSettings;
  onExit: () => void;
}

export function GenericTrainingView<TQuestion, THitResult, TAnswerVal, TSettings extends BaseModuleSettings>({
  plugin,
  mode,
  sessionType,
  initialLevel,
  settings,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain: plugin.domain,
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    generateQuestion: (level) => plugin.generateQuestion(mode, level, settings),
    evaluateAnswer: (userVal, q) => plugin.evaluateAnswer(userVal, q, mode),
    isHit: plugin.isHit,
    getQuestionLevel: plugin.getQuestionLevel,
    saveTrialRecord: async ({ sessionId, question: q, hitResult, responseTimeMs, userVal }) => {
      await saveTrialRecord({
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        domain: plugin.domain,
        mode,
        timestamp: Date.now(),
        difficultyLevel: plugin.getQuestionLevel(q),
        isHit: plugin.isHit(hitResult),
        responseTimeMs,
        details: plugin.extractRecordDetails(q, hitResult, userVal, mode),
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
        domain: plugin.domain,
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

  const isTargeting = plugin.isTargeting ? plugin.isTargeting(mode, settings) : false;

  return (
    <TrainingShell
      title={plugin.title}
      badge={plugin.getModeBadge(mode)}
      sessionType={sessionType}
      currentLevel={session.question ? plugin.getQuestionLevel(session.question) : initialLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      onExit={onExit}
    >
      {({ disabled, isIdle }) =>
        plugin.renderCanvas({
          question: session.question,
          showAnswer: session.showAnswer,
          userAnswer: session.userAnswer,
          onAnswer: session.handleAnswer,
          disabled,
          isIdle,
          settings,
        })
      }
    </TrainingShell>
  );
}
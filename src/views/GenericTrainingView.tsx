import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { TrainingShell } from '../components/training/TrainingShell';
import type { TrainingPlugin } from '../config/trainingPlugins';
import { useTrainingSession } from '../hooks/useTrainingSession';
import type { CardDefinition } from '../types/card';
import { saveSession, saveTrialRecord } from '../utils/db/index';
import type { BaseModuleSettings, GlobalSettings } from '../utils/settings';

export interface GenericTrainingViewProps<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
> {
  card: CardDefinition;
  plugin: TrainingPlugin<TQuestion, THitResult, TAnswerVal, TSettings>;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: TSettings;
  globalSettings?: GlobalSettings;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  showExitButton?: boolean;
  onExit: () => void;
}

export function GenericTrainingView<
  TQuestion = unknown,
  THitResult = unknown,
  TAnswerVal = unknown,
  TSettings extends BaseModuleSettings = BaseModuleSettings,
>({
  card,
  plugin,
  sessionType,
  initialLevel,
  settings,
  globalSettings,
  targetLimitTrials,
  onTargetLimitReached,
  showExitButton = true,
  onExit,
}: GenericTrainingViewProps<TQuestion, THitResult, TAnswerVal, TSettings>) {
  const domain = card.domain;
  const mode = card.mode;

  const session = useTrainingSession<TQuestion, THitResult, TAnswerVal>({
    domain,
    mode,
    sessionType,
    initialLevel,
    autoNext: settings.autoNext,
    autoNextDelay: settings.autoNextDelay,
    stepGranularity: settings.stepGranularity,
    adaptiveMode: settings.adaptiveMode,
    targetAccuracy: settings.targetAccuracy,
    blockSize: settings.blockSize,
    targetLimitTrials,
    onTargetLimitReached,
    generateQuestion: (level) => plugin.generateQuestion(mode, level, settings),
    evaluateAnswer: (userVal, q) => plugin.evaluateAnswer(userVal, q, mode),
    isHit: (hitResult) => plugin.isHit(hitResult),
    saveTrialRecord: async ({
      sessionId,
      question: q,
      hitResult,
      responseTimeMs,
      userVal,
      currentProfileLevel,
    }) => {
      await saveTrialRecord(
        {
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sessionId,
          cardId: card.id,
          domain,
          mode,
          timestamp: Date.now(),
          difficultyLevel: plugin.getQuestionLevel(q),
          isHit: plugin.isHit(hitResult),
          responseTimeMs,
          details: plugin.extractRecordDetails(q, hitResult, userVal, mode),
        },
        currentProfileLevel,
      );
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
        cardId: card.id,
        domain,
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
      card={card}
      sessionType={sessionType}
      currentLevel={session.question ? plugin.getQuestionLevel(session.question) : initialLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      showExitButton={showExitButton}
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
          settings: {
            ...settings,
            sliderHitMargin:
              globalSettings?.sliderHitMargin ??
              (settings.sliderHitMargin as number | undefined) ??
              12,
            showCanvasHints:
              globalSettings?.showCanvasHints ??
              (settings.showCanvasHints as boolean | undefined) ??
              true,
          },
        })
      }
    </TrainingShell>
  );
}

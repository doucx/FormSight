import type { ComponentChildren } from 'preact';
import { TrainingShell } from '../components/training/TrainingShell';
import type { AnyTrainingPlugin } from '../config/trainingPlugins';
import { useTrainingSession } from '../hooks/useTrainingSession';
import type { CardDefinition } from '../types/card';
import { saveSession, saveTrialRecord } from '../utils/db';
import type { BaseModuleSettings, GlobalSettings } from '../utils/settings';

interface GenericTrainingPluginAdapter {
  isTargeting?: (mode: string, settings: unknown) => boolean;
  generateQuestion: (mode: string, level: number, settings: unknown) => unknown;
  evaluateAnswer: (userVal: unknown, question: unknown, mode: string) => unknown;
  isHit: (hitResult: unknown) => boolean;
  getQuestionLevel: (question: unknown) => number;
  extractRecordDetails: (
    question: unknown,
    hitResult: unknown,
    userVal: unknown,
    mode: string,
  ) => Record<string, unknown>;
  renderCanvas: (props: {
    question: unknown;
    showAnswer: boolean;
    userAnswer: unknown;
    onAnswer: (val: unknown) => void;
    disabled: boolean;
    isIdle: boolean;
    settings: unknown;
  }) => ComponentChildren;
}

import type { SessionHistoryItem } from '../components/SessionSummaryModal';

export interface GenericTrainingViewProps {
  card: CardDefinition;
  plugin: AnyTrainingPlugin;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  settings: BaseModuleSettings;
  globalSettings?: GlobalSettings;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  showExitButton?: boolean;
  onExit: () => void;
}

export function GenericTrainingView({
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
}: GenericTrainingViewProps) {
  const domain = card.domain;
  const mode = card.mode;
  const adapter = plugin as unknown as GenericTrainingPluginAdapter;

  const session = useTrainingSession<unknown, unknown, unknown>({
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
    generateQuestion: (level) => adapter.generateQuestion(mode, level, settings),
    evaluateAnswer: (userVal, q) => adapter.evaluateAnswer(userVal, q, mode),
    isHit: adapter.isHit,
    getQuestionLevel: adapter.getQuestionLevel,
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
          difficultyLevel: adapter.getQuestionLevel(q),
          isHit: adapter.isHit(hitResult),
          responseTimeMs,
          details: adapter.extractRecordDetails(q, hitResult, userVal, mode),
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

  const isTargeting = adapter.isTargeting ? adapter.isTargeting(mode, settings) : false;

  return (
    <TrainingShell
      card={card}
      sessionType={sessionType}
      currentLevel={session.question ? adapter.getQuestionLevel(session.question) : initialLevel}
      isTargeting={isTargeting}
      autoNext={settings.autoNext}
      session={session}
      showExitButton={showExitButton}
      onExit={onExit}
    >
      {({ disabled, isIdle }) =>
        adapter.renderCanvas({
          question: session.question,
          showAnswer: session.showAnswer,
          userAnswer: session.userAnswer,
          onAnswer: session.handleAnswer,
          disabled,
          isIdle,
          settings: {
            ...settings,
            sliderHitMargin:
              globalSettings?.sliderHitMargin ?? (settings.sliderHitMargin as number) ?? 12,
            showCanvasHints:
              globalSettings?.showCanvasHints ?? (settings.showCanvasHints as boolean) ?? true,
          },
        })
      }
    </TrainingShell>
  );
}

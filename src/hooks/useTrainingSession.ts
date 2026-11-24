import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/modals/SessionSummaryModal';
import { AdaptiveEngine } from '../core/engine/adaptiveEngine';
import { i18n } from '../core/i18n';
import { isDuplicateTrialRecordError } from '../storage/db/queries';
import { type AdaptiveMode, type StepGranularity, getSettingsSnapshot } from '../storage/settings';
import { showToast } from '../stores/toastStore';
import { playHitSound, playMissSound } from '../utils/sound';
import { decideFinishBranch } from './session/sessionDecisions';
import { useIdleProtection } from './session/useIdleProtection';
import { useTrainingKeybindings } from './session/useTrainingKeybindings';

export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  cardId: string;
  sessionType: 'training' | 'benchmark' | 'sandbox';
  initialLevel: number;
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity?: StepGranularity;
  adaptiveMode?: AdaptiveMode;
  targetAccuracy?: number;
  blockSize?: number;
  idleTimeoutSec?: number;
  targetLimitTrials?: number;
  /** Fixed scheduled levels. When set, manual level controls are locked. */
  scheduledLevels?: number[];
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
  onEarlyExit?: (history: SessionHistoryItem[]) => void;
  onIdleChange?: (isIdle: boolean) => void;
  onIdleResume?: (idleDurationMs: number) => void;
  generateQuestion: (level: number) => TQuestion;
  evaluateAnswer: (userVal: TAnswerVal, question: TQuestion) => THitResult;
  isHit: (hitResult: THitResult) => boolean;
  saveTrialRecord: (params: {
    sessionId: string;
    question: TQuestion;
    hitResult: THitResult;
    responseTimeMs: number;
    userVal: TAnswerVal;
    currentProfileLevel: number;
  }) => Promise<void>;
  saveSession: (params: {
    sessionId: string;
    totalTrials: number;
    hitTrials: number;
    ended: boolean;
    startTimestamp: number;
    endLevel: number;
  }) => Promise<void>;
  onExit: () => void;
}

export function useTrainingSession<TQuestion, THitResult, TAnswerVal>({
  domain,
  cardId,
  sessionType,
  initialLevel,
  autoNext,
  autoNextDelay,
  stepGranularity = 'standard',
  adaptiveMode = 'block',
  targetAccuracy = 0.8,
  blockSize = 10,
  idleTimeoutSec: optionsIdleTimeout,
  targetLimitTrials,
  scheduledLevels,
  onTargetLimitReached,
  onEarlyExit,
  onIdleChange,
  onIdleResume,
  generateQuestion,
  evaluateAnswer,
  isHit,
  saveTrialRecord,
  saveSession,
  onExit,
}: UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal>) {
  const sessionIdRef = useRef<string>(`${domain}_${cardId}_session_${Date.now()}`);
  const startTimeRef = useRef<number>(Date.now());
  const adaptiveEngineRef = useRef<AdaptiveEngine>(
    new AdaptiveEngine(
      initialLevel,
      stepGranularity === 'fine',
      sessionType === 'benchmark' ? 'staircase' : adaptiveMode,
      targetAccuracy,
      blockSize,
    ),
  );
  const autoNextTimerRef = useRef<number | null>(null);
  const isLevelLocked = Boolean(scheduledLevels && scheduledLevels.length > 0);

  const [question, setQuestion] = useState<TQuestion>(() => generateQuestion(initialLevel));
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<THitResult | null>(null);

  const [totalTrials, setTotalTrials] = useState<number>(0);
  const [hitTrials, setHitTrials] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const streakRef = useRef<number>(0);

  const effectiveIdleTimeout =
    typeof optionsIdleTimeout === 'number'
      ? optionsIdleTimeout
      : (getSettingsSnapshot().global.idleTimeout ?? 60);

  // === 1. 闲置与失焦保护微 Hook ===
  const { isIdle, pauseToIdle, resumeFromIdle } = useIdleProtection({
    timeoutSec: effectiveIdleTimeout,
    disabled: isFinished || showSummaryModal,
    onPause: () => {
      onIdleChange?.(true);
    },
    onResume: (idleDurationMs) => {
      startTimeRef.current += idleDurationMs;
      setQuestionStartTime((prev) => prev + idleDurationMs);
      onIdleChange?.(false);
      onIdleResume?.(idleDurationMs);
    },
  });

  const saveCurrentSession = useCallback(
    async (trials = totalTrials, hits = hitTrials, ended = false) => {
      await saveSession({
        sessionId: sessionIdRef.current,
        totalTrials: trials,
        hitTrials: hits,
        ended,
        startTimestamp: startTimeRef.current,
        endLevel: adaptiveEngineRef.current.getCurrentLevel(),
      });
    },
    [saveSession, totalTrials, hitTrials],
  );

  const handleNextQuestion = useCallback(() => {
    if (isFinished) return;
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [isFinished, generateQuestion]);

  const setCurrentLevel = useCallback(
    (newLevel: number) => {
      const clamped = Math.max(1, Math.min(35, newLevel));
      adaptiveEngineRef.current.setLevel(clamped);
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }
      setShowAnswer(false);
      setUserAnswer(null);
      setQuestion(generateQuestion(clamped));
      setQuestionStartTime(Date.now());
    },
    [generateQuestion],
  );

  const regenerateQuestion = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    const currentLvl = adaptiveEngineRef.current.getCurrentLevel();
    setShowAnswer(false);
    setUserAnswer(null);
    setQuestion(generateQuestion(currentLvl));
    setQuestionStartTime(Date.now());
  }, [generateQuestion]);

  const revealAnswer = useCallback(() => {
    setShowAnswer(true);
  }, []);

  const toggleInspector = useCallback(() => {
    setShowInspector((prev) => !prev);
  }, []);

  const adjustLevel = useCallback(
    (delta: number) => {
      const cur = adaptiveEngineRef.current.getCurrentLevel();
      const next = Math.max(1, Math.min(35, cur + delta));
      if (next !== cur) {
        setCurrentLevel(next);
      }
    },
    [setCurrentLevel],
  );

  const handleAnswer = useCallback(
    async (userVal: TAnswerVal) => {
      const responseTimeMs = Date.now() - questionStartTime;
      const hitResult = evaluateAnswer(userVal, question);
      const hit = isHit(hitResult);

      if (hit) {
        streakRef.current += 1;
        playHitSound(streakRef.current);
      } else {
        streakRef.current = 0;
        playMissSound();
      }

      setUserAnswer(hitResult);
      setShowAnswer(true);

      const newTotal = totalTrials + 1;
      const newHits = hitTrials + (hit ? 1 : 0);
      setTotalTrials(newTotal);
      setHitTrials(newHits);

      const levelBefore = adaptiveEngineRef.current.getCurrentLevel();
      if (sessionType !== 'sandbox') {
        adaptiveEngineRef.current.recordResult(hit);
      }
      const levelAfter = adaptiveEngineRef.current.getCurrentLevel();
      const nextScheduledLevel = scheduledLevels?.[newTotal];
      if (nextScheduledLevel !== undefined) {
        adaptiveEngineRef.current.setLevel(nextScheduledLevel);
      }

      try {
        await saveTrialRecord({
          sessionId: sessionIdRef.current,
          question,
          hitResult,
          responseTimeMs,
          userVal,
          currentProfileLevel: levelAfter,
        });
      } catch (err) {
        // 幂等拒绝是预期路径：保持会话继续，不重复计数（ADR 0006）
        if (!isDuplicateTrialRecordError(err)) throw err;
        showToast(i18n.t('common.trialAlreadySaved'), 'info');
      }

      const nextHistoryItem: SessionHistoryItem = {
        trialIndex: newTotal,
        levelBefore,
        levelAfter,
        isHit: hit,
        responseTimeMs,
      };

      const updatedHistory = [...sessionHistory, nextHistoryItem];
      setSessionHistory(updatedHistory);

      if (targetLimitTrials && newTotal >= targetLimitTrials) {
        setIsFinished(true);
        await saveCurrentSession(newTotal, newHits, true);
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        if (autoNext) {
          autoNextTimerRef.current = window.setTimeout(() => {
            if (onTargetLimitReached) {
              onTargetLimitReached(updatedHistory);
            } else {
              setShowSummaryModal(true);
            }
          }, autoNextDelay);
        }
      } else if (sessionType === 'benchmark' && newTotal >= 20) {
        setIsFinished(true);
        await saveCurrentSession(newTotal, newHits, true);
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        if (autoNext) {
          autoNextTimerRef.current = window.setTimeout(() => {
            setShowSummaryModal(true);
          }, autoNextDelay);
        }
      } else if (autoNext) {
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          handleNextQuestion();
        }, autoNextDelay);
      }
    },
    [
      questionStartTime,
      evaluateAnswer,
      question,
      isHit,
      totalTrials,
      hitTrials,
      saveTrialRecord,
      sessionHistory,
      targetLimitTrials,
      onTargetLimitReached,
      sessionType,
      scheduledLevels,
      saveCurrentSession,
      autoNextDelay,
      autoNext,
      handleNextQuestion,
    ],
  );

  const handleRequestFinish = useCallback(async () => {
    const branch = decideFinishBranch({
      sessionType,
      targetLimitTrials,
      totalTrials,
      hasTargetLimitHandler: Boolean(onTargetLimitReached),
      hasEarlyExitHandler: Boolean(onEarlyExit),
      hasHistory: sessionHistory.length > 0,
      showSummaryModal,
    });

    if (branch === 'exit') {
      if (sessionType !== 'sandbox') {
        await saveCurrentSession(totalTrials, hitTrials, true);
      }
      onExit();
      return;
    }

    await saveCurrentSession(totalTrials, hitTrials, true);

    if (branch === 'target-limit') {
      onTargetLimitReached?.(sessionHistory);
    } else if (branch === 'early-exit') {
      onEarlyExit?.(sessionHistory);
    } else {
      setShowSummaryModal(true);
    }
  }, [
    sessionType,
    targetLimitTrials,
    totalTrials,
    hitTrials,
    onTargetLimitReached,
    onEarlyExit,
    sessionHistory,
    showSummaryModal,
    saveCurrentSession,
    onExit,
  ]);

  const handleFinishSession = useCallback(async () => {
    await saveCurrentSession(totalTrials, hitTrials, true);
    onExit();
  }, [saveCurrentSession, totalTrials, hitTrials, onExit]);

  const handleRestartSession = useCallback(() => {
    setShowSummaryModal(false);
    setIsFinished(false);
    setTotalTrials(0);
    setHitTrials(0);
    setSessionHistory([]);
    setShowAnswer(false);
    setUserAnswer(null);
    streakRef.current = 0;
    sessionIdRef.current = `${domain}_${cardId}_session_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    adaptiveEngineRef.current.setLevel(scheduledLevels?.[0] ?? initialLevel);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, cardId, initialLevel, scheduledLevels, generateQuestion]);

  // === 2. 键盘快捷键微 Hook ===
  useTrainingKeybindings({
    isIdle,
    showAnswer,
    isFinished,
    disabled: showSummaryModal,
    isSandbox: sessionType === 'sandbox',
    onResumeFromIdle: resumeFromIdle,
    onNextQuestion: handleNextQuestion,
    onRequestFinish: handleRequestFinish,
    onRegenerate: isLevelLocked ? undefined : regenerateQuestion,
    onAdjustLevel: isLevelLocked ? undefined : adjustLevel,
    onToggleInspector: toggleInspector,
  });

  // === 3. 活跃计时器 ===
  useEffect(() => {
    const timer = setInterval(() => {
      if (showSummaryModal || isFinished || isIdle) return;
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [showSummaryModal, isFinished, isIdle]);

  return {
    question,
    showAnswer,
    userAnswer,
    totalTrials,
    hitTrials,
    elapsedSeconds,
    isFinished,
    isIdle,
    sessionHistory,
    showSummaryModal,
    resumeFromIdle,
    pauseToIdle,
    handleAnswer,
    handleNextQuestion,
    setCurrentLevel,
    regenerateQuestion,
    revealAnswer,
    showInspector,
    toggleInspector,
    setShowInspector,
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  };
}

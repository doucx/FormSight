import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SessionHistoryItem } from '../components/SessionSummaryModal';
import { AdaptiveEngine } from '../core/engine/adaptiveEngine';
import { type AdaptiveMode, type StepGranularity, loadSettings } from '../utils/settings';
import { playHitSound, playMissSound } from '../utils/sound';
import { useIdleProtection } from './session/useIdleProtection';
import { useTrainingKeybindings } from './session/useTrainingKeybindings';

export interface UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal> {
  domain: string;
  mode: string;
  sessionType: 'training' | 'benchmark';
  initialLevel: number;
  autoNext: boolean;
  autoNextDelay: number;
  stepGranularity?: StepGranularity;
  adaptiveMode?: AdaptiveMode;
  targetAccuracy?: number;
  blockSize?: number;
  idleTimeoutSec?: number;
  targetLimitTrials?: number;
  onTargetLimitReached?: (history: SessionHistoryItem[]) => void;
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
  mode,
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
  onTargetLimitReached,
  generateQuestion,
  evaluateAnswer,
  isHit,
  saveTrialRecord,
  saveSession,
  onExit,
}: UseTrainingSessionOptions<TQuestion, THitResult, TAnswerVal>) {
  const sessionIdRef = useRef<string>(`${domain}_${mode}_session_${Date.now()}`);
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
  const streakRef = useRef<number>(0);

  const effectiveIdleTimeout =
    typeof optionsIdleTimeout === 'number'
      ? optionsIdleTimeout
      : (loadSettings().global.idleTimeout ?? 60);

  // === 1. 闲置与失焦保护微 Hook ===
  const { isIdle, pauseToIdle, resumeFromIdle } = useIdleProtection({
    timeoutSec: effectiveIdleTimeout,
    disabled: isFinished || showSummaryModal,
    onResume: (idleDurationMs) => {
      startTimeRef.current += idleDurationMs;
      setQuestionStartTime((prev) => prev + idleDurationMs);
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
      adaptiveEngineRef.current.recordResult(hit);
      const levelAfter = adaptiveEngineRef.current.getCurrentLevel();

      await saveTrialRecord({
        sessionId: sessionIdRef.current,
        question,
        hitResult,
        responseTimeMs,
        userVal,
        currentProfileLevel: levelAfter,
      });

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
      saveCurrentSession,
      autoNextDelay,
      autoNext,
      handleNextQuestion,
    ],
  );

  const handleRequestFinish = useCallback(async () => {
    if (targetLimitTrials && totalTrials >= targetLimitTrials && onTargetLimitReached) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onTargetLimitReached(sessionHistory);
      return;
    }
    if (sessionHistory.length > 0 && !showSummaryModal) {
      await saveCurrentSession(totalTrials, hitTrials, true);
      setShowSummaryModal(true);
    } else {
      await saveCurrentSession(totalTrials, hitTrials, true);
      onExit();
    }
  }, [
    targetLimitTrials,
    totalTrials,
    hitTrials,
    onTargetLimitReached,
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
    sessionIdRef.current = `${domain}_${mode}_session_${Date.now()}`;
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    adaptiveEngineRef.current.setLevel(initialLevel);
    const nextLevel = adaptiveEngineRef.current.getCurrentLevel();
    setQuestion(generateQuestion(nextLevel));
    setQuestionStartTime(Date.now());
  }, [domain, mode, initialLevel, generateQuestion]);

  // === 2. 键盘快捷键微 Hook ===
  useTrainingKeybindings({
    isIdle,
    showAnswer,
    isFinished,
    disabled: showSummaryModal,
    onResumeFromIdle: resumeFromIdle,
    onNextQuestion: handleNextQuestion,
    onRequestFinish: handleRequestFinish,
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
    handleRequestFinish,
    handleFinishSession,
    handleRestartSession,
  };
}

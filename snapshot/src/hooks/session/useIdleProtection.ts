import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

export interface UseIdleProtectionOptions {
  timeoutSec: number;
  disabled?: boolean;
  onPause?: () => void;
  onResume?: (idleDurationMs: number) => void;
}

export function useIdleProtection({
  timeoutSec,
  disabled = false,
  onPause,
  onResume,
}: UseIdleProtectionOptions) {
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const idleStartRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const pauseToIdle = useCallback(() => {
    if (disabled || isIdle) return;
    idleStartRef.current = Date.now();
    setIsIdle(true);
    onPause?.();
  }, [disabled, isIdle, onPause]);

  const resumeFromIdle = useCallback(() => {
    if (!isIdle) return;
    const duration = idleStartRef.current !== null ? Date.now() - idleStartRef.current : 0;
    idleStartRef.current = null;
    setIsIdle(false);
    onResume?.(duration);
  }, [isIdle, onResume]);

  useEffect(() => {
    if (disabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const resetIdleTimer = () => {
      if (isIdle) return;
      if (timerRef.current) clearTimeout(timerRef.current);

      if (timeoutSec > 0) {
        timerRef.current = window.setTimeout(() => {
          pauseToIdle();
        }, timeoutSec * 1000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseToIdle();
      }
    };

    const handleWindowBlur = () => {
      pauseToIdle();
    };

    const userActivityEvents = ['pointerdown', 'pointermove', 'keydown', 'touchstart'];
    for (const evt of userActivityEvents) {
      window.addEventListener(evt, resetIdleTimer, { passive: true });
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    resetIdleTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const evt of userActivityEvents) {
        window.removeEventListener(evt, resetIdleTimer);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [disabled, isIdle, timeoutSec, pauseToIdle]);

  return {
    isIdle,
    pauseToIdle,
    resumeFromIdle,
  };
}
import { loadSettings } from './settings';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * 播放答对音效 (Aim Lab 风格高频短促清脆“叮”声)
 * @param streak 当前连击次数 (0..N)
 */
export function playHitSound(streak = 0): void {
  const settings = loadSettings();
  if (!settings.global.soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 基频 1046.5Hz (C6)，根据 streak 连胜阶梯按半音等比上扬，上限限制在 ~2200Hz
  const cappedStreak = Math.min(Math.max(0, streak - 1), 12);
  const baseFreq = 1046.5;
  const targetFreq = baseFreq * 1.059463 ** cappedStreak;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(targetFreq, now);
  // 轻微的向上频移增强打击感
  osc.frequency.exponentialRampToValueAtTime(targetFreq * 1.08, now + 0.08);

  // 极速起音，指数衰减
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.22, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * 播放答错提示音 (柔和低沉的下行平滑提示)
 */
export function playMissSound(): void {
  const settings = loadSettings();
  if (!settings.global.soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle'; // 三角波柔和不刺耳
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.16);
}

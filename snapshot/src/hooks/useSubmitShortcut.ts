import { useEffect } from 'preact/hooks';

export interface UseSubmitShortcutOptions {
  disabled?: boolean;
  onSubmit: () => void;
  enableKeyboardShortcuts?: boolean;
}

/**
 * 空格键提交监听 Hook
 * - 过滤输入框冒泡
 * - 阻止空格键页面滚动默认行为并触发提交
 */
export function useSubmitShortcut({
  disabled = false,
  onSubmit,
  enableKeyboardShortcuts = true,
}: UseSubmitShortcutOptions) {
  useEffect(() => {
    if (!enableKeyboardShortcuts || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        onSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onSubmit, enableKeyboardShortcuts]);
}
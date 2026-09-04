import { useEffect } from 'preact/hooks';

export interface UseChoiceShortcutsOptions {
  optionsCount: number;
  disabled?: boolean;
  onSelect: (index: number) => void;
  onSubmit?: () => void;
  enableKeyboardShortcuts?: boolean;
}

/**
 * N-AFC (包含 2AFC) 专用键盘快捷键 Hook
 * - 数字键 1-N：选择对应序号选项 (转换为 0-based index)
 * - 空格键：在提供 onSubmit 时确认提交
 * - 自动忽略 input / textarea 等输入控件的冒泡
 */
export function useChoiceShortcuts({
  optionsCount,
  disabled = false,
  onSelect,
  onSubmit,
  enableKeyboardShortcuts = true,
}: UseChoiceShortcutsOptions) {
  useEffect(() => {
    if (!enableKeyboardShortcuts || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // 1. 处理数字键快速选定 (兼容主键盘与小键盘)
      const num = Number.parseInt(e.key, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= optionsCount) {
        e.preventDefault();
        onSelect(num - 1);
        return;
      }

      // 2. 处理空格确认提交
      if (onSubmit && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        onSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [optionsCount, disabled, onSelect, onSubmit, enableKeyboardShortcuts]);
}

import { signal } from '@preact/signals';
import type { ToastMessage, ToastType } from '../components/common/Toast';

export const $toasts = signal<ToastMessage[]>([]);

export function showToast(message: string, type: ToastType = 'info'): void {
  const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
  $toasts.value = [...$toasts.value, { id, message, type }];
}

export function dismissToast(id: string): void {
  $toasts.value = $toasts.value.filter((t) => t.id !== id);
}

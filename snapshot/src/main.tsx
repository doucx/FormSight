import { render } from 'preact';
import { App } from './app';
import { i18n } from './core/i18n';
import { applyThemeToDocument } from './hooks/useTheme';
import { initPlanStore } from './stores/planStore';
import { refreshAppData } from './stores/profileStore';
import { $settings, initSettingsStore } from './stores/settingsStore';
import './index.css';

async function bootstrap() {
  // 1. 严格阻塞等待全部 IndexedDB 核心数据加载至 Signals
  await Promise.all([
    initSettingsStore(),
    initPlanStore(),
    refreshAppData(),
  ]);

  // 2. 确保 i18n 语言与当前设定严格对齐
  const currentSettings = $settings.value;
  if (currentSettings.global.locale) {
    i18n.setLocale(currentSettings.global.locale);
  }

  // 3. 确保 DOM 主题与数据库配置完全一致
  applyThemeToDocument(currentSettings.global.theme);

  // 4. 全部状态与 DOM 基准就绪，挂载渲染 Preact
  const appElement = document.getElementById('app');
  if (appElement) {
    render(<App />, appElement);
  }
}

bootstrap();
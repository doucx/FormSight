import { render } from 'preact';
import { App } from './app';
import { applyThemeToDocument } from './hooks/useTheme';
import { getCachedBypassTheme, loadSettings } from './storage/settings';
import './index.css';

// 使用旁路缓存极速应用外观主题，避免首屏渲染闪烁
applyThemeToDocument(getCachedBypassTheme());

// 异步引导 IndexedDB 并渲染主应用
async function bootstrap() {
  await loadSettings();
  const appElement = document.getElementById('app');
  if (appElement) {
    render(<App />, appElement);
  }
}

bootstrap();

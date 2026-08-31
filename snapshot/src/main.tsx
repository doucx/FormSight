import { render } from 'preact';
import { App } from './app';
import { applyThemeToDocument } from './hooks/useTheme';
import { loadSettings } from './utils/settings';
import './index.css';

// 初始化应用已保存的外观主题
applyThemeToDocument(loadSettings().global.theme);

const appElement = document.getElementById('app');
if (appElement) {
  render(<App />, appElement);
}

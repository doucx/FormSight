import { render } from 'preact';
import { App } from './app';
import { i18n } from './core/i18n';
import { applyThemeToDocument } from './hooks/useTheme';
import { loadSettings } from './storage/settings';
import './index.css';

// 异步从 IndexedDB 加载设置并完成首屏直出应用，再挂载组件树
async function bootstrap() {
  const settings = await loadSettings();

  // 1. 在 DOM 节点初次渲染前完成主题 class 与色彩空间配置
  applyThemeToDocument(settings.global.theme);

  // 2. 将 IDB 中保存的语言设置给 i18n 实例
  i18n.init(settings.global.locale);

  // 3. 此时所有初始属性均已匹配，挂载不会产生属性突变与补间变色动画
  const appElement = document.getElementById('app');
  if (appElement) {
    render(<App />, appElement);
  }
}

bootstrap();
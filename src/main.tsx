import { render } from 'preact';
import { App } from './app';
import './index.css';

const appElement = document.getElementById('app');
if (appElement) {
  render(<App />, appElement);
}

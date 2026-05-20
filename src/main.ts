import './styles.css';
import { PortfolioGame } from './render/PortfolioGame';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Missing #app root element.');
}

const game = new PortfolioGame(root);
game.start();

window.addEventListener('beforeunload', () => {
  game.dispose();
});

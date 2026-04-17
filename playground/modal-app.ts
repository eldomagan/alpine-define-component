import Alpine from 'alpinejs';
import { modal } from './components/modal';

Alpine.plugin(modal);

(window as any).Alpine = Alpine;
Alpine.start();

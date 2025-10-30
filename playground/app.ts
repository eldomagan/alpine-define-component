import Alpine from 'alpinejs';
import { counter } from './components/counter';
import { modal } from './components/modal';
import { tabs } from './components/tabs';

Alpine.plugin(counter);
Alpine.plugin(modal);
Alpine.plugin(tabs);

(window as any).Alpine = Alpine;
Alpine.start();

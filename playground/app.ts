import Alpine from 'alpinejs';
import morph from '@alpinejs/morph';
import { counter } from './components/counter';
import { modal } from './components/modal';
import { tabs } from './components/tabs';
import { accordion } from './components/accordion';
import { registerMorphDemo } from './components/morph-demo';

Alpine.plugin(morph);
Alpine.plugin(counter);
Alpine.plugin(modal);
Alpine.plugin(tabs);
Alpine.plugin(accordion);
registerMorphDemo();

(window as any).Alpine = Alpine;
Alpine.start();

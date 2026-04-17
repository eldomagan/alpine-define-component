import Alpine from 'alpinejs';
import { carousel } from './components/carousel';

Alpine.plugin(carousel);

(window as any).Alpine = Alpine;
Alpine.start();

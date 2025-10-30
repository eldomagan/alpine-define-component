import { headers } from './../../node_modules/happy-dom/src/PropertySymbol';
import { defineComponent, setup } from '../../src/index';

export const counter = defineComponent({
  name: 'counter',
  setup: setup((props: { count?: number }) => ({
    count: props.count ?? 0,

    increment() {
      this.count++;
      this.$dispatch('count-changed', { count: this.count });
    },

    decrement() {
      this.count--;
      this.$dispatch('count-changed', { count: this.count });
    },

    reset() {
      this.count = 0;
    },

    init() {
      this.$watch('count', (value: number) => {
        console.log('Count updated:', value);
      });
    },
  })),

  parts: {
    display(api) {
      return {
        'x-text': () => `Count: ${api.count}`,
      };
    },
    incrementBtn(api) {
      return {
        'x-on:click': () => api.increment(),
      };
    },
  },
});

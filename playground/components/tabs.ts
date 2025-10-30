import { defineComponent, setup } from '../../src/index';

export const tabs = defineComponent({
  name: 'tabs',
  setup: setup((props: { defaultTab?: string }) => ({
    activeTab: props.defaultTab ?? 'tab1',
    history: [] as string[],

    setTab(tab: string) {
      this.activeTab = tab;
      this.addToHistory(tab);
      this.$dispatch('tab-changed', { tab });
    },

    isActive(tab: string) {
      return this.activeTab === tab;
    },

    addToHistory(tab: string) {
      this.history.push(tab);

      if (this.history.length > 10) {
        this.history.shift();
      }
    },

    goBack() {
      if (this.history.length > 1) {
        this.history.pop();
        const previous = this.history[this.history.length - 1];
        this.setTab(previous);
      }
    },

    init() {
      this.$watch('activeTab', (value: string) => {
        console.log('Active tab:', value);

        this.$nextTick(() => {
          const url = new URL(window.location.href);
          url.searchParams.set('tab', value);
          window.history.replaceState({}, '', url);
        });
      });
    },
  })),

  parts: {
    button(api, _, { value }) {
      return {
        'x-on:click': () => api.setTab(value),
        'x-bind:class': () => ({
          active: api.isActive(value),
        }),
      };
    },
    panel(api, _, { value }) {
      return {
        'x-show': () => api.isActive(value),
      };
    },
  },
});

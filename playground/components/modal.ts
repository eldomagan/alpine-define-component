import { defineComponent, setup } from '../../src/index';

export const modal = defineComponent({
  name: 'modal',
  setup: setup((props: { open?: boolean; backdrop?: boolean; keyboard?: boolean }) => ({
    isOpen: props.open ?? false,
    config: {
      backdrop: props.backdrop ?? true,
      keyboard: props.keyboard ?? true,
    },

    open() {
      this.isOpen = true;
      this.$dispatch('modal:opened');

      this.$nextTick(() => {
        const firstInput = this.$el.querySelector('input, button');
        (firstInput as HTMLElement)?.focus();
      });
    },

    close() {
      this.isOpen = false;
      this.$dispatch('modal:closed');
    },

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    init() {
      this.$watch('isOpen', (value: boolean) => {
        if (value) {
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = '';
        }
      });
    },
  })),

  parts: {
    trigger(api) {
      return {
        'x-on:click': () => api.toggle(),
      };
    },
    closeTrigger(api) {
      return {
        'x-on:click': () => api.close(),
      };
    },
    content() {
      return {
        'x-on:click.stop': () => {},
      };
    },
    backdrop(api) {
      return {
        'x-show': () => api.isOpen,
        'x-on:click': () => {
          if (api.config.backdrop) {
            api.close();
          }
        },
      };
    },
  },
});

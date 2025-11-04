import { defineComponent, defineScope, setup } from '../../src/index';

/**
 * Accordion component demonstrating the new parts-as-function pattern
 * with automatic API type inference and explicit scope typing.
 */
export const accordion = defineComponent({
  name: 'accordion',
  setup: setup(() => ({
    openItems: [] as string[],

    toggle(itemId: string) {
      const index = this.openItems.indexOf(itemId);
      if (index > -1) {
        this.openItems.splice(index, 1);
      } else {
        this.openItems.push(itemId);
      }
    },

    isOpen(itemId: string) {
      return this.openItems.includes(itemId);
    },

    closeAll() {
      this.openItems = [];
    },
  })),

  parts: ({ withScopes }) => withScopes<{
    $item: {
      id: string;
      isOpen: boolean;
      toggle: () => void;
    };
  }>({
    item: defineScope({
      name: 'item',
      setup: (api, _, { value: itemId }) => ({
        id: itemId,
        isOpen: api.isOpen(itemId),
        toggle() {
          api.toggle(itemId);
        },
      }),
    }),

    header(api) {
      return {
        'x-on:click': () => api.$item.toggle(),
        'x-bind:class': () => ({
          'accordion-header': true,
          'open': api.$item.isOpen,
        }),
      };
    },

    content(api) {
      return {
        'x-show': () => api.$item.isOpen,
        'x-transition': true,
      };
    },
  }),
});

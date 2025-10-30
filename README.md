# alpine-define-component

Structured component system for Alpine.js with parts/slots support and full TypeScript support.

## Installation

```bash
npm install alpine-define-component
```

## Quick Start

```typescript
import Alpine from 'alpinejs';
import { defineComponent } from 'alpine-define-component';

const accordion = defineComponent({
  name: 'accordion',
  setup: (props) => ({
    value: props.value || [],

    toggle(id) {
      const isOpen = this.value.includes(id);
      this.value = isOpen ? this.value.filter((i) => i !== id) : [id];
    },

    isOpen(id) {
      return this.value.includes(id);
    },
  }),

  parts: {
    item(api, el, { value }) {
      return {
        'x-on:click': () => api.toggle(value),
        'x-bind:data-open': () => api.isOpen(value),
      };
    },
  },
});

Alpine.plugin(accordion);
Alpine.start();
```

```html
<div x-accordion="{ value: [] }">
  <div x-accordion:item="'item-1'">Item 1</div>
  <div x-accordion:item="'item-2'">Item 2</div>
</div>
```

## TypeScript

### `setup` Helper (Optional)

For TypeScript users who want Alpine magics (`this.$dispatch`, `this.$watch`, etc.) typed in methods:

```typescript
import { defineComponent, setup } from 'alpine-define-component';

const counter = defineComponent({
  name: 'counter',
  setup: setup((props: { count?: number }) => ({
    count: props.count ?? 0,

    increment() {
      this.count++;
      this.$dispatch('incremented');
    },
  })),
});
```

## Scoped Parts

Use `defineScope` to create isolated reactive contexts for repeating parts (like tabs, accordion items, list items):

```typescript
import { defineComponent, defineScope } from 'alpine-define-component';

const tabs = defineComponent({
  name: 'tabs',
  setup: (props) => ({
    activeTab: props.defaultTab || 'tab1',
    setTab(tab: string) {
      this.activeTab = tab;
    }
  }),

  parts: {
    item: defineScope({
      name: 'tabItem',
      setup: (api, el, { value }) => ({
        id: value,
        isActive: () => api.activeTab === value
      }),
      bindings: (api, scope) => ({
        'x-on:click': () => api.setTab(scope.id),
        'x-bind:class': () => ({ active: scope.isActive() })
      })
    })
  }
});
```

```html
<div x-tabs="{ defaultTab: 'tab1' }">
  <!-- Each item has its own scope via $tabItem -->
  <button x-tabs:item="'tab1'" x-text="$tabItem.isActive() ? 'Active' : 'Tab 1'">
    Tab 1
  </button>

  <button x-tabs:item="'tab2'" x-text="$tabItem.isActive() ? 'Active' : 'Tab 2'">
    Tab 2
  </button>

  <button x-tabs:item="'tab3'" x-text="$tabItem.isActive() ? 'Active' : 'Tab 3'">
    Tab 3
  </button>
</div>
```

**Benefits:**
- Isolated reactive state per part instance
- Access parent API and scope data together
- Scope available as `$scopeName` magic in HTML
- Perfect for lists, tabs, accordions, menu items, etc.

## API

### `defineComponent(config)`

```typescript
defineComponent({
  name: string,                  // Component/directive name
  setup: (props, ctx) => {...},  // Returns component API
  parts?: {...}                  // Optional part handlers
})
```

### `defineScope(options)`

Creates an isolated reactive scope for component parts.

```typescript
defineScope({
  name: string,                        // Scope name (accessible as $name)
  setup: (api, el, ctx) => {...},      // Returns scope data
  bindings?: (api, scope) => {...}     // Optional Alpine bindings
})
```

**Returns:** Part handler function

### `setup(fn)` (TypeScript)

Type helper for Alpine magics in methods.

## License

MIT

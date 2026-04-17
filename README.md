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
</div>
```

**Benefits:**
- Isolated reactive state per part instance
- Access parent API and scope data together
- Scope available as `$scopeName` magic in HTML
- Perfect for lists, tabs, accordions, menu items, etc.

### Scope Typing (TypeScript)

For full type safety with scopes, use the parts-as-function pattern with `withScopes`:

```typescript
import { defineComponent, defineScope, setup } from 'alpine-define-component';

const accordion = defineComponent({
  name: 'accordion',
  setup: setup(() => ({
    openItems: [] as string[],
    toggle(itemId: string) { /* ... */ },
    isOpen(itemId: string) { /* ... */ },
  })),

  parts: ({ withScopes }) => withScopes<{
    $item: { id: string; isOpen: boolean; toggle: () => void };
  }>({
    item: defineScope({
      name: 'item',
      setup: (api, _, { value: itemId }) => ({
        id: itemId,
        isOpen: api.isOpen(itemId),
        toggle() { api.toggle(itemId); },
      }),
    }),

    header(api) {
      // api.$item is correctly typed (from withScopes)
      return {
        'x-on:click': () => api.$item.toggle(),
        'x-bind:class': () => ({ open: api.$item.isOpen }),
      };
    },
  }),
});
```

## Root Part

The `parts.root` handler is a special case: its bindings are applied directly to the root component element, not to a child part. This is useful for setting ARIA attributes, keyboard handlers, or other bindings on the component root itself.

```typescript
const dialog = defineComponent({
  name: 'dialog',
  setup: () => ({
    open: false,
    close() { this.open = false; },
  }),
  parts: {
    root(api) {
      return {
        'x-bind:role': () => 'dialog',
        'x-bind:aria-expanded': () => api.open,
        'x-on:keydown.escape': () => api.close(),
      };
    },
    content() {
      return { 'x-on:click.stop': () => {} };
    },
  },
});
```

## Component Magic

When you define a component with `name: 'modal'`, the library registers an Alpine magic called `$modal` (camelCased from the component name). This magic returns the component's API from any descendant element.

```html
<div x-modal>
  <!-- $modal is available here because this element is inside x-modal -->
  <button x-on:click="$modal.open()">Open</button>

  <!-- Also available inside nested elements -->
  <div>
    <span x-text="$modal.isOpen"></span>
  </div>
</div>
```

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
  name: string,                        // Scope name (accessible as $name in template)
  setup: (api, el, ctx) => {...},      // Returns scope data
  bindings?: (api, scope) => {...}     // Optional Alpine bindings
})
```

**Returns:** Part handler function

### `setup(fn)` (TypeScript)

Type helper for Alpine magics in methods.

### SetupContext

The second argument passed to `setup(props, ctx)`:

| Field | Type | Description |
|-------|------|-------------|
| `Alpine` | `AlpineType` | The Alpine instance, for accessing `Alpine.reactive()`, `Alpine.effect()`, etc. |
| `generateId` | `(prefix: string) => string` | Generate a unique ID scoped to the component instance |

### PartContext

The third argument passed to part handlers `(api, el, ctx)`:

| Field | Type | Description |
|-------|------|-------------|
| `value` | `any` | The evaluated expression from the directive (e.g., `x-accordion:item="'item-1'"` passes `'item-1'`) |
| `modifiers` | `string[]` | Directive modifiers (e.g., `x-accordion:item.lazy` passes `['lazy']`) |
| `Alpine` | `AlpineType` | The Alpine instance |
| `cleanup` | `(cb: () => void) => void` | Register a cleanup callback that runs when the element is removed from the DOM |
| `generateId` | `(prefix: string) => string` | Generate a unique ID scoped to the component instance (e.g., `accordion-1:panel`) |

## Inspiration

- [@alpine/ui](https://alpinejs.dev/components#headless)
- [alpine-zag](https://github.com/TunkShif/alpine-zag)

## License

MIT

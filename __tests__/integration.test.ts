import { describe, it, expect, vi, beforeEach } from 'vitest';
import Alpine from 'alpinejs';
import { defineComponent, defineScope } from '../src/index';
import { resetIds } from '../src/use-id';

/**
 * Semi-integration tests: use real Alpine for reactive(), $data(), and bind(),
 * but invoke directive callbacks manually. Alpine.start() has compatibility
 * issues with happy-dom that prevent full end-to-end DOM rendering tests.
 */
describe('integration: defineComponent with real Alpine', () => {
  beforeEach(() => {
    resetIds();
    document.body.innerHTML = '';
  });

  function getDirectiveCallback(alpineMock: any): Function {
    return alpineMock.directive.mock.calls[0][1];
  }

  function createSpiedAlpine() {
    const spied = {
      magic: vi.fn(),

      addRootSelector: vi.fn(),
      prefixed: vi.fn((name: string) => `x-${name}`),
      directive: vi.fn((_name: string, _callback: Function) => ({
        before: vi.fn(),
      })),
      reactive: vi.fn((obj: any) => Alpine.reactive(obj)),
      bind: vi.fn(),
      $data: vi.fn(),
      store: vi.fn(),
      start: vi.fn(),
      plugin: vi.fn(),
    } as any;
    return spied;
  }

  it('should set up reactive state through Alpine.reactive', () => {
    const spied = createSpiedAlpine();

    const component = defineComponent({
      name: 'counter',
      setup: () => ({
        count: 0,
        increment() {
          this.count++;
        },
      }),
    });

    component(spied);

    const directiveCallback = getDirectiveCallback(spied);
    const el = document.createElement('div');
    const ctx = {
      evaluateLater: () => (cb: (v: any) => void) => cb(null),
      cleanup: vi.fn(),
      effect: vi.fn(),
    };

    directiveCallback(el, { value: '', expression: '', modifiers: [] }, ctx);

    const api = spied.reactive.mock.results[0].value;
    expect(api.count).toBe(0);
    api.increment();
    expect(api.count).toBe(1);
  });

  it('should not expose _generateId or _componentId on the API object', () => {
    const spied = createSpiedAlpine();

    const component = defineComponent({
      name: 'clean',
      setup: () => ({ value: 1 }),
    });

    component(spied);

    const directiveCallback = getDirectiveCallback(spied);
    const el = document.createElement('div');
    const ctx = {
      evaluateLater: () => (cb: (v: any) => void) => cb(null),
      cleanup: vi.fn(),
      effect: vi.fn(),
    };

    directiveCallback(el, { value: '', expression: '', modifiers: [] }, ctx);

    const api = spied.reactive.mock.results[0].value;
    expect(api).not.toHaveProperty('_generateId');
    expect(api).not.toHaveProperty('_componentId');
    expect(api).toHaveProperty('value', 1);
  });

  it('should provide working generateId to part handlers via WeakMap', () => {
    const spied = createSpiedAlpine();
    let capturedCtx: any = null;

    const component = defineComponent({
      name: 'widget',
      setup: () => ({ val: 1 }),
      parts: {
        item(_api, _el, context) {
          capturedCtx = context;
          return {};
        },
      },
    });

    component(spied);

    const directiveCallback = getDirectiveCallback(spied);

    const rootEl = document.createElement('div');
    const rootCtx = {
      evaluateLater: () => (cb: (v: any) => void) => cb(null),
      cleanup: vi.fn(),
      effect: vi.fn(),
    };
    directiveCallback(rootEl, { value: '', expression: '', modifiers: [] }, rootCtx);

    const api = spied.reactive.mock.results[0].value;
    spied.$data.mockReturnValue(api);

    const partEl = document.createElement('div');
    const partCtx = {
      evaluateLater: () => (cb: (v: any) => void) => cb('test'),
      cleanup: vi.fn(),
      effect: vi.fn((fn: any) => fn()),
    };
    rootEl.appendChild(partEl);
    directiveCallback(partEl, { value: 'item', expression: "'test'", modifiers: [] }, partCtx);

    expect(capturedCtx).toBeDefined();
    expect(capturedCtx.generateId).toBeInstanceOf(Function);
    expect(capturedCtx.generateId('panel')).toBe('widget-1:panel');
  });

  it('should apply root part handler bindings to the root element', () => {
    const spied = createSpiedAlpine();
    let rootHandlerCalled = false;

    const component = defineComponent({
      name: 'dialog',
      setup: () => ({ open: false }),
      parts: {
        root(api) {
          rootHandlerCalled = true;
          return {
            'x-bind:role': () => 'dialog',
            'x-bind:aria-expanded': () => api.open,
          };
        },
      },
    });

    component(spied);

    const directiveCallback = getDirectiveCallback(spied);
    const el = document.createElement('div');
    const ctx = {
      evaluateLater: () => (cb: (v: any) => void) => cb(null),
      cleanup: vi.fn(),
      effect: vi.fn(),
    };

    directiveCallback(el, { value: '', expression: '', modifiers: [] }, ctx);

    expect(rootHandlerCalled).toBe(true);

    const bindCalls = spied.bind.mock.calls;
    expect(bindCalls.length).toBeGreaterThanOrEqual(2);

    const rootBindings = bindCalls[1][1];
    expect(rootBindings).toHaveProperty('x-bind:role');
    expect(rootBindings).toHaveProperty('x-bind:aria-expanded');
  });

  it('should stamp data-{name}-id on root and data-part on parts', () => {
    const spied = createSpiedAlpine();

    const component = defineComponent({
      name: 'accordion',
      setup: () => ({}),
      parts: {
        item: () => ({ 'x-show': true }),
      },
    });

    component(spied);

    const directiveCallback = getDirectiveCallback(spied);

    // Root
    const rootEl = document.createElement('div');
    const rootCtx = {
      evaluateLater: () => (cb: (v: any) => void) => cb(null),
      cleanup: vi.fn(),
      effect: vi.fn(),
    };
    directiveCallback(rootEl, { value: '', expression: '', modifiers: [] }, rootCtx);

    const rootBindCall = spied.bind.mock.calls[0];
    expect(rootBindCall[1]).toHaveProperty('x-id');
    expect(rootBindCall[1]).toHaveProperty('x-data');

    // Part
    const api = spied.reactive.mock.results[0].value;
    spied.$data.mockReturnValue(api);

    const partEl = document.createElement('div');
    const partCtx = {
      evaluateLater: () => (cb: (v: any) => void) => cb(null),
      cleanup: vi.fn(),
      effect: vi.fn((fn: any) => fn()),
    };
    rootEl.appendChild(partEl);
    directiveCallback(partEl, { value: 'item', expression: '', modifiers: [] }, partCtx);

    const partBindCall = spied.bind.mock.calls[spied.bind.mock.calls.length - 1];
    expect(partBindCall[1]).toHaveProperty('data-part', 'item');
  });

  it('should create separate instances with unique IDs for multiple components', () => {
    const spied = createSpiedAlpine();

    const component = defineComponent({
      name: 'card',
      setup: (props: { title?: string }) => ({
        title: props.title ?? 'default',
      }),
    });

    component(spied);

    const directiveCallback = getDirectiveCallback(spied);

    // Instance 1
    const el1 = document.createElement('div');
    const ctx1 = {
      evaluateLater: () => (cb: (v: any) => void) => cb({ title: 'Card A' }),
      cleanup: vi.fn(),
      effect: vi.fn(),
    };
    directiveCallback(el1, { value: '', expression: "{ title: 'Card A' }", modifiers: [] }, ctx1);

    // Instance 2
    const el2 = document.createElement('div');
    const ctx2 = {
      evaluateLater: () => (cb: (v: any) => void) => cb({ title: 'Card B' }),
      cleanup: vi.fn(),
      effect: vi.fn(),
    };
    directiveCallback(el2, { value: '', expression: "{ title: 'Card B' }", modifiers: [] }, ctx2);

    const api1 = spied.reactive.mock.results[0].value;
    const api2 = spied.reactive.mock.results[1].value;

    expect(api1.title).toBe('Card A');
    expect(api2.title).toBe('Card B');
    expect(api1).not.toBe(api2);

    const bind1 = spied.bind.mock.calls[0][1];
    const bind2 = spied.bind.mock.calls[1][1];
    expect(bind1['x-data']).toBeDefined();
    expect(bind2['x-data']).toBeDefined();
    expect(bind1['x-data']).not.toBe(bind2['x-data']);
  });

  it('should support parts-as-function pattern with withScopes', () => {
    const spied = createSpiedAlpine();
    let itemHandlerCalled = false;

    const component = defineComponent({
      name: 'tabs',
      setup: () => ({ activeTab: 'tab1' }),
      parts: ({ withScopes }) =>
        withScopes<Record<string, never>>({
          button(_api, _el, _ctx) {
            itemHandlerCalled = true;
            return {};
          },
        }),
    });

    component(spied);

    const directiveCallback = getDirectiveCallback(spied);

    // Root
    const rootEl = document.createElement('div');
    const rootCtx = {
      evaluateLater: () => (cb: (v: any) => void) => cb(null),
      cleanup: vi.fn(),
      effect: vi.fn(),
    };
    directiveCallback(rootEl, { value: '', expression: '', modifiers: [] }, rootCtx);

    // Part
    const api = spied.reactive.mock.results[0].value;
    spied.$data.mockReturnValue(api);

    const partEl = document.createElement('div');
    const partCtx = {
      evaluateLater: () => (cb: (v: any) => void) => cb('tab1'),
      cleanup: vi.fn(),
      effect: vi.fn((fn: any) => fn()),
    };
    rootEl.appendChild(partEl);
    directiveCallback(partEl, { value: 'button', expression: "'tab1'", modifiers: [] }, partCtx);

    expect(itemHandlerCalled).toBe(true);
  });

  it('should resolve $componentName magic via Alpine.$data', () => {
    const spied = createSpiedAlpine();
    let magicCallback: Function | null = null;

    spied.magic.mockImplementation((_name: string, cb: Function) => {
      magicCallback = cb;
    });

    const component = defineComponent({
      name: 'modal',
      setup: () => ({ isOpen: false }),
    });

    component(spied);

    expect(spied.magic).toHaveBeenCalledWith('modal', expect.any(Function));
    expect(magicCallback).toBeDefined();

    const el = document.createElement('div');
    const mockData = { isOpen: false };
    spied.$data.mockReturnValue(mockData);

    const result = magicCallback!(el);
    expect(result).toBe(mockData);
    expect(spied.$data).toHaveBeenCalledWith(el);
  });

  it('should silently skip parts with no matching handler', () => {
    const spied = createSpiedAlpine();

    const component = defineComponent({
      name: 'safe',
      setup: () => ({}),
      parts: {
        known: () => ({}),
      },
    });

    component(spied);

    const directiveCallback = getDirectiveCallback(spied);

    // Root
    const rootEl = document.createElement('div');
    const rootCtx = {
      evaluateLater: () => (cb: (v: any) => void) => cb(null),
      cleanup: vi.fn(),
      effect: vi.fn(),
    };
    directiveCallback(rootEl, { value: '', expression: '', modifiers: [] }, rootCtx);

    const api = spied.reactive.mock.results[0].value;
    spied.$data.mockReturnValue(api);

    const partEl = document.createElement('div');
    const partCtx = {
      evaluateLater: () => (cb: (v: any) => void) => cb(null),
      cleanup: vi.fn(),
      effect: vi.fn((fn: any) => fn()),
    };

    expect(() => {
      directiveCallback(partEl, { value: 'unknown', expression: '', modifiers: [] }, partCtx);
    }).not.toThrow();

    const bindCallsAfterRoot = spied.bind.mock.calls.length;
    expect(bindCallsAfterRoot).toBe(1);
  });

  it('should support defineScope for isolated reactive scopes within parts', () => {
    const spied = createSpiedAlpine();
    let capturedBindings: any = null;

    const component = defineComponent({
      name: 'accordion',
      setup: () => ({
        openItems: [] as string[],
        isOpen(id: string) { return this.openItems.includes(id); },
      }),
      parts: {
        item: defineScope({
          name: 'item',
          setup: (api, _el, { value: itemId }) => ({
            id: itemId,
            get isOpen() { return api.isOpen(itemId); },
          }),
        }),
      },
    });

    component(spied);

    const directiveCallback = getDirectiveCallback(spied);

    // Root
    const rootEl = document.createElement('div');
    const rootCtx = {
      evaluateLater: () => (cb: (v: any) => void) => cb(null),
      cleanup: vi.fn(),
      effect: vi.fn(),
    };
    directiveCallback(rootEl, { value: '', expression: '', modifiers: [] }, rootCtx);

    const api = spied.reactive.mock.results[0].value;
    spied.$data.mockReturnValue(api);

    const partEl = document.createElement('div');
    const partCtx = {
      evaluateLater: () => (cb: (v: any) => void) => cb('section-1'),
      cleanup: vi.fn(),
      effect: vi.fn((fn: any) => fn()),
    };
    rootEl.appendChild(partEl);
    directiveCallback(partEl, { value: 'item', expression: "'section-1'", modifiers: [] }, partCtx);

    const partBindCall = spied.bind.mock.calls[spied.bind.mock.calls.length - 1];
    capturedBindings = partBindCall[1];

    expect(capturedBindings).toHaveProperty('data-part', 'item');
    expect(capturedBindings).toHaveProperty('x-data');

    const scopeData = capturedBindings['x-data']();
    expect(scopeData).toHaveProperty('$item');
    expect(scopeData.$item.id).toBe('section-1');
  });

});

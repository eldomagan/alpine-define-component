import { describe, it, expect, vi } from 'vitest';
import type { Alpine as AlpineType } from 'alpinejs';
import { defineComponent } from '../src/index';

describe('defineComponent', () => {
  function createMockAlpine(): AlpineType {
    const dataStore = new WeakMap();
    const bindings = new Map();

    return {
      magic: vi.fn(),
      addRootSelector: vi.fn(),
      prefixed: vi.fn((name: string) => `x-${name}`),
      directive: vi.fn((name, callback) => {
        bindings.set(name, callback);
        return {
          before: vi.fn(),
        };
      }),
      reactive: vi.fn((obj) => obj),
      bind: vi.fn((el, bindingsObj) => {
        // Simulate Alpine.bind behavior
        Object.entries(bindingsObj).forEach(([key, value]) => {
          if (key === 'x-data' && typeof value === 'function') {
            const data = value();
            dataStore.set(el, data);
          }
        });
      }),
      $data: vi.fn((el) => dataStore.get(el)),
      store: vi.fn(),
      start: vi.fn(),
      plugin: vi.fn(),
    } as any;
  }

  it('should register a component with Alpine', () => {
    const Alpine = createMockAlpine();

    const component = defineComponent({
      name: 'test-component',
      setup: () => ({
        value: 'test',
      }),
    });

    component(Alpine);

    expect(Alpine.magic).toHaveBeenCalledWith('testComponent', expect.any(Function));
    expect(Alpine.directive).toHaveBeenCalledWith('test-component', expect.any(Function));
  });

  it('should convert component name to camelCase for magic', () => {
    const Alpine = createMockAlpine();

    const component = defineComponent({
      name: 'my-awesome-component',
      setup: () => ({}),
    });

    component(Alpine);

    expect(Alpine.magic).toHaveBeenCalledWith('myAwesomeComponent', expect.any(Function));
  });

  it('should convert kebab-case to camelCase correctly', () => {
    const Alpine = createMockAlpine();

    const component = defineComponent({
      name: 'multi-word-component-name',
      setup: () => ({}),
    });

    component(Alpine);

    expect(Alpine.magic).toHaveBeenCalledWith('multiWordComponentName', expect.any(Function));
  });

  it('should call directive.before with "bind"', () => {
    const Alpine = createMockAlpine();
    const beforeMock = vi.fn();
    (Alpine.directive as any).mockImplementation(() => ({
      before: beforeMock,
    }));

    const component = defineComponent({
      name: 'test',
      setup: () => ({}),
    });

    component(Alpine);

    expect(beforeMock).toHaveBeenCalledWith('bind');
  });

  it('should pass props to setup function when directive is executed', () => {
    const Alpine = createMockAlpine();
    const setup = vi.fn((props: any) => ({
      value: props.initialValue || 0,
    }));

    const component = defineComponent({
      name: 'test',
      setup,
    });

    component(Alpine);

    // Get the directive callback
    const directiveCallback = (Alpine.directive as any).mock.calls[0][1];

    // Simulate Alpine calling the directive
    const mockEl = document.createElement('div');
    const mockContext = {
      evaluateLater: (expr: string) => (callback: (val: any) => void) => {
        const value = { initialValue: 42 };
        callback(value);
      },
      cleanup: vi.fn(),
    };

    directiveCallback(mockEl, { value: '', expression: '{ initialValue: 42 }', modifiers: [] }, mockContext);

    expect(setup).toHaveBeenCalledWith(
      { initialValue: 42 },
      expect.objectContaining({ generateId: expect.any(Function) })
    );
  });

  it('should provide generateId function to setup', () => {
    const Alpine = createMockAlpine();
    let capturedGenerateId: ((s: string) => string) | null = null;

    const component = defineComponent({
      name: 'test',
      setup: (_props, { generateId }) => {
        capturedGenerateId = generateId;
        return {};
      },
    });

    component(Alpine);

    // Get and execute the directive callback
    const directiveCallback = (Alpine.directive as any).mock.calls[0][1];
    const mockEl = document.createElement('div');
    const mockContext = {
      evaluateLater: (expr: string) => (callback: (val: any) => void) => callback(null),
      cleanup: vi.fn(),
    };

    directiveCallback(mockEl, { value: '', expression: '', modifiers: [] }, mockContext);

    expect(capturedGenerateId).toBeInstanceOf(Function);

    if (capturedGenerateId) {
      const generateId = capturedGenerateId as (s: string) => string;
      const id1 = generateId('item');
      const id2 = generateId('item');

      expect(id1).toMatch(/^test-\d+:item$/);
      expect(id1).toBe(id2); // Same instance should return same base
    }
  });

  it('should call root part handler if defined', () => {
    const Alpine = createMockAlpine();
    const rootHandler = vi.fn(() => ({
      'x-on:click': () => {},
    }));

    const component = defineComponent({
      name: 'tabs',
      setup: () => ({
        activeTab: 'tab1',
      }),
      parts: {
        root: rootHandler,
      },
    });

    component(Alpine);

    // Execute the directive callback
    const directiveCallback = (Alpine.directive as any).mock.calls[0][1];
    const mockEl = document.createElement('div');
    const mockContext = {
      evaluateLater: (expr: string) => (callback: (val: any) => void) => callback(null),
      cleanup: vi.fn(),
    };

    directiveCallback(mockEl, { value: '', expression: '', modifiers: [] }, mockContext);

    expect(rootHandler).toHaveBeenCalled();
  });

  it('should convert part names to camelCase', () => {
    const Alpine = createMockAlpine();
    const partHandler = vi.fn(() => ({}));

    const component = defineComponent({
      name: 'test',
      setup: () => ({}),
      parts: {
        myCustomPart: partHandler,
      },
    });

    component(Alpine);

    // Execute directive for root
    const directiveCallback = (Alpine.directive as any).mock.calls[0][1];
    const rootEl = document.createElement('div');
    const rootContext = {
      evaluateLater: (expr: string) => (callback: (val: any) => void) => callback(null),
      cleanup: vi.fn(),
    };

    directiveCallback(rootEl, { value: '', expression: '', modifiers: [] }, rootContext);

    // Store the API in Alpine.$data mock
    const api = (Alpine.reactive as any).mock.results[0].value;
    (Alpine.$data as any).mockReturnValue(api);

    // Execute directive for part with kebab-case name
    const partEl = document.createElement('div');
    const partContext = {
      evaluateLater: (expr: string) => (callback: (val: any) => void) => callback('test-value'),
      cleanup: vi.fn(),
    };

    directiveCallback(partEl, { value: 'my-custom-part', expression: "'test-value'", modifiers: [] }, partContext);

    expect(partHandler).toHaveBeenCalled();
  });

  it('should pass context to part handlers', () => {
    const Alpine = createMockAlpine();
    let capturedContext: any = null;

    const component = defineComponent({
      name: 'test',
      setup: () => ({ value: 42 }),
      parts: {
        item(_api, _el, context) {
          capturedContext = context;
          return {};
        },
      },
    });

    component(Alpine);

    // Execute directive for root
    const directiveCallback = (Alpine.directive as any).mock.calls[0][1];
    const rootEl = document.createElement('div');
    const rootContext = {
      evaluateLater: (expr: string) => (callback: (val: any) => void) => callback(null),
      cleanup: vi.fn(),
    };

    directiveCallback(rootEl, { value: '', expression: '', modifiers: [] }, rootContext);

    // Store the API
    const api = (Alpine.reactive as any).mock.results[0].value;
    (api as any)._generateId = (part: string) => `test-1:${part}`;
    (Alpine.$data as any).mockReturnValue(api);

    // Execute directive for part
    const partEl = document.createElement('div');
    const partContext = {
      evaluateLater: (expr: string) => (callback: (val: any) => void) => callback('test-value'),
      cleanup: vi.fn(),
    };

    directiveCallback(partEl, { value: 'item', expression: "'test-value'", modifiers: ['mod1'] }, partContext);

    expect(capturedContext).toBeDefined();
    expect(capturedContext.value).toBe('test-value');
    expect(capturedContext.modifiers).toEqual(['mod1']);
    expect(capturedContext.Alpine).toBe(Alpine);
    expect(capturedContext.cleanup).toBeInstanceOf(Function);
    expect(capturedContext.generateId).toBeInstanceOf(Function);
  });

  it('should add data-part attribute to part element bindings', () => {
    const Alpine = createMockAlpine();

    const component = defineComponent({
      name: 'test',
      setup: () => ({}),
      parts: {
        item: () => ({ 'x-bind:class': 'active' }),
      },
    });

    component(Alpine);

    // Execute directive for root
    const directiveCallback = (Alpine.directive as any).mock.calls[0][1];
    const rootEl = document.createElement('div');
    const rootContext = {
      evaluateLater: (expr: string) => (callback: (val: any) => void) => callback(null),
      cleanup: vi.fn(),
    };

    directiveCallback(rootEl, { value: '', expression: '', modifiers: [] }, rootContext);

    // Store the API
    const api = (Alpine.reactive as any).mock.results[0].value;
    (api as any)._generateId = (part: string) => `test-1:${part}`;
    (Alpine.$data as any).mockReturnValue(api);

    // Execute directive for part
    const partEl = document.createElement('div');
    const partContext = {
      evaluateLater: (expr: string) => (callback: (val: any) => void) => callback(null),
      cleanup: vi.fn(),
    };

    directiveCallback(partEl, { value: 'item', expression: '', modifiers: [] }, partContext);

    // Check that Alpine.bind was called with data-part
    const bindCalls = (Alpine.bind as any).mock.calls;
    const partBindCall = bindCalls.find((call: any) => call[1]['data-part'] === 'item');

    expect(partBindCall).toBeDefined();
    expect(partBindCall[1]).toMatchObject({
      'data-part': 'item',
      'x-bind:class': 'active',
    });
  });

  it('should handle components without parts', () => {
    const Alpine = createMockAlpine();

    const component = defineComponent({
      name: 'simple',
      setup: () => ({
        message: 'Hello',
      }),
    });

    component(Alpine);

    // Execute the directive
    const directiveCallback = (Alpine.directive as any).mock.calls[0][1];
    const mockEl = document.createElement('div');
    const mockContext = {
      evaluateLater: (expr: string) => (callback: (val: any) => void) => callback(null),
      cleanup: vi.fn(),
    };

    expect(() => {
      directiveCallback(mockEl, { value: '', expression: '', modifiers: [] }, mockContext);
    }).not.toThrow();

    expect(Alpine.reactive).toHaveBeenCalled();
  });

  it('should support modifiers on root directive', () => {
    const Alpine = createMockAlpine();
    let capturedModifiers: string[] = [];

    const component = defineComponent({
      name: 'test',
      setup: () => ({}),
      parts: {
        root(_api, _el, context) {
          capturedModifiers = context.modifiers;
          return {};
        },
      },
    });

    component(Alpine);

    // Execute directive with modifiers
    const directiveCallback = (Alpine.directive as any).mock.calls[0][1];
    const mockEl = document.createElement('div');
    const mockContext = {
      evaluateLater: (expr: string) => (callback: (val: any) => void) => callback(null),
      cleanup: vi.fn(),
    };

    directiveCallback(mockEl, { value: '', expression: '', modifiers: ['lazy', 'debounce'] }, mockContext);

    expect(capturedModifiers).toContain('lazy');
    expect(capturedModifiers).toContain('debounce');
  });

  it('should handle empty expression gracefully', () => {
    const Alpine = createMockAlpine();
    const setup = vi.fn(() => ({ value: 0 }));

    const component = defineComponent({
      name: 'test',
      setup,
    });

    component(Alpine);

    const directiveCallback = (Alpine.directive as any).mock.calls[0][1];
    const mockEl = document.createElement('div');
    const mockContext = {
      evaluateLater: (expr: string) => (callback: (val: any) => void) => callback(null),
      cleanup: vi.fn(),
    };

    expect(() => {
      directiveCallback(mockEl, { value: '', expression: '', modifiers: [] }, mockContext);
    }).not.toThrow();

    expect(setup).toHaveBeenCalledWith({}, expect.any(Object));
  });
});

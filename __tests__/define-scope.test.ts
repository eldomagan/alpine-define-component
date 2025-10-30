import { describe, it, expect, vi } from 'vitest';
import Alpine from 'alpinejs';
import { defineScope } from '../src/index';

describe('defineScope', () => {
  it('should create a scope with the specified name', () => {
    const scopeHandler = defineScope({
      name: 'myScope',
      setup: () => ({
        value: 'test',
      }),
    });

    expect(scopeHandler).toBeInstanceOf(Function);
  });

  it('should return x-data binding with scope key', () => {
    const scopeHandler = defineScope({
      name: 'testScope',
      setup: () => ({
        count: 0,
      }),
    });

    const mockApi = {} as any;
    const mockEl = document.createElement('div');
    const mockContext = {
      value: null,
      modifiers: [],
      Alpine,
      cleanup: vi.fn(),
      generateId: (prefix: string) => `test-${prefix}`,
    };

    const bindings = scopeHandler(mockApi, mockEl, mockContext);

    expect(bindings).toHaveProperty('x-data');
    expect(bindings['x-data']).toBeInstanceOf(Function);

    const data = bindings['x-data']();
    expect(data).toHaveProperty('$testScope');
  });

  it('should call setup function with api, element, and context', () => {
    const setup = vi.fn(() => ({
      value: 'test',
    }));

    const scopeHandler = defineScope({
      name: 'myScope',
      setup,
    });

    const mockApi = { someMethod: vi.fn() } as any;
    const mockEl = document.createElement('div');
    const mockContext = {
      value: 'context-value',
      modifiers: ['mod1'],
      Alpine,
      cleanup: vi.fn(),
      generateId: (prefix: string) => `test-${prefix}`,
    };

    scopeHandler(mockApi, mockEl, mockContext);

    expect(setup).toHaveBeenCalledWith(mockApi, mockEl, expect.any(Object));

    const callArgs = setup.mock.calls[0] as any[];
    const ctx = callArgs[2];
    expect(ctx.value).toBe('context-value');
    expect(ctx.modifiers).toEqual(['mod1']);
    expect(ctx.Alpine).toBe(Alpine);
    expect(ctx.cleanup).toBeInstanceOf(Function);
    expect(ctx.generateId).toBeInstanceOf(Function);
  });

  it('should provide scoped generateId function', () => {
    let capturedGenerateId: ((s: string) => string) | null = null;

    const scopeHandler = defineScope({
      name: 'myScope',
      setup: (_api, _el, ctx) => {
        capturedGenerateId = ctx.generateId;
        return {};
      },
    });

    const mockContext = {
      value: null,
      modifiers: [],
      Alpine,
      cleanup: vi.fn(),
      generateId: (prefix: string) => `parent-${prefix}`,
    };

    scopeHandler({} as any, document.createElement('div'), mockContext);

    expect(capturedGenerateId).toBeInstanceOf(Function);

    if (capturedGenerateId) {
      const generateId = capturedGenerateId as (s: string) => string;
      const id = generateId('item');
      expect(id).toMatch(/^parent-myScope-\d+:item$/);
    }
  });

  it('should apply additional bindings if provided', () => {
    const bindings = vi.fn((api, scope) => ({
      'x-on:click': () => {},
      'x-bind:data-active': true,
    }));

    const scopeHandler = defineScope({
      name: 'myScope',
      setup: () => ({
        count: 0,
      }),
      bindings,
    });

    const mockApi = { value: 42 } as any;
    const mockEl = document.createElement('div');
    const mockContext = {
      value: null,
      modifiers: [],
      Alpine,
      cleanup: vi.fn(),
      generateId: (prefix: string) => `test-${prefix}`,
    };

    const result = scopeHandler(mockApi, mockEl, mockContext);

    expect(bindings).toHaveBeenCalled();
    expect(result).toHaveProperty('x-on:click');
    expect(result).toHaveProperty('x-bind:data-active');
  });

  it('should pass api and scope to bindings function', () => {
    const bindings = vi.fn(() => ({}));

    const scopeHandler = defineScope({
      name: 'myScope',
      setup: () => ({
        scopeValue: 'test',
      }),
      bindings,
    });

    const mockApi = { apiValue: 42 } as any;
    const mockEl = document.createElement('div');
    const mockContext = {
      value: null,
      modifiers: [],
      Alpine,
      cleanup: vi.fn(),
      generateId: (prefix: string) => `test-${prefix}`,
    };

    scopeHandler(mockApi, mockEl, mockContext);

    expect(bindings).toHaveBeenCalledWith(mockApi, expect.objectContaining({ scopeValue: 'test' }));
  });

  it('should handle bindings returning undefined', () => {
    const scopeHandler = defineScope({
      name: 'myScope',
      setup: () => ({}),
      bindings: () => undefined as any,
    });

    const mockContext = {
      value: null,
      modifiers: [],
      Alpine,
      cleanup: vi.fn(),
      generateId: (prefix: string) => `test-${prefix}`,
    };

    const result = scopeHandler({} as any, document.createElement('div'), mockContext);

    expect(result).toHaveProperty('x-data');
    expect(Object.keys(result).filter((k) => k !== 'x-data')).toHaveLength(0);
  });

  it('should make scope reactive using Alpine.reactive', () => {
    const reactiveSpy = vi.spyOn(Alpine, 'reactive');

    const scopeHandler = defineScope({
      name: 'myScope',
      setup: () => ({
        count: 0,
      }),
    });

    const mockContext = {
      value: null,
      modifiers: [],
      Alpine,
      cleanup: vi.fn(),
      generateId: (prefix: string) => `test-${prefix}`,
    };

    scopeHandler({} as any, document.createElement('div'), mockContext);

    expect(reactiveSpy).toHaveBeenCalledWith(expect.objectContaining({ count: 0 }));
  });

  it('should create unique scope instances', () => {
    const scopeHandler = defineScope({
      name: 'counter',
      setup: () => ({
        count: 0,
        increment() {
          this.count++;
        },
      }),
    });

    const mockContext = {
      value: null,
      modifiers: [],
      Alpine,
      cleanup: vi.fn(),
      generateId: (prefix: string) => `test-${prefix}`,
    };

    const bindings1 = scopeHandler({} as any, document.createElement('div'), mockContext);
    const bindings2 = scopeHandler({} as any, document.createElement('div'), mockContext);

    const scope1 = bindings1['x-data']();
    const scope2 = bindings2['x-data']();

    // Should be different instances
    expect(scope1.$counter).not.toBe(scope2.$counter);
  });
});

import type { Magics as AlpineMagics, Alpine as AlpineType } from 'alpinejs';
import { useId } from './use-id';

export interface PartContext {
  value: any;
  modifiers: string[];
  Alpine: AlpineType;
  cleanup: (callback: () => void) => void;
  generateId: (prefix: string) => string;
}

export interface SetupContext {
  Alpine: AlpineType;
  generateId: (prefix: string) => string;
}

export type PartHandler<Api = unknown> = (
  this: WithAlpineMagics<Api>,
  api: WithAlpineMagics<Api>,
  el: HTMLElement,
  context: PartContext
) => Record<string, any> | void;

type WithAlpineMagics<T> = AlpineMagics<T> & T;

type SetupWithMagics<T> = (
  props: any,
  ctx: SetupContext
) => {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer R
    ? (this: WithAlpineMagics<T>, ...args: Args) => R
    : T[K];
};

export interface ComponentConfig<TApi> {
  name: string;
  setup: (props: any, ctx: SetupContext) => TApi;
  parts?: Record<string, PartHandler<TApi>>;
}

/**
 * TypeScript helper for typing Alpine magics (`$dispatch`, `$watch`, etc.) in methods.
 */
export function setup<T extends Record<string, any>>(
  fn: SetupWithMagics<T>
): ((props: any, ctx: SetupContext) => T) & { __returnType?: T } {
  return fn as any;
}

function toCamelCase(input: string): string {
  return input
    .trim()
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

export function defineComponent<TApi>(
  config: ComponentConfig<TApi>
): (Alpine: AlpineType) => void {
  const { name, setup, parts } = config;

  return (Alpine: AlpineType) => {
    Alpine.magic(toCamelCase(name), (el) => Alpine.$data(el));

    Alpine.addRootSelector(() => `[${Alpine.prefixed(name)}]`);

    Alpine.directive(name, (el, { value: partName, expression, modifiers }, { evaluateLater, cleanup }) => {
      const safeEvaluate = expression.trim() ? evaluateLater(expression) : (cb: (arg0: any) => any) => cb(null);
      safeEvaluate((value: any) => {
        if (!partName) {
          const instanceId = useId(name);
          const generateId = (part: string) => `${instanceId}:${part}`;

          const api = Alpine.reactive(setup(value || {}, { Alpine, generateId }));
          (api as any)._generateId = generateId;

          Alpine.bind(el, {
            'x-id': () => [name],
            'x-data': () => api,
          });

          if (typeof parts?.root === 'function') {
            const bindings = parts.root.call(api as any, api as any, el, {
              value: undefined,
              modifiers,
              Alpine,
              cleanup,
              generateId,
            });

            if (bindings) {
              Alpine.bind(el, bindings);
            }
          }

          return;
        }

        const camelPartName = toCamelCase(partName);
        const handler = parts ? parts[camelPartName] : null;

        if (!handler) return;

        const api = Alpine.$data(el);
        const generateId = (api as any)._generateId;

        const context: PartContext = {
          value,
          modifiers,
          Alpine,
          cleanup,
          generateId,
        };

        const bindings = handler.call(api as any, api as any, el, context) ?? {};

        Alpine.bind(el, {
          'data-part': partName,
          ...bindings,
        });
      });
    }).before('bind');
  };
}

export function defineScope<Api, ScopeName extends string, Scope>(options: {
  name: ScopeName;
  setup: (api: WithAlpineMagics<Api>, el: HTMLElement, ctx: PartContext) => Scope;
  bindings?: (api: WithAlpineMagics<Api>, scope: Scope) => Record<string, any>;
}): PartHandler<Api> {
  return (api, el, ctx) => {
    const prefix = useId(options.name);
    const generateId = (part: string) => {
      return ctx.generateId(`${prefix}:${part}`);
    };

    const scope = ctx.Alpine.reactive(options.setup(api, el, { ...ctx, generateId }));

    const key = `$${options.name}`;

    return {
      'x-data': () => ({ [key]: scope }),
      ...(options.bindings?.(api, scope) ?? {}),
    };
  };
}

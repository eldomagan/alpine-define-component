import type { Magics as AlpineMagics, Alpine as AlpineType } from 'alpinejs';
import { useId, resetIds } from './use-id';
export { resetIds };

export const INTERNALS = Symbol('alpine-define-component');

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

export interface ComponentConfig<TApi extends object, TParts = Record<string, PartHandler<TApi>>> {
  name: string;
  setup: (props: any, ctx: SetupContext) => TApi;
  parts?: TParts | ((helpers: { withScopes: ReturnType<typeof withScopes<TApi>> }) => TParts);
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
    .replace(/^[A-Z]+/, (chars) => chars.toLowerCase());
}

export function defineComponent<TApi extends object, TParts extends Record<string, PartHandler<any>> = Record<string, PartHandler<TApi>>>(
  config: ComponentConfig<TApi, TParts>
): (Alpine: AlpineType) => void {
  const { name, setup } = config;

  const partsConfig = config.parts;
  const parts: Record<string, PartHandler<any>> | undefined =
    typeof partsConfig === 'function'
      ? partsConfig({ withScopes: withScopes<TApi>() })
      : partsConfig;

  return (Alpine: AlpineType) => {
    Alpine.magic(toCamelCase(name), (el) => Alpine.$data(el));

    Alpine.addRootSelector(() => `[${Alpine.prefixed(name)}]`);

    Alpine.directive(name, (el, { value: partName, expression, modifiers }, { evaluateLater, effect, cleanup }) => {
      const safeEvaluate = expression.trim() ? evaluateLater(expression) : (cb: (arg0: any) => any) => cb(null);

      if (!partName) {
        safeEvaluate((value: any) => {
          const instanceId = useId(name);
          const generateId = (part: string) => `${instanceId}:${part}`;

          const props = (value != null && typeof value === 'object' && !Array.isArray(value)) ? value : {};
          const rawApi = setup(props, { Alpine, generateId });
          (rawApi as any)[INTERNALS] = { generateId, scopeCounters: {} as Record<string, number> };
          const api = Alpine.reactive(rawApi);

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
        });

        return;
      }

      const camelPartName = toCamelCase(partName);
      const handler = parts ? parts[camelPartName] : null;

      if (!handler) return;

      const api = Alpine.$data(el);
      const internals = (api as any)[INTERNALS];

      if (!internals) {
        return;
      }

      const { generateId } = internals;

      const reactiveCtx = Alpine.reactive({ value: undefined as any });
      effect(() => safeEvaluate((value: any) => { reactiveCtx.value = value; }));

      const context: PartContext = {
        get value() { return reactiveCtx.value; },
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
    }).before('bind');
  };
}

export function defineScope<Api, ScopeName extends string, Scope>(options: {
  name: ScopeName;
  setup: (api: WithAlpineMagics<Api>, el: HTMLElement, ctx: PartContext) => Scope;
  bindings?: (api: WithAlpineMagics<Api>, scope: Scope) => Record<string, any>;
}): PartHandler<Api> {
  return (api, el, ctx) => {
    const internals = (api as any)[INTERNALS];
    if (!internals) {
      throw new Error(`defineScope("${options.name}"): component internals not found. Is this handler used inside a defineComponent?`);
    }
    const counters = internals.scopeCounters;
    counters[options.name] = (counters[options.name] || 0) + 1;
    const prefix = `${options.name}-${counters[options.name]}`;
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

export function withScopes<TApi>() {
  return <TScopes extends Record<string, any>>(
    parts: Record<string, PartHandler<TApi & TScopes>>
  ): Record<string, PartHandler<TApi & TScopes>> => {
    return parts;
  };
}

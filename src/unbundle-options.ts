import { ImportResolution } from '@run-z/npk';
import { NullValue } from 'rollup';
import { UnbundleRequest } from './unbundle-request.js';

/**
 * Unbundle plugin options.
 */
export interface UnbundleOptions {
  /**
   * Resolution root of the imports.
   *
   * One of:
   *
   * - path to the root package directory,
   * - an `ImportResolution` instance (may cause issues with watch mode), or
   * - a function returning `ImportResolution` instance or a promise-like instance resolving to one.
   *
   * By default, new resolution root will be created for the package in current working directory.
   */
  readonly resolutionRoot?:
    | string
    | ImportResolution
    | (() => ImportResolution | PromiseLike<ImportResolution>)
    | undefined;

  /**
   * Decides whether to bundle the module or not.
   *
   * The decision on bundling or externalizing each module will be made based on how the
   * {@link UnbundleRequest#resolutionRoot root module} depends on
   * {@link UnbundleRequest#resolveModule target} one:
   *
   * - Implied, runtime and peer dependencies will be externalized.
   * - For self-dependencies and synthetic ones no decision will be made.
   *   Rollup will decide then how to bundle them. I.e. which chunk to place them into.
   * - The rest of the dependencies (such as development, and self-dependencies) will be bundled.
   *
   * @param request - Unbundle request.
   *
   * @returns `true` to externalize module, `false` to bundle it, `null`/`undefined` to make Rollup to decide,
   * or a promise-like instance resolved to one of the above.
   */
  isExternal?(request: UnbundleRequest): boolean | NullValue | PromiseLike<boolean | NullValue>;
}

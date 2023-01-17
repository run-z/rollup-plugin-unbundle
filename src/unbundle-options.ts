import { NullValue } from 'rollup';
import { ImportResolution } from './api/import-resolution.js';
import { UnbundleRequest } from './unbundle-request.js';

/**
 * Unbundle plugin options.
 */
export interface UnbundleOptions {
  /**
   * Imports resolution root.
   *
   * Either a path to the root package, or an {@link rollup-plugin-unbundle/api!ImportResolution ImportResolution}
   * class instance.
   *
   * By default, new resolution root will be created for {@link rollup-plugin-unbundle/api!resolveRootPackage
   * current package}.
   */
  readonly resolutionRoot?: string | ImportResolution | undefined;

  /**
   * Decides whether to bundle the module or not.
   *
   * The decision on bundling or externalizing each module will be made based on how the
   * {@link UnbundleRequest#resolutionRoot root module}
   * {@link rollup-plugin-unbundle/api!ImportResolution#resolveDependency depends} on
   * {@link {@link UnbundleRequest#resolveModule target} one:
   *
   * - Implied, runtime and peer dependencies will be externalized.
   * - For self-dependencies and synthetic ones no decision will be made.
   *   Rollup will decide then how to bundle them. I.e. which chunk to place them into.
   * - The rest of the dependencies (such as development, and self-dependencies) will be bundled.
   *
   * @param request - Unbundle request.
   *
   * @returns `true` to externalize module, `false` to bundle it, or `null`/`undefined` to make Rollup to decide.
   */
  external?(request: UnbundleRequest): boolean | NullValue;
}

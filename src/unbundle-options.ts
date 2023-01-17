import { ImportResolution } from './api/import-resolution.js';

/**
 * Unbundle plugin options.
 */
export interface UnbundleOptions {
  /**
   * Resolution root.
   *
   * The decision on bundling or externalizing each module will be made based on how the root module
   * {@link rollup-plugin-unbundle/api!ImportResolution#resolveDependency depends} on target one:
   *
   * - Implied, runtime and peer dependencies will be externalized.
   * - For self-dependencies and synthetic ones no decision will be made.
   *   Rollup will decide then how to bundle them. I.e. which chunk to place them into.
   * - The rest of the dependencies (such as development, and self-dependencies) will be bundled.
   *
   * By default, new resolution root will be created for {@link  rollup-plugin-unbundle/api!resolveRootPackage
   * current package}.
   */
  readonly resolutionRoot?: ImportResolution | undefined;
}

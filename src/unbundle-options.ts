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
   * - For synthetic one no decision will be made. I.e. they will be bundled, unless overridden by `external` option.
   * - The rest of the dependencies (such as development, and self-dependencies) will be bundled.
   *
   * By default, new resolution root will be created for {@link  rollup-plugin-unbundle/api!resolveRootPackage
   * current package}.
   */
  readonly resolutionRoot?: ImportResolution | undefined;
}

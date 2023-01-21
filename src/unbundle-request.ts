import { NullValue } from 'rollup';
import { ImportResolution } from './api/import-resolution.js';

/**
 * A request for check whether the module should be bundled or not.
 *
 * An instance of this class is passed to custom {@link UnbundleOptions#external external} method.
 *
 * The properties of this class correspond to [external] Rollup option parameters.
 *
 * [external]: https://rollupjs.org/guide/en/#external
 */
export interface UnbundleRequest {
  /**
   * Imports resolution root.
   *
   * Either the one passed as a plugin {@link UnbundleOptions#resolutionRoot option}, otr the one created automatically.
   */
  get resolutionRoot(): ImportResolution;

  /**
   * The identifier of the module in question.
   */
  get moduleId(): string;

  /**
   * Whether the module {@link moduleId identifier} has been resolved by e.g. plugins.
   */
  get isResolved(): boolean;

  /**
   * The identifier of the module doing the import.
   */
  get importerId(): string | undefined;

  /**
   * Resolves the module doing the import.
   *
   * @returns Either resolved {@link importerId importer module}, or {@link resolutionRoot resolution root}
   * when the latter is missing.
   */
  resolveImporter(): ImportResolution;

  /**
   * Resolves the {@link moduleId module in question}.
   *
   * @returns Imported module resolution.
   */
  resolveModule(): ImportResolution;

  /**
   * Checks whether the module should be bundled or not according to default plugin logic.
   *
   * This can be used to retain the default plugin functionality for some modules.
   *
   * @returns `true` to externalize the module, `false` to bundle it, or `null`/`undefined` to make Rollup to decide.
   */
  isExternal(): boolean | NullValue;
}

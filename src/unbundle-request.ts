import type { ImportResolution } from '@run-z/npk';

/**
 * A request for check whether the module should be bundled or not.
 *
 * An instance of this class is passed to custom {@link UnbundleOptions#isExternal isExternal} method.
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
   * Resolution request rewritten by this one.
   *
   * Resolutions may be chained. E.g. when `node-resolve` module resolves the module, it tries to continue resolution
   * of just resolved identifier. This property would contain the original request in such case.
   */
  get rewrittenRequest(): UnbundleRequest | undefined;

  /**
   * Resolves the module doing the import.
   *
   * @returns Promise resolved to either {@link resolveModule importer module}, or {@link resolutionRoot resolution
   * root} when the latter is missing.
   */
  resolveImporter(): Promise<ImportResolution>;

  /**
   * Resolves the {@link moduleId module in question}.
   *
   * @returns Promise resolved to imported module.
   */
  resolveModule(): Promise<ImportResolution>;

  /**
   * Checks whether the module should be bundled or not according to default plugin logic.
   *
   * This can be used to retain the default plugin functionality for some modules.
   *
   * @returns Promise resolved to `true` to externalize the module, `false` to bundle it, or `undefined` to make Rollup
   * to decide.
   */
  isExternal(): Promise<boolean | undefined>;
}

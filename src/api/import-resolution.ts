import { ImportDependency } from './import-dependency.js';
import { PackageResolution } from './package-resolution.js';

/**
 * Imported module resolution.
 *
 * May represent imported package, virtual Rollup module, some import URI, or anything else.
 */
export interface ImportResolution {
  /**
   * Root module resolution.
   *
   * This is typically a package resolution created by {@link resolveRootPackage} function.
   */
  get root(): ImportResolution;

  /**
   * Unique URI of imported module.
   */
  get uri(): string;

  /**
   * Resolves another module imported by this one.
   *
   * @param spec - Imported module specifier.
   *
   * @returns Imported module resolution.
   */
  resolveImport(spec: string): ImportResolution;

  /**
   * Checks how the resolved module depend on `another` one.
   *
   * Follows transient dependencies for packages.
   *
   * @param another - The package to check.
   *
   * @returns Either dependency descriptor, or `null` if the module does not depend on `another` one.
   */
  dependsOn(another: ImportResolution): ImportDependency | null;

  /**
   * Represents this module resolution as package resolution, if possible.
   *
   * @returns `this` instance for package resolution, or `undefined` otherwise.
   */
  asPackageResolution(): PackageResolution | undefined;
}

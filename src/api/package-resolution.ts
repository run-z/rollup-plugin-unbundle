import { ImportResolver } from '../impl/import-resolver.js';
import { Package$Resolution } from '../impl/package.resolution.js';
import { ImportResolution } from './import-resolution.js';
import { Import } from './import.js';
import { NodePackageFS } from './node-package-fs.js';
import { PackageFS } from './package-fs.js';
import { PackageJson } from './package-json.js';

/**
 * Imported NodeJS package {@link ImportResolution resolution}.
 *
 * The package is a directory with `package.json` file.
 */
export interface PackageResolution extends ImportResolution {
  /**
   * The package is a host inside of itself.
   */
  get host(): this;

  /**
   * URI of package directory.
   */
  get uri(): string;

  get importSpec(): Import.Package;

  /**
   * `package.json` contents.
   */
  get packageJson(): PackageJson;

  /**
   * Full resolved package name as specified in `package.json`.
   */
  get name(): string;

  /**
   * Resolved package scope. I.e. the part of the {@link name} after `@` prefix, if any.
   */
  get scope(): string | undefined;

  /**
   * Local name within resolved package {@link scope}.
   *
   * Part of the name after the the slash `/` for scoped package, or the name itself for unscoped one.
   */
  get localName(): string;

  /**
   * Resolved package version.
   */
  get version(): string;

  asPackage(): this;
}

/**
 * Resolves root NodeJS package.
 *
 * Creates new resolution root. Further resolutions should be made against it.
 *
 * @param dirOrFS - Either path to package directory, or {@link PackageFS package file system} instance. Defaults
 * to current working directory.
 *
 * @returns Package resolution.
 */
export function resolveRootPackage(dirOrFS?: string | PackageFS): PackageResolution {
  const packageFS =
    dirOrFS == null || typeof dirOrFS === 'string' ? new NodePackageFS(dirOrFS) : dirOrFS;

  return new ImportResolver({
    createRoot: resolver => new Package$Resolution(resolver, packageFS.root),
    packageFS,
  }).root.asPackage()!;
}

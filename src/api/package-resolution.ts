import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { ImportResolver } from '../impl/import-resolver.js';
import { Package$Resolution } from '../impl/package.resolution.js';
import { ImportResolution } from './import-resolution.js';
import { Import } from './import.js';
import { PackageJson } from './package-json.js';

/**
 * Imported NodeJS package {@link ImportResolution resolution}.
 *
 * The package is a directory with `package.json` file.
 */
export interface PackageResolution extends ImportResolution {
  /**
   * File URL of {@link dir root package directory}.
   */
  get uri(): `file:///${string}`;

  get importSpec(): Import.Package;

  /**
   * Absolute path to root package directory.
   */
  get dir(): string;

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

  asPackageResolution(): this;
}

/**
 * Resolves root NodeJS package.
 *
 * Creates new resolution root. Further resolutions should be made against it.
 *
 * @param dir - Path to package directory. Defaults to current working directory.
 *
 * @returns Package resolution.
 */
export function resolveRootPackage(dir = process.cwd()): PackageResolution {
  return new ImportResolver(
    resolver => new Package$Resolution(resolver, pathToFileURL(dir).href as `file:///${string}`),
  ).root.asPackageResolution()!;
}

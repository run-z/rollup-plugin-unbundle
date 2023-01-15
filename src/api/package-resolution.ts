import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { ImportResolver } from '../impl/import-resolver.js';
import { Package$Resolution } from '../impl/package.resolution.js';
import { ModuleResolution } from './module-resolution.js';
import { PackageJson } from './package-json.js';

/**
 * Imported NodeJS package {@link ModuleResolution resolution}.
 *
 * The package is a directory with `package.json` file.
 */
export interface PackageResolution extends ModuleResolution {
  /**
   * File URL of {@link dir root package directory}.
   */
  get uri(): `file:///${string}`;

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

  /**
   * Checks whether the resolved package depend on `another` module.
   *
   * Follows transient dependencies.
   *
   * @param another - The package to check.
   *
   * @returns Either kind of dependency, or `false` if this package does not depend on `another` one.
   */
  dependsOn(another: ModuleResolution): ModuleResolution.DependencyKind | false;

  toPackageResolution(): this;
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

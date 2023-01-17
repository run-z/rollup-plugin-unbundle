import { Import } from './import.js';
import { PackageJson } from './package-json.js';
import { PackageResolution } from './package-resolution.js';

/**
 * Virtual file system to work with packages.
 *
 * File system deals with URIs rather with OS-dependent paths.
 *
 * By default, a {@link NodePackageFS Node.js-specific file system} implementation is used.
 */
export abstract class PackageFS {

  /**
   * URI of the root package.
   */
  abstract get root(): string;

  /**
   * Extracts package URI from the given URI import specifier can be used to access packages.
   *
   * @param importSpec - Absolute URI import specifier.
   *
   * @returns Either package URI, or `undefined` if the URI can not be used to access packages.
   */
  abstract getPackageURI(importSpec: Import.URI): string | undefined;

  /**
   * Tries to load `package.json` from the given directory.
   *
   * @param uri - Source directory.
   *
   * @returns Either loaded `package.json` contents, or `undefined` if directory does not contain valid `package.json`
   * file.
   */
  abstract loadPackageJson(uri: string): PackageJson | undefined;

  /**
   * Finds parent directory.
   *
   * @param uri - File or directory URI.
   *
   * @returns Either URI of the parent directory, or `undefined` if there is no one.
   */
  abstract parentDir(uri: string): string | undefined;

  /**
   * Resolves a package by name against another one.
   *
   * @param relativeTo - Package to resolve another one against.
   * @param name - Package name to resolve.
   *
   * @returns URI of the resolved package directory.
   */
  abstract resolvePackage(relativeTo: PackageResolution, name: string): string;

  /**
   * Searches for package directory containing the given file or URI.
   *
   * @param uri - URI of the target file or directory.
   *
   * @returns Either enclosing package directory, or `undefined` if not found.
   */
  findPackageDir(uri: string): PackageFS.PackageDir | undefined {
    const packageJson = this.loadPackageJson(uri);

    if (packageJson) {
      return {
        uri,
        packageJson,
      };
    }

    // No valid `package.json` found in directory.
    // Try the parent directory.
    const parentURI = this.parentDir(uri);

    if (!parentURI) {
      // No parent directory.
      return;
    }

    return this.findPackageDir(parentURI);
  }

}

export namespace PackageFS {
  /**
   * Package directory representation.
   *
   * Such directory contains valid `package.json` file.
   */
  export interface PackageDir {
    /**
     * Directory URI.
     */
    readonly uri: string;

    /**
     * Contents of valid `package.json` file the directory contains.
     */
    readonly packageJson: PackageJson;
  }
}

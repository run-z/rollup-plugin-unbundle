import { parseRange } from '../impl/parse-range.js';
import { Import } from './import.js';
import { PackageFS } from './package-fs.js';
import { PackageJson } from './package-json.js';
import { PackageResolution } from './package-resolution.js';

/**
 * Virtual package file system.
 *
 * Serves packages registered with {@link VirtualPackageFS#addPackage addPackage} method.
 *
 * Package URIs has to have `package:` scheme.
 *
 * Can be used e.g. for testing.
 */
export class VirtualPackageFS extends PackageFS {

  readonly #root: string;
  readonly #byURI = new Map<string, PackageFS.PackageDir>();
  readonly #byName = new Map<string, Map<string, PackageFS.PackageDir>>();

  /**
   * Constructs virtual package file system.
   *
   * @param root - Root package URI. `package:root` by default.
   */
  constructor(root = 'package:root') {
    super();
    this.#root = root;
  }

  override get root(): string {
    return this.#root;
  }

  /**
   * Registers virtual package with automatically generated URI.
   *
   * Replaces package under the same URI.
   *
   * Replaces package with the same name and version, unless `allowDuplicate` parameter is set.
   *
   * @param uri - Package URI.
   * @param packageJson - `package.json` contents.
   * @param allowDuplicate - Permit package with the same name. `false` by default.
   *
   * @returns `this` instance.
   */
  addPackage(packageJson: PackageJson, allowDuplicate?: boolean): this;

  /**
   * Registers virtual package at the given URI.
   *
   * Replaces package under the same URI.
   *
   * Replaces package with the same name and version, unless `allowDuplicate` parameter is set.
   *
   * @param uri - Package URI.
   * @param packageJson - `package.json` contents.
   *
   * @returns `this` instance.
   */
  addPackage(uri: string, packageJson: PackageJson, allowDuplicate?: boolean): this;

  addPackage(
    uriOrPackageJson: string | PackageJson,
    packageJsonOrAllowDuplicate?: PackageJson | boolean,
    allowDuplicate?: boolean,
  ): this {
    let uri: string;
    let packageJson: PackageJson;

    if (typeof uriOrPackageJson === 'string') {
      uri = this.#toPackageURI(uriOrPackageJson);
      packageJson = packageJsonOrAllowDuplicate as PackageJson;
    } else {
      packageJson = uriOrPackageJson;
      uri = `package:${packageJson.name}/${packageJson.version}`;
    }

    if (!allowDuplicate) {
      const existing = this.#byURI.get(uri);

      if (existing) {
        this.#removeNamedPackage(existing.packageJson);
      }
    }

    this.#addPackage({ uri, packageJson });

    return this;
  }

  #addPackage(packageDir: PackageFS.PackageDir): void {
    const { uri, packageJson } = packageDir;
    const { name, version } = packageJson;
    let byVersion = this.#byName.get(name);

    if (!byVersion) {
      byVersion = new Map();
      this.#byName.set(name, byVersion);
    }

    const existing = byVersion.get(version);

    if (existing) {
      byVersion.delete(version);
      this.#byURI.delete(existing.uri);
    }

    byVersion.set(version, packageDir);
    this.#byURI.set(uri, packageDir);
  }

  #removeNamedPackage({ name, version }: PackageJson): void {
    const byVersion = this.#byName.get(name)!; // Won't be called for non-existing package.
    const existing = byVersion.get(version)!; // Won't be called for non-existing package version.

    byVersion.delete(version);
    if (!byVersion.size) {
      this.#byName.delete(name);
    }

    this.#byURI.delete(existing.uri);
  }

  override recognizePackageURI(importSpec: Import.URI): string | undefined {
    return importSpec.scheme === 'package' ? importSpec.spec : undefined;
  }

  override loadPackageJson(uri: string): PackageJson | undefined {
    return this.#byURI.get(uri)?.packageJson;
  }

  override parentDir(uri: string): string | undefined {
    const httpURL = this.#toHttpURL(uri);
    const path = httpURL.pathname;

    if (!path.endsWith('/')) {
      httpURL.pathname = path + '/';
    }

    const parentURL = new URL('..', httpURL);

    if (parentURL.pathname === httpURL.pathname) {
      return;
    }

    return this.#toPackageURI(parentURL);
  }

  override resolvePath(relativeTo: PackageResolution, path: string): string | URL {
    return this.#toPackageURI(new URL(path, this.#toHttpURL(relativeTo.uri)));
  }

  override resolveName(relativeTo: PackageResolution, name: string): string | undefined {
    const { packageJson } = relativeTo;
    const { dependencies, peerDependencies, devDependencies } = packageJson;

    return (
      this.#resolveDep(name, dependencies)
      ?? this.#resolveDep(name, peerDependencies)
      ?? this.#resolveDep(name, devDependencies)
    );
  }

  #resolveDep(name: string, dependencies?: PackageJson.Dependencies): string | undefined {
    if (!dependencies) {
      return;
    }

    const range = parseRange(dependencies[name]);

    if (!range) {
      return;
    }

    const byVersion = this.#byName.get(name);

    if (byVersion) {
      for (const [version, { uri }] of byVersion) {
        if (range.test(version)) {
          return uri;
        }
      }
    }

    return;
  }

  #toPackageURI(uri: string | URL): string {
    let pathname = (typeof uri === 'string' ? new URL(uri) : uri).pathname;

    if (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    return 'package:' + (pathname.startsWith('/') ? pathname.slice(1) : pathname);
  }

  #toHttpURL(uri: string): URL {
    const pathname = new URL(uri).pathname;

    return new URL(pathname.startsWith('/') ? pathname : `/${pathname}`, 'file:///');
  }

}

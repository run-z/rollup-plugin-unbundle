import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import semver from 'semver';
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
   * @param root - Root package URI. `package:///root` by default.
   */
  constructor(root = 'package:///root') {
    super();
    this.#root = root;
  }

  override get root(): string {
    return this.#root;
  }

  /**
   * Registers virtual package.
   *
   * Replaces package under the same URI.
   *
   * Replaces package with the same name and version.
   *
   * @param uri - Package URI.
   * @param packageJson - `package.json` contents.
   *
   * @returns `this` instance.
   */
  addPackage(uri: string, packageJson: PackageJson): this {
    uri = this.#toPackageURI(uri);

    const existing = this.#byURI.get(uri);

    if (existing) {
      this.#removeNamedPackage(existing.packageJson);
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
    const byVersion = this.#byName.get(name);

    if (!byVersion) {
      return;
    }

    const existing = byVersion.get(version);

    if (!existing) {
      return;
    }

    byVersion.delete(version);
    if (!byVersion.size) {
      this.#byName.delete(name);
    }

    this.#byURI.delete(existing.uri);
  }

  override getPackageURI(importSpec: Import.URI): string | undefined {
    return importSpec.scheme === 'package' ? importSpec.spec : undefined;
  }

  override loadPackageJson(uri: string): PackageJson | undefined {
    return this.#byURI.get(uri)?.packageJson;
  }

  override parentDir(uri: string): string | undefined {
    const uriPath = this.#toFilePath(uri);
    const parentPath = dirname(uriPath);

    return parentPath !== uriPath ? this.#toPackageURI(pathToFileURL(parentPath).href) : undefined;
  }

  override resolvePackage(relativeTo: PackageResolution, name: string): string;

  override resolvePackage({ uri }: PackageResolution, name: string): string {
    const packageDir = this.#byURI.get(uri);

    if (!packageDir) {
      throw new ReferenceError(`No package found at <${uri}>`);
    }

    const { packageJson } = packageDir;
    const { dependencies, devDependencies, peerDependencies } = packageJson;
    const found =
      this.#resolveDep(name, dependencies)
      ?? this.#resolveDep(name, devDependencies)
      ?? this.#resolveDep(name, peerDependencies);

    if (found) {
      return found;
    }

    throw new ReferenceError(
      `Can not resolve dependency "${name}" of "${packageJson.name}@${packageJson.version}" at <${packageDir.uri}>`,
    );
  }

  #resolveDep(name: string, dependencies?: PackageJson.Dependencies): string | undefined {
    if (!dependencies) {
      return;
    }

    const range = dependencies[name];

    if (range == null) {
      return;
    }

    const byVersion = this.#byName.get(name);

    if (byVersion) {
      for (const [version, { uri }] of byVersion) {
        if (semver.satisfies(version, range)) {
          return uri;
        }
      }
    }

    throw new ReferenceError(`No package "${name}@${range}" found`);
  }

  #toPackageURI(uri: string): string {
    const pathname = new URL(uri).pathname;

    return new URL(pathname.startsWith('/') ? pathname : `/${pathname}`, 'package:///').href;
  }

  #toFilePath(uri: string): string {
    const pathname = new URL(uri).pathname;

    return fileURLToPath(new URL(pathname.startsWith('/') ? pathname : `/${pathname}`, 'file:///'));
  }

}

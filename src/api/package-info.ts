import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import semver from 'semver';
import { ImportResolver } from './import-resolver.js';
import { PackageJson } from './package-json.js';
import { PackageName } from './package-name.js';

/**
 * Package info.
 */
export class PackageInfo {

  readonly #importResolver: ImportResolver;
  readonly #url: string;
  #packageJson: PackageJson | undefined;
  #name?: PackageName;
  readonly #dependencies = new Map<string, Map<string, false | PackageDep[]>>();
  #requireModule?: NodeRequire;

  /**
   * Constructs package info.
   *
   * @param importResolver - Import resolver to use to resolve dependencies.
   * @param url - URL the package.
   * @param packageJson - `package.json` contents. Will be loaded if omitted.
   */
  constructor(importResolver: ImportResolver, url: string, packageJson?: PackageJson) {
    this.#importResolver = importResolver;
    this.#url = url;
    this.#packageJson = packageJson;
  }

  /**
   * Import resolver used to resolve dependencies.
   */
  get importResolver(): ImportResolver {
    return this.#importResolver;
  }

  /**
   * URL of the package.
   */
  get url(): string {
    return this.#url;
  }

  /**
   * `package.json` contents.
   */
  get packageJson(): PackageJson {
    return (this.#packageJson ??= JSON.parse(
      fs.readFileSync(path.resolve(fileURLToPath(this.url), 'package.json'), 'utf-8'),
    ) as PackageJson);
  }

  /**
   * Full package name.
   */
  get name(): string {
    return this.#packageName.name;
  }

  /**
   * Package scope.
   */
  get scope(): string | undefined {
    return this.#packageName.scope;
  }

  /**
   * Local package name within scope.
   */
  get localName(): string {
    return this.#packageName.localName;
  }

  /**
   * Package version.
   */
  get version(): string {
    return this.packageJson.version;
  }

  get #packageName(): PackageName {
    return (this.#name ??= new PackageName(this.packageJson.name));
  }

  /**
   * Checks whether this package depend on `another` one.
   *
   * Follows transient dependencies.
   *
   * @param another - The package to check.
   *
   * @returns Either kind of dependency, or `false` if this package does not depend on `another` one.
   */
  dependsOn(another: PackageInfo): PackageInfo.DependencyKind | false {
    const { name, version } = another;
    const depsByVersion = this.#dependencies.get(name);

    if (depsByVersion) {
      const deps = depsByVersion.get(version);

      if (deps) {
        const match = deps.find(({ range }) => semver.satisfies(version, range));

        if (match) {
          return match.kind;
        }
      } else if (deps != null) {
        return false;
      }
    }

    const { dependencies, devDependencies, peerDependencies } = this.packageJson;

    const depends =
      this.#establishDep(another, dependencies, true)
      || this.#establishDep(another, peerDependencies, 'peer')
      || this.#establishDep(another, devDependencies, 'dev');

    if (!depends) {
      this.#saveDep(another, false);
    }

    return depends;
  }

  #establishDep(
    pkg: PackageInfo,
    dependencies: PackageJson.Dependencies | undefined,
    kind: PackageInfo.DependencyKind,
  ): PackageInfo.DependencyKind | false {
    if (!dependencies) {
      return false;
    }

    const { name, version } = pkg;
    const range = dependencies[name];

    if (!range || !semver.satisfies(version, range)) {
      if (!this.#hasTransientDep(pkg, dependencies)) {
        return false;
      }
    }

    this.#saveDep(pkg, { kind, range, pkg });

    return kind;
  }

  #saveDep({ name, version }: PackageInfo, dep: PackageDep | false): void {
    let depsByVersion = this.#dependencies.get(name);

    if (depsByVersion == null) {
      depsByVersion = new Map();
      this.#dependencies.set(name, depsByVersion);
    }

    let deps = depsByVersion.get(version);

    if (!deps || !dep) {
      deps = dep ? [dep] : dep;
      depsByVersion.set(version, deps);
    } else {
      deps.push(dep);
    }
  }

  #hasTransientDep(
    pkg: PackageInfo,
    dependencies: PackageJson.Dependencies | undefined,
  ): PackageInfo.DependencyKind | false {
    if (!dependencies) {
      return false;
    }

    for (const [depName, depRange] of Object.entries(dependencies)) {
      const depends = this.importResolver
        .findPackage(depName, depRange, () => this.#resolveDep(depName))
        .dependsOn(pkg);

      if (depends) {
        return depends;
      }
    }

    return false;
  }

  #resolveDep(depName: string): PackageInfo {
    this.#requireModule ??= createRequire(this.url);

    const url = pathToFileURL(this.#requireModule.resolve(depName)).href;

    return new PackageInfo(this.importResolver, url);
  }

}

export namespace PackageInfo {
  /**
   * Kind of package dependency.
   *
   * One of:
   *
   * - `true` for runtime (production) dependency.
   * - `dev` for development dependency.
   * - `peer` for peer dependency.
   */
  export type DependencyKind = true | 'dev' | 'peer';
}

interface PackageDep {
  readonly kind: PackageInfo.DependencyKind;
  readonly range: string;
  readonly pkg: PackageInfo;
}

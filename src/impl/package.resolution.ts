import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import semver from 'semver';
import { ImportResolution } from '../api/import-resolution.js';
import { ImportSpecifier, parseImportSpecifier } from '../api/import-specifier.js';
import { PackageJson } from '../api/package-json.js';
import { PackageResolution } from '../api/package-resolution.js';
import { ImportResolver } from './import-resolver.js';
import { Import$Resolution } from './import.resolution.js';

export class Package$Resolution extends Import$Resolution implements PackageResolution {

  readonly #resolver: ImportResolver;
  readonly #dir: string;
  #packageJson: PackageJson | undefined;
  #name?: ImportSpecifier.Package;
  readonly #dependencies = new Map<string, Map<string, false | PackageDep[]>>();
  #requireModule?: NodeRequire;

  constructor(resolver: ImportResolver, uri: `file:///${string}`, packageJson?: PackageJson) {
    super(resolver, uri);
    this.#resolver = resolver;
    this.#dir = fileURLToPath(uri);
    this.#packageJson = packageJson;
  }

  get dir(): string {
    return this.#dir;
  }

  /**
   * `package.json` contents.
   */
  get packageJson(): PackageJson {
    return (this.#packageJson ??= JSON.parse(
      fs.readFileSync(path.resolve(this.dir, 'package.json'), 'utf-8'),
    ) as PackageJson);
  }

  get name(): string {
    return this.packageJson.name;
  }

  get scope(): string | undefined {
    return this.#packageName.scope;
  }

  get localName(): string {
    return this.#packageName.local;
  }

  get #packageName(): ImportSpecifier.Package {
    if (this.#name) {
      return this.#name;
    }

    const spec = parseImportSpecifier(this.name);

    if (spec.kind !== 'package') {
      throw new TypeError(`Invalid package name: ${this.name}`);
    }

    return (this.#name = spec);
  }

  get version(): string {
    return this.packageJson.version;
  }

  override resolveImport(spec: string): ImportResolution {
    const parsedSpec = parseImportSpecifier(spec);

    switch (parsedSpec.kind) {
      case 'uri':
        if (parsedSpec.scheme === 'file') {
          return this.#resolveFileImport(spec);
        }

        // Unknown import URI.
        return this.#resolver.resolveURI(spec);
      case 'path':
        return this.#resolveFileImport(spec);
      case 'package':
        return this.#resolvePackage(parsedSpec.name);
      default:
        return this.#resolver.resolve(parsedSpec);
    }
  }

  #resolveFileImport(path: string): ImportResolution {
    const uri = new URL(path, this.uri).href as `file:///${string}`;

    return this.#resolver.resolveURI(uri, () => this.#discoverPackage(uri));
  }

  #resolvePackage(name: string): ImportResolution {
    return this.#resolver.resolveName(name, '*', () => this.#resolveDep(name));
  }

  #discoverPackage(uri: string): ImportResolution | undefined {
    return this.#findPackageInDir(path.dirname(fileURLToPath(uri)));
  }

  #findPackageInDir(dir: string): ImportResolution | undefined {
    const packageJson = this.#hasNodeModules(dir) && this.#loadPackageJson(dir);

    if (packageJson) {
      const uri = pathToFileURL(dir).href as `file:///${string}`;

      return this.#resolver.resolveURI(
        uri,
        () => new Package$Resolution(this.#resolver, uri, packageJson),
      );
    }

    // No valid `package.json` found in directory.
    // Try the parent directory.
    const parentDir = path.dirname(dir);

    if (parentDir === dir) {
      // No parent directory.
      return;
    }

    return this.#findPackageInDir(dir);
  }

  #hasNodeModules(dir: string): boolean {
    try {
      return fs.statSync(path.resolve(dir, 'node_modules')).isDirectory();
    } catch (error) {
      return false;
    }
  }

  #loadPackageJson(dir: string): PackageJson | undefined {
    const filePath = path.resolve(dir, 'package.json');

    try {
      if (!fs.statSync(filePath).isFile()) {
        return;
      }
    } catch (error) {
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Partial<PackageJson>;

    if (packageJson.name && packageJson.version) {
      // Valid `package.json`?
      return packageJson as PackageJson;
    }

    return;
  }

  override asPackageResolution(): this {
    return this;
  }

  dependsOn(another: ImportResolution): ImportResolution.DependencyKind | false {
    const pkg = another.asPackageResolution();

    if (!pkg) {
      return false;
    }

    const { name, version } = pkg;
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
      this.#establishDep(pkg, dependencies, true)
      || this.#establishDep(pkg, peerDependencies, 'peer')
      || this.#establishDep(pkg, devDependencies, 'dev');

    if (!depends) {
      this.#saveDep(pkg, false);
    }

    return depends;
  }

  #establishDep(
    pkg: PackageResolution,
    dependencies: PackageJson.Dependencies | undefined,
    kind: ImportResolution.DependencyKind,
  ): ImportResolution.DependencyKind | false {
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

  #saveDep({ name, version }: PackageResolution, dep: PackageDep | false): void {
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
    pkg: PackageResolution,
    dependencies: PackageJson.Dependencies | undefined,
  ): ImportResolution.DependencyKind | false {
    if (!dependencies) {
      return false;
    }

    for (const [depName, depRange] of Object.entries(dependencies)) {
      const depends = this.#resolver
        .resolveName(depName, depRange, () => this.#resolveDep(depName))
        .dependsOn(pkg);

      if (depends) {
        return depends;
      }
    }

    return false;
  }

  #resolveDep(depName: string): PackageResolution {
    this.#requireModule ??= createRequire(this.uri);

    const url = pathToFileURL(this.#requireModule.resolve(depName)).href;

    return new Package$Resolution(this.#resolver, url as `file:///${string}`);
  }

}

export interface Package$Resolution extends PackageResolution {
  get uri(): `file:///${string}`;
}

interface PackageDep {
  readonly kind: ImportResolution.DependencyKind;
  readonly range: string;
  readonly pkg: PackageResolution;
}

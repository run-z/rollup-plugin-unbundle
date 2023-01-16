import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import semver from 'semver';
import { DependencyResolution } from '../api/dependency-resolution.js';
import { ImportResolution } from '../api/import-resolution.js';
import { Import, recognizeImport } from '../api/import.js';
import { PackageJson } from '../api/package-json.js';
import { PackageResolution } from '../api/package-resolution.js';
import { ImportResolver } from './import-resolver.js';
import { Import$Resolution } from './import.resolution.js';

export class Package$Resolution extends Import$Resolution implements PackageResolution {

  readonly #resolver: ImportResolver;
  readonly #dir: string;
  #packageJson: PackageJson | undefined;
  #name?: Import.Package;
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

  get #packageName(): Import.Package {
    if (this.#name) {
      return this.#name;
    }

    const spec = recognizeImport(this.name);

    if (spec.kind !== 'package') {
      throw new TypeError(`Invalid package name: ${this.name}`);
    }

    return (this.#name = spec);
  }

  get version(): string {
    return this.packageJson.version;
  }

  override resolveImport(spec: Import | string): ImportResolution {
    spec = recognizeImport(spec);

    switch (spec.kind) {
      case 'uri':
        if (spec.scheme === 'file') {
          return this.#resolveFileImport(spec.spec);
        }

        // Unknown import URI.
        return this.#resolver.resolveURI(spec.spec);
      case 'path':
        return this.#resolveFileImport(spec.spec);
      case 'package':
        return this.#resolvePackage(spec.name);
      default:
        return this.#resolver.resolve(spec);
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

  override resolveDependency(another: ImportResolution): DependencyResolution | null {
    const importDependency = super.resolveDependency(another);

    if (importDependency) {
      return importDependency;
    }

    const pkg = another.asPackageResolution();

    if (!pkg) {
      return null;
    }

    const { name, version } = pkg;
    const depsByVersion = this.#dependencies.get(name);

    if (depsByVersion) {
      const deps = depsByVersion.get(version);

      if (deps) {
        const match = deps.find(({ range }) => semver.satisfies(version, range));

        if (match) {
          return { kind: match.kind };
        }
      } else if (deps != null) {
        return null;
      }
    }

    const { dependencies, devDependencies, peerDependencies } = this.packageJson;

    const dependency =
      this.#establishDep(pkg, dependencies, 'runtime')
      || this.#establishDep(pkg, peerDependencies, 'peer')
      || this.#establishDep(pkg, devDependencies, 'dev');

    if (!dependency) {
      this.#saveDep(pkg, false);
    }

    return dependency;
  }

  #establishDep(
    pkg: PackageResolution,
    dependencies: PackageJson.Dependencies | undefined,
    kind: DependencyResolution['kind'],
  ): DependencyResolution | null {
    if (!dependencies) {
      return null;
    }

    const { name, version } = pkg;
    const range = dependencies[name];

    if (!range || !semver.satisfies(version, range)) {
      if (!this.#hasTransientDep(pkg, dependencies)) {
        return null;
      }
    }

    this.#saveDep(pkg, { kind, range, target: pkg });

    return { kind };
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
  ): DependencyResolution | null {
    if (!dependencies) {
      return null;
    }

    for (const [depName, depRange] of Object.entries(dependencies)) {
      const dependency = this.#resolver
        .resolveName(depName, depRange, () => this.#resolveDep(depName))
        .resolveDependency(pkg);

      if (dependency) {
        return dependency;
      }
    }

    return null;
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

interface PackageDep extends DependencyResolution {
  readonly range: string;
  readonly target: PackageResolution;
}

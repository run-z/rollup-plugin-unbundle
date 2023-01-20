import semver from 'semver';
import { DependencyResolution } from '../api/dependency-resolution.js';
import { ImportResolution } from '../api/import-resolution.js';
import { Import, recognizeImport } from '../api/import.js';
import { PackageJson } from '../api/package-json.js';
import { PackageResolution } from '../api/package-resolution.js';
import { ImportResolver } from './import-resolver.js';
import { Module$Resolution } from './module.resolution.js';
import { parseRange } from './parse-range.js';

export class Package$Resolution
  extends Module$Resolution<Import.Package>
  implements PackageResolution {

  readonly #resolver: ImportResolver;
  #packageJson: PackageJson | undefined;
  readonly #dependencies = new Map<string, Map<string, PackageDep | false>>();
  #peerDependencies?: PackageJson.Dependencies;

  constructor(
    resolver: ImportResolver,
    uri: string,
    importSpec?: Import.Package,
    packageJson?: PackageJson,
  ) {
    super(resolver, uri, importSpec ?? (() => packageImportSpec(this)));

    this.#resolver = resolver;
    this.#packageJson = packageJson;
  }

  override get host(): this {
    return this;
  }

  /**
   * `package.json` contents.
   */
  get packageJson(): PackageJson {
    if (!this.#packageJson) {
      this.#packageJson = this.#resolver.packageFS.loadPackageJson(this.uri);

      if (!this.#packageJson) {
        throw new ReferenceError(`No "package.json" file found at <${this.uri}>`);
      }
    }

    return this.#packageJson;
  }

  get name(): string {
    return this.packageJson.name;
  }

  get scope(): string | undefined {
    return this.importSpec.scope;
  }

  get localName(): string {
    return this.importSpec.local;
  }

  get version(): string {
    return this.packageJson.version;
  }

  #getPeerDependencies(): PackageJson.Dependencies {
    if (this.#peerDependencies) {
      return this.#peerDependencies;
    }

    const { devDependencies, peerDependencies } = this.packageJson;

    if (!peerDependencies || !devDependencies) {
      // No installed peer dependencies.
      return (this.#peerDependencies = {});
    }

    // Detect uninstalled peer dependencies.
    const uninstalledDeps: Record<string, string> = { ...peerDependencies };

    for (const devDep of Object.keys(devDependencies)) {
      delete uninstalledDeps[devDep];
    }

    // Select only installed peer dependencies, as the rest of them can not be resolved.
    const installedDeps: Record<string, string> = { ...peerDependencies };

    for (const uninstalledDep of Object.keys(uninstalledDeps)) {
      delete installedDeps[uninstalledDep];
    }

    return (this.#peerDependencies = installedDeps);
  }

  override resolveDependency(another: ImportResolution): DependencyResolution | null {
    const importDependency = super.resolveDependency(another);

    if (importDependency) {
      return importDependency;
    }

    // Find dependency on host package.
    const pkg = another.host;

    if (!pkg) {
      return null;
    }

    const { name, version } = pkg;
    const depsByVersion = this.#dependencies.get(name);

    if (depsByVersion) {
      const packageDep = depsByVersion.get(version);

      if (packageDep && packageDep.range.test(version)) {
        return { kind: packageDep.kind };
      }
      if (packageDep != null) {
        return null;
      }
    }

    const { dependencies, devDependencies } = this.packageJson;

    const dependency =
      this.#establishDirectDep(pkg, dependencies, 'runtime')
      || this.#establishDirectDep(pkg, this.#getPeerDependencies(), 'peer')
      || this.#establishDirectDep(pkg, devDependencies, 'dev')
      || this.#establishTransientDep(pkg, dependencies, 'runtime')
      || this.#establishTransientDep(pkg, this.#getPeerDependencies(), 'peer')
      || this.#establishTransientDep(pkg, devDependencies, 'dev');

    if (!dependency) {
      this.#saveDep(pkg, false);
    }

    return dependency;
  }

  #establishDirectDep(
    pkg: PackageResolution,
    dependencies: PackageJson.Dependencies | undefined,
    kind: DependencyResolution['kind'],
  ): DependencyResolution | null {
    if (!dependencies) {
      return null;
    }

    const { name, version } = pkg;
    const range = parseRange(dependencies[name]);

    if (!range?.test(version)) {
      return null;
    }

    this.#saveDep(pkg, { kind, range, pkg });

    return { kind };
  }

  #establishTransientDep(
    pkg: PackageResolution,
    dependencies: PackageJson.Dependencies | undefined,
    kind: DependencyResolution['kind'],
  ): DependencyResolution | null {
    if (!dependencies) {
      return null;
    }

    for (const [depName, rangeStr] of Object.entries(dependencies)) {
      const range = parseRange(rangeStr);

      if (range) {
        const dependency = this.#resolver
          .resolveName(depName, range, () => this.resolveDep(depName))
          ?.resolveDependency(pkg);

        if (dependency) {
          this.#saveDep(pkg, { kind, range, pkg });

          return { kind };
        }

        this.#saveDep(pkg, false);
      }
    }

    return null;
  }

  #saveDep(
    { name, version }: { readonly name: string; readonly version: string },
    dep: PackageDep | false,
  ): void {
    let depsByVersion = this.#dependencies.get(name);

    if (depsByVersion == null) {
      depsByVersion = new Map();
      this.#dependencies.set(name, depsByVersion);
    }

    depsByVersion.set(version, dep);
  }

  override asPackage(): this {
    return this;
  }

}

function packageImportSpec({ packageJson: { name } }: PackageResolution): Import.Package {
  const spec = recognizeImport(name);

  if (spec.kind === 'package') {
    return spec;
  }

  return {
    kind: 'package',
    spec: name,
    name,
    scope: undefined,
    local: name,
    subpath: undefined,
  };
}

export interface Package$Resolution extends PackageResolution {
  asImpliedResolution(): undefined;
}

interface PackageDep extends DependencyResolution {
  readonly range: semver.Range;
  readonly pkg: PackageResolution;
}

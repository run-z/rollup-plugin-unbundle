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
  readonly #dependencies = new Map<string, PackageDep | false>();
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

    const knownDep = this.#dependencies.get(pkg.uri);

    if (knownDep != null) {
      return knownDep ? { kind: knownDep.kind } : null;
    }

    const { dependencies, devDependencies } = this.packageJson;

    const dep =
      this.#findDep(pkg, dependencies, 'runtime')
      || this.#findDep(pkg, this.#getPeerDependencies(), 'peer')
      || this.#findDep(pkg, devDependencies, 'dev');

    this.#dependencies.set(pkg.uri, dep ? dep : false);

    return dep && { kind: dep.kind };
  }

  #findDep(
    pkg: PackageResolution,
    dependencies: PackageJson.Dependencies | undefined,
    kind: DependencyResolution['kind'],
  ): PackageDep | null {
    if (!dependencies) {
      return null;
    }

    const { name, version } = pkg;
    const range = parseRange(dependencies[name]);

    if (!range?.test(version)) {
      return null;
    }

    return { kind, pkg };
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
  readonly pkg: PackageResolution;
}

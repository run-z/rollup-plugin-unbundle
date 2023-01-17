import semver from 'semver';
import { DependencyResolution } from '../api/dependency-resolution.js';
import { ImportResolution } from '../api/import-resolution.js';
import { Import, recognizeImport } from '../api/import.js';
import { PackageJson } from '../api/package-json.js';
import { PackageResolution } from '../api/package-resolution.js';
import { ImportResolver } from './import-resolver.js';
import { Import$Resolution } from './import.resolution.js';
import { uriToImport } from './uri-to-import.js';

export class Package$Resolution
  extends Import$Resolution<Import.Package>
  implements PackageResolution {

  readonly #resolver: ImportResolver;
  #packageJson: PackageJson | undefined;
  readonly #dependencies = new Map<string, Map<string, PackageDep | false>>();

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

  override resolveImport(spec: Import | string): ImportResolution {
    spec = recognizeImport(spec);

    switch (spec.kind) {
      case 'uri':
        return this.#resolveURIImport(spec);
      case 'path':
        return this.#resolvePackageImport(spec.spec);
      case 'package':
        return this.#resolvePackage(spec.name);
      default:
        return this.#resolver.resolve(spec);
    }
  }

  #resolveURIImport(spec: Import.URI): ImportResolution {
    const packageURI = this.#resolver.packageFS.getPackageURI(spec);

    if (packageURI != null) {
      return this.#resolvePackageImport(spec.spec);
    }

    // Non-package URI.
    return this.#resolver.resolveURI(spec);
  }

  #resolvePackageImport(path: string): ImportResolution {
    const uriImport = uriToImport(this.#resolver.packageFS.resolvePath(this, path));

    return this.#resolver.resolveURI(uriImport, () => this.#discoverPackage(uriImport.spec));
  }

  #resolvePackage(name: string): ImportResolution {
    return this.#resolver.resolveName(name, '*', () => this.#resolveDep(name));
  }

  #discoverPackage(dirURI: string): ImportResolution | undefined {
    const packageDir = this.#resolver.packageFS.findPackageDir(dirURI);

    if (!packageDir) {
      return;
    }

    const { uri, packageJson } = packageDir;

    return this.#resolver.resolveURI(
      uriToImport(new URL(uri)),
      () => new Package$Resolution(this.#resolver, uri, undefined, packageJson),
    );
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
      const packageDep = depsByVersion.get(version);

      if (packageDep && semver.satisfies(version, packageDep.range)) {
        return { kind: packageDep.kind };
      }
      if (packageDep != null) {
        return null;
      }
    }

    const { dependencies, devDependencies, peerDependencies } = this.packageJson;

    const dependency =
      this.#establishDirectDep(pkg, dependencies, 'runtime')
      || this.#establishDirectDep(pkg, peerDependencies, 'peer')
      || this.#establishDirectDep(pkg, devDependencies, 'dev')
      || this.#establishTransientDep(pkg, dependencies, 'runtime')
      || this.#establishTransientDep(pkg, peerDependencies, 'peer')
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
    const range = dependencies[name];

    if (!range || !semver.satisfies(version, range)) {
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

    for (const [depName, range] of Object.entries(dependencies)) {
      const dependency = this.#resolver
        .resolveName(depName, range, () => this.#resolveDep(depName))
        .resolveDependency(pkg);

      if (dependency) {
        this.#saveDep(pkg, { kind, range, pkg });

        return { kind };
      }
    }

    return null;
  }

  #saveDep({ name, version }: PackageResolution, dep: PackageDep | false): void {
    let depsByVersion = this.#dependencies.get(name);

    if (depsByVersion == null) {
      depsByVersion = new Map();
      this.#dependencies.set(name, depsByVersion);
    }

    depsByVersion.set(version, dep);
  }

  #resolveDep(depName: string): PackageResolution {
    if (depName === this.name) {
      return this; // Resolve to itself.
    }

    return new Package$Resolution(
      this.#resolver,
      this.#resolver.packageFS.resolvePackage(this, depName),
    );
  }

  override asPackageResolution(): this {
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
  readonly range: string;
  readonly pkg: PackageResolution;
}

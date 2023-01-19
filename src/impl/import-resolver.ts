import semver from 'semver';
import { ImportResolution } from '../api/import-resolution.js';
import { Import } from '../api/import.js';
import { NodePackageFS } from '../api/node-package-fs.js';
import { PackageFS } from '../api/package-fs.js';
import { PackageResolution } from '../api/package-resolution.js';
import { Unknown$Resolution } from './unknown.resolution.js';
import { URI$Resolution } from './uri.resolution.js';

export class ImportResolver {

  readonly #root: ImportResolution;
  readonly #packageFS: PackageFS;
  readonly #byURI = new Map<string, ImportResolution>();
  readonly #byName = new Map<string, PackageResolution[]>();

  constructor({
    createRoot,
    packageFS = new NodePackageFS(),
  }: {
    readonly createRoot: (resolver: ImportResolver) => ImportResolution;
    readonly packageFS?: PackageFS;
  }) {
    this.#packageFS = packageFS;
    this.#root = createRoot(this);
  }

  get root(): ImportResolution {
    return this.#root;
  }

  get packageFS(): PackageFS {
    return this.#packageFS;
  }

  resolve(spec: Import, createResolution?: () => ImportResolution | undefined): ImportResolution {
    if (spec.kind === 'uri') {
      return this.resolveURI(spec, createResolution);
    }

    return this.#addResolution(createResolution?.() ?? this.#createDefaultResolution(spec));
  }

  #createDefaultResolution(spec: Exclude<Import, Import.URI>): ImportResolution {
    switch (spec.kind) {
      case 'implied':
      case 'package':
      case 'path':
        return new Unknown$Resolution(this, `import:${spec.kind}:${spec.spec}`, spec);
      case 'subpath':
        return new Unknown$Resolution(this, `import:${spec.kind}:${spec.spec.slice(1)}`, spec);
      case 'synthetic':
        return new Unknown$Resolution(
          this,
          `import:${spec.kind}:${encodeURIComponent(spec.spec.slice(1))}`,
          spec,
        );
      case 'unknown':
        return new Unknown$Resolution(
          this,
          `import:${spec.kind}:${encodeURIComponent(spec.spec)}`,
          spec,
        );
    }
  }

  resolveURI(
    spec: Import.URI,
    createResolution?: () => ImportResolution | undefined,
  ): ImportResolution {
    const { spec: uri } = spec;

    return (
      this.#byURI.get(uri)
      ?? this.#addResolution(createResolution?.() ?? new URI$Resolution(this, spec), uri)
    );
  }

  resolveName(name: string, range: string): PackageResolution | undefined;

  resolveName(
    name: string,
    range: string,
    createPackage: () => PackageResolution,
  ): PackageResolution;

  resolveName(
    name: string,
    range: string,
    resolvePackage?: () => PackageResolution,
  ): PackageResolution | undefined {
    const candidates = this.#byName.get(name);

    if (candidates) {
      for (const candidate of candidates) {
        if (semver.satisfies(candidate.version, range)) {
          return candidate;
        }
      }
    }

    return resolvePackage && this.#addResolution(resolvePackage());
  }

  #addResolution<T extends ImportResolution>(resolution: T, uri = resolution.uri): T {
    this.#byURI.set(uri, resolution);

    if (uri === resolution.uri) {
      const pkg = resolution.asPackageResolution();

      if (pkg) {
        const withSameName = this.#byName.get(pkg.name);

        if (withSameName) {
          withSameName.push(pkg);
        } else {
          this.#byName.set(pkg.name, [pkg]);
        }
      }
    }

    return resolution;
  }

}

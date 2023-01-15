import semver from 'semver';
import { ImportResolution } from '../api/import-resolution.js';
import { ImportSpecifier } from '../api/import-specifier.js';
import { PackageResolution } from '../api/package-resolution.js';
import { Unknown$Resolution } from './unknown.resolution.js';
import { URI$Resolution } from './uri.resolution.js';

export class ImportResolver {

  readonly #root: ImportResolution;
  readonly #byURI = new Map<string, ImportResolution>();
  readonly #byName = new Map<string, PackageResolution[]>();

  constructor(createRoot: (resolver: ImportResolver) => ImportResolution) {
    this.#root = createRoot(this);
  }

  get root(): ImportResolution {
    return this.#root;
  }

  resolve(
    spec: ImportSpecifier,
    createResolution?: () => ImportResolution | undefined,
  ): ImportResolution {
    if (spec.kind === 'uri') {
      return this.resolveURI(spec.spec, createResolution);
    }

    return this.#addResolution(createResolution?.() ?? this.#createDefaultResolution(spec));
  }

  #createDefaultResolution(spec: ImportSpecifier): ImportResolution {
    switch (spec.kind) {
      case 'uri':
        return this.resolveURI(spec.spec);
      case 'package':
      case 'path':
        return new Unknown$Resolution(this, `import:${spec.kind}:${spec.spec}`);
      case 'subpath':
        return new Unknown$Resolution(this, `import:${spec.kind}:${spec.spec.slice(1)}`);
      case 'virtual':
        return new Unknown$Resolution(
          this,
          `import:${spec.kind}:${encodeURIComponent(spec.spec.slice(1))}`,
        );
      case 'unknown':
        return new Unknown$Resolution(this, `import:${spec.kind}:${encodeURIComponent(spec.spec)}`);
    }
  }

  resolveURI(uri: string, createResolution?: () => ImportResolution | undefined): ImportResolution {
    return (
      this.#byURI.get(uri)
      ?? this.#addResolution(createResolution?.() ?? new URI$Resolution(this, uri), uri)
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

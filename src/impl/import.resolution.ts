import { ImportDependency } from '../api/import-dependency.js';
import { ImportResolution } from '../api/import-resolution.js';
import { PackageResolution } from '../api/package-resolution.js';
import { ImportResolver } from './import-resolver.js';

export abstract class Import$Resolution implements ImportResolution {

  readonly #resolver: ImportResolver;
  readonly #uri: string;

  constructor(resolver: ImportResolver, uri: string) {
    this.#resolver = resolver;
    this.#uri = uri;
  }

  get root(): ImportResolution {
    return this.#resolver.root;
  }

  get uri(): string {
    return this.#uri;
  }

  abstract resolveImport(spec: string): ImportResolution;

  dependsOn(another: ImportResolution): ImportDependency | null {
    if (another.uri === this.uri) {
      return {
        kind: 'self',
      };
    }

    return null;
  }

  asPackageResolution(): PackageResolution | undefined {
    return;
  }

}

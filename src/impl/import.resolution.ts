import { DependencyResolution } from '../api/dependency-resolution.js';
import { ImpliedResolution } from '../api/implied-resolution.js';
import { ImportResolution } from '../api/import-resolution.js';
import { Import } from '../api/import.js';
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

  abstract resolveImport(spec: Import | string): ImportResolution;

  resolveDependency(another: ImportResolution): DependencyResolution | null {
    if (another.uri === this.uri) {
      return {
        kind: 'self',
      };
    }
    if (another.asImpliedResolution()) {
      return {
        kind: 'implied',
      };
    }

    return null;
  }

  asPackageResolution(): PackageResolution | undefined {
    return;
  }

  asImpliedResolution(): ImpliedResolution | undefined {
    return;
  }

}

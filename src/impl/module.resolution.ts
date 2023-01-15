import { ModuleResolution } from '../api/module-resolution.js';
import { PackageResolution } from '../api/package-resolution.js';
import { ImportResolver } from './import-resolver.js';

export abstract class Module$Resolution implements ModuleResolution {

  readonly #resolver: ImportResolver;
  readonly #uri: string;

  constructor(resolver: ImportResolver, uri: string) {
    this.#resolver = resolver;
    this.#uri = uri;
  }

  get root(): ModuleResolution {
    return this.#resolver.root;
  }

  get uri(): string {
    return this.#uri;
  }

  abstract resolveImport(spec: string): ModuleResolution;

  asPackageResolution(): PackageResolution | undefined {
    return;
  }

}

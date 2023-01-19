import { DependencyResolution } from '../api/dependency-resolution.js';
import { ImportResolution } from '../api/import-resolution.js';
import { Import } from '../api/import.js';
import { PackageResolution } from '../api/package-resolution.js';
import { ImportResolver } from './import-resolver.js';

export abstract class Import$Resolution<TImport extends Import> implements ImportResolution {

  readonly #resolver: ImportResolver;
  readonly #uri: string;
  #getImportSpec: () => TImport;

  constructor(resolver: ImportResolver, uri: string, importSpec: TImport | (() => TImport)) {
    this.#resolver = resolver;
    this.#uri = uri;
    if (typeof importSpec === 'function') {
      this.#getImportSpec = () => {
        const spec = importSpec();

        this.#getImportSpec = () => spec;

        return spec;
      };
    } else {
      this.#getImportSpec = () => importSpec;
    }
  }

  get root(): ImportResolution {
    return this.#resolver.root;
  }

  get uri(): string {
    return this.#uri;
  }

  get importSpec(): TImport {
    return this.#getImportSpec();
  }

  abstract resolveImport(spec: Import | string): ImportResolution;

  resolveDependency(another: ImportResolution): DependencyResolution | null {
    if (another.uri === this.uri) {
      return {
        kind: 'self',
      };
    }

    const {
      importSpec: { kind },
    } = another;

    if (kind === 'implied' || kind === 'synthetic') {
      return { kind };
    }

    return null;
  }

  asPackageResolution(): PackageResolution | undefined {
    return;
  }

}

import { ImportResolution } from '../api/import-resolution.js';
import { parseImportSpecifier } from '../api/import-specifier.js';
import { ImportResolver } from './import-resolver.js';
import { Import$Resolution } from './import.resolution.js';

export class Unknown$Resolution extends Import$Resolution {

  readonly #resolver: ImportResolver;

  constructor(resolver: ImportResolver, uri: string) {
    super(resolver, uri);
    this.#resolver = resolver;
  }

  override resolveImport(spec: string): ImportResolution {
    return this.#resolver.resolve(parseImportSpecifier(spec));
  }

}

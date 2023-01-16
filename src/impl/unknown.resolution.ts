import { ImportResolution } from '../api/import-resolution.js';
import { Import, recognizeImport } from '../api/import.js';
import { ImportResolver } from './import-resolver.js';
import { Import$Resolution } from './import.resolution.js';

export class Unknown$Resolution extends Import$Resolution {

  readonly #resolver: ImportResolver;

  constructor(resolver: ImportResolver, uri: string) {
    super(resolver, uri);
    this.#resolver = resolver;
  }

  override resolveImport(spec: Import | string): ImportResolution {
    return this.#resolver.resolve(recognizeImport(spec));
  }

}

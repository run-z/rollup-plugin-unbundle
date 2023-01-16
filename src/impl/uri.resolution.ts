import { ImportResolution } from '../api/import-resolution.js';
import { Import, recognizeImport } from '../api/import.js';
import { ImportResolver } from './import-resolver.js';
import { Import$Resolution } from './import.resolution.js';

export class URI$Resolution extends Import$Resolution {

  readonly #resolver: ImportResolver;

  constructor(resolver: ImportResolver, uri: string) {
    super(resolver, uri);
    this.#resolver = resolver;
  }

  override resolveImport(spec: Import | string): ImportResolution {
    spec = recognizeImport(spec);

    switch (spec.kind) {
      case 'uri':
      case 'path':
        return this.#resolveURIImport(spec.spec);
      default:
        return this.#resolver.resolve(spec);
    }
  }

  #resolveURIImport(uri: string): ImportResolution {
    const url = new URL(uri, this.uri).href;

    return this.#resolver.resolveURI(url);
  }

}

import { ImportResolution } from '../api/import-resolution.js';
import { parseImportSpecifier } from '../api/import-specifier.js';
import { ImportResolver } from './import-resolver.js';
import { Import$Resolution } from './import.resolution.js';

export class URI$Resolution extends Import$Resolution {

  readonly #resolver: ImportResolver;

  constructor(resolver: ImportResolver, uri: string) {
    super(resolver, uri);
    this.#resolver = resolver;
  }

  override resolveImport(spec: string): ImportResolution {
    const parsedSpec = parseImportSpecifier(spec);

    switch (parsedSpec.kind) {
      case 'uri':
      case 'path':
        return this.#resolveURIImport(parsedSpec.spec);
      default:
        return this.#resolver.resolve(parsedSpec);
    }
  }

  #resolveURIImport(uri: string): ImportResolution {
    const url = new URL(uri, this.uri).href;

    return this.#resolver.resolveURI(url);
  }

}

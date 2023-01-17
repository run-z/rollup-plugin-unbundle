import { ImportResolution } from '../api/import-resolution.js';
import { Import, recognizeImport } from '../api/import.js';
import { ImportResolver } from './import-resolver.js';
import { Import$Resolution } from './import.resolution.js';
import { uriToImport } from './uri-to-import.js';

export class URI$Resolution extends Import$Resolution<Import.URI> {

  readonly #resolver: ImportResolver;

  constructor(resolver: ImportResolver, importSpec: Import.URI) {
    super(resolver, importSpec.spec, importSpec);
    this.#resolver = resolver;
  }

  override resolveImport(spec: Import | string): ImportResolution {
    spec = recognizeImport(spec);

    switch (spec.kind) {
      case 'uri':
      case 'path':
        return this.#resolveURIImport(spec);
      default:
        return this.#resolver.resolve(spec);
    }
  }

  #resolveURIImport(spec: Import.URI | Import.Path): ImportResolution {
    return this.#resolver.resolveURI(uriToImport(new URL(spec.spec, this.uri)));
  }

}

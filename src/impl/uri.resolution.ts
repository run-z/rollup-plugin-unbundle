import { parseImportSpecifier } from '../api/import-specifier.js';
import { ModuleResolution } from '../api/module-resolution.js';
import { ImportResolver } from './import-resolver.js';
import { Module$Resolution } from './module.resolution.js';

export class URI$Resolution extends Module$Resolution {

  readonly #resolver: ImportResolver;

  constructor(resolver: ImportResolver, uri: string) {
    super(resolver, uri);
    this.#resolver = resolver;
  }

  override resolveImport(spec: string): ModuleResolution {
    const parsedSpec = parseImportSpecifier(spec);

    switch (parsedSpec.kind) {
      case 'uri':
      case 'path':
        return this.#resolveURIImport(parsedSpec.spec);
      default:
        return this.#resolver.resolve(parsedSpec);
    }
  }

  #resolveURIImport(uri: string): ModuleResolution {
    const url = new URL(uri, this.uri).href;

    return this.#resolver.resolveURI(url);
  }

}

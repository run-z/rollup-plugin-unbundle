import { parseImportSpecifier } from '../api/import-specifier.js';
import { ModuleResolution } from '../api/module-resolution.js';
import { ImportResolver } from './import-resolver.js';
import { Module$Resolution } from './module.resolution.js';

export class Unknown$Resolution extends Module$Resolution {

  readonly #resolver: ImportResolver;

  constructor(resolver: ImportResolver, uri: string) {
    super(resolver, uri);
    this.#resolver = resolver;
  }

  override resolveImport(spec: string): ModuleResolution {
    return this.#resolver.resolve(parseImportSpecifier(spec));
  }

}

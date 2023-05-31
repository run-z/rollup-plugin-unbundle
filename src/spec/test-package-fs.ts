import { Import, NodePackageFS, VirtualPackageFS } from '@run-z/npk';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export class TestPackageFS extends VirtualPackageFS {

  static async create(root?: string): Promise<TestPackageFS> {
    return new TestPackageFS(root, await NodePackageFS.create());
  }

  readonly #nodeFS: NodePackageFS;

  private constructor(root: string | undefined, nodeFS: NodePackageFS) {
    super(root);
    this.#nodeFS = nodeFS;
    this.addRoot({
      name: 'root',
      version: '1.0.0',
    });
  }

  override recognizeImport(spec: string): Import {
    const importSpec = this.#nodeFS.recognizeImport(spec);

    if (importSpec.kind === 'uri') {
      if (importSpec.scheme === 'file') {
        const pkgURI = this.#fileToPackageURI(importSpec.spec);

        return {
          ...importSpec,
          spec: pkgURI,
          scheme: 'package',
          path: new URL(pkgURI).pathname,
        };
      }
    } else if (importSpec.kind === 'path') {
      if (!importSpec.isRelative) {
        return {
          ...importSpec,
          uri: this.#fileToPackageURI(importSpec.uri),
        };
      }
    }

    return importSpec;
  }

  #fileToPackageURI(uri: string): string {
    if (uri.startsWith('/')) {
      return `package:${uri.slice(1)}`;
    }

    const filePath = fileURLToPath(uri);
    const root = pathToFileURL(path.parse(filePath).root).href;

    return `package:${uri.slice(root.length)}`;
  }

}

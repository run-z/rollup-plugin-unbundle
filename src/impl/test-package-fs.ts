import { Import, NodePackageFS, VirtualPackageFS } from '@run-z/npk';

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

  recognizeImport(spec: string): Import {
    return this.#nodeFS.recognizeImport(spec);
  }

}

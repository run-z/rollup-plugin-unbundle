import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import semver from 'semver';
import { Import } from './import.js';
import { PackageFS } from './package-fs.js';
import { PackageJson } from './package-json.js';
import { PackageResolution } from './package-resolution.js';

/**
 * Node.js-specific implementation of package file system.
 */
export class NodePackageFS extends PackageFS {

  readonly #root: string;

  /**
   * Constructs file system with the given root.
   *
   * @param root - URL or path of the root directory. Defaults to the current working directory.
   */
  constructor(root?: string) {
    super();

    if (!root) {
      this.#root = pathToFileURL(process.cwd()).href;
    } else if (root.startsWith('file://')) {
      this.#root = root;
    } else {
      this.#root = pathToFileURL(root).href;
    }
  }

  override get root(): string {
    return this.#root;
  }

  override recognizePackageURI(importSpec: Import.URI): string | undefined {
    return importSpec.scheme === 'file' ? importSpec.spec : undefined;
  }

  override resolveName(relativeTo: PackageResolution, name: string): string | undefined {
    const requireModule = createRequire(relativeTo.uri);
    let modulePath: string;

    try {
      modulePath = requireModule.resolve(name);
    } catch (error) {
      return; // Ignore unresolved package.
    }

    return pathToFileURL(modulePath).href;
  }

  override loadPackageJson(uri: string): PackageJson | undefined {
    const dir = fileURLToPath(uri);
    const filePath = path.join(dir, 'package.json');

    try {
      if (!fs.statSync(filePath).isFile()) {
        return;
      }
    } catch {
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Partial<PackageJson>;

    if (packageJson.name && semver.valid(packageJson.version)) {
      // Valid `package.json`?
      return packageJson as PackageJson;
    }

    return;
  }

  override parentDir(uri: string): string | undefined {
    const dir = fileURLToPath(uri);
    const parentDir = path.dirname(dir);

    if (parentDir === dir) {
      return;
    }

    return pathToFileURL(parentDir).href;
  }

}

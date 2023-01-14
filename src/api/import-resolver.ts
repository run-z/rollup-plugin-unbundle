import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import semver from 'semver';
import { toImportURL } from '../impl/to-import-url.js';
import { PackageInfo } from './package-info.js';
import { PackageJson } from './package-json.js';

export class ImportResolver {

  readonly #byURL = new Map<string, PackageInfo>();
  readonly #byName = new Map<string, PackageInfo[]>();

  resolveImport(spec: string, importer?: string): PackageInfo | undefined {
    const url = toImportURL(spec, importer);

    return this.#byURL.get(url) ?? this.#addPackage(this.#discoverPackage(url));
  }

  findPackage(name: string, range: string): PackageInfo | undefined;

  findPackage(
    name: string,
    range: string,
    createPackage: (resolver: this) => PackageInfo,
  ): PackageInfo;

  findPackage(
    name: string,
    range: string,
    createPackage?: (resolver: this) => PackageInfo,
  ): PackageInfo | undefined {
    const candidates = this.#byName.get(name);

    if (candidates) {
      for (const candidate of candidates) {
        if (semver.satisfies(candidate.version, range)) {
          return candidate;
        }
      }
    }

    if (!createPackage) {
      return;
    }

    return this.#addPackage(createPackage(this));
  }

  #discoverPackage(url: string): PackageInfo | undefined {
    const dir = path.dirname(fileURLToPath(url));
    const packageJson = this.#findPackageInDir(dir);

    return packageJson;
  }

  #findPackageInDir(dir: string): PackageInfo | undefined {
    const packageJson = this.#hasNodeModules(dir) && this.#loadPackageJson(dir);

    if (packageJson) {
      return packageJson;
    }

    const parentDir = path.dirname(dir);

    if (parentDir === dir) {
      return;
    }

    return this.#findPackageInDir(dir);
  }

  #hasNodeModules(dir: string): boolean {
    try {
      return fs.statSync(path.resolve(dir, 'node_modules')).isDirectory();
    } catch (error) {
      return false;
    }
  }

  #loadPackageJson(dir: string): PackageInfo | undefined {
    const filePath = path.resolve(dir, 'package.json');

    try {
      if (!fs.statSync(filePath).isFile()) {
        return;
      }
    } catch (error) {
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PackageJson;

    return new PackageInfo(this, pathToFileURL(dir).href, packageJson);
  }

  #addPackage(pkg: PackageInfo | undefined): PackageInfo | undefined {
    if (!pkg) {
      return;
    }

    this.#byURL.set(pkg.url, pkg);

    const withSameName = this.#byName.get(pkg.name);

    if (withSameName) {
      withSameName.push(pkg);
    } else {
      this.#byName.set(pkg.name, [pkg]);
    }

    return pkg;
  }

}

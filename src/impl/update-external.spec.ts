import { beforeEach, describe, expect, it } from '@jest/globals';
import { NodePackageFS, PackageFS, resolveRootPackage } from '@run-z/npk';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { IsRollupExternalImport } from './is-rollup-external-import.js';
import { updateExternal } from './update-external.js';

describe('updateExternal', () => {
  let fs: PackageFS;
  let isExternal: IsRollupExternalImport;
  let baseExternal: IsRollupExternalImport;

  beforeEach(() => {
    fs = new NodePackageFS();
    isExternal = updateExternal((...args) => baseExternal(...args));
    baseExternal = moduleId => moduleId === 'external-module';
  });

  it('respects updated option', () => {
    expect(isExternal('external-module', undefined, false)).toBe(true);
    expect(isExternal('internal-module', undefined, false)).toBe(false);
  });
  it('externalizes nodejs built-ins', () => {
    baseExternal = () => null;
    expect(isExternal('node:fs', undefined, false)).toBe(true);
  });
  it('bundles unresolved dependency', () => {
    baseExternal = () => null;
    expect(isExternal('@test/test', undefined, false)).toBe(false);
  });
  it('does not affect self-dependencies', () => {
    baseExternal = () => null;
    expect(isExternal('rollup-plugin-unbundle', undefined, false)).toBeUndefined();
  });
  it('does not affect synthetic dependencies', () => {
    baseExternal = () => null;
    expect(isExternal('\0synthetic', undefined, true)).toBeUndefined();
  });
  it('accepts resolution root URI', () => {
    baseExternal = () => null;
    isExternal = updateExternal((...args) => baseExternal(...args), {
      resolutionRoot: findRollupDir(),
    });

    // `acorn` is Rollup's dev dependency
    expect(isExternal('acorn', undefined, false)).toBe(false);
  });
  it('accepts resolution root path', () => {
    baseExternal = () => null;
    isExternal = updateExternal((...args) => baseExternal(...args), {
      resolutionRoot: fileURLToPath(findRollupDir()),
    });

    // `acorn` is Rollup's dev dependency
    expect(isExternal('acorn', undefined, false)).toBe(false);
  });
  it('accepts resolution root', () => {
    baseExternal = () => null;
    isExternal = updateExternal((...args) => baseExternal(...args), {
      resolutionRoot: resolveRootPackage(findRollupDir()),
    });

    // `acorn` is Rollup's dev dependency
    expect(isExternal('acorn', undefined, false)).toBe(false);
  });
  it('accepts custom isExternal detector', () => {
    baseExternal = () => null;

    isExternal = updateExternal((...args) => baseExternal(...args), {
      resolutionRoot: resolveRootPackage(findRollupDir()),
      isExternal(request) {
        return request.isResolved
          ? request.resolveModule().asPackage()?.packageInfo.name === 'acorn'
          : request.isExternal();
      },
    });

    // `acorn` is Rollup's dev dependency, but `external` option overridden the result.
    expect(isExternal('acorn', undefined, false)).toBe(false);
    expect(isExternal('acorn', undefined, true)).toBe(true);
  });
  it('tries to detect package externalization again by its name', () => {
    baseExternal = moduleId => (moduleId === 'rollup' ? true : undefined);

    expect(isExternal(findRollupDir(), undefined, false)).toBe(true);
  });
  it('resolves against importer', () => {
    baseExternal = () => null;

    // `acorn` is Rollup's dev dependency
    expect(isExternal('acorn', 'rollup', false)).toBe(false);
  });

  function findRollupDir(): string {
    return fs.findPackageDir(pathToFileURL(createRequire(import.meta.url).resolve('rollup')).href)!
      .uri;
  }
});

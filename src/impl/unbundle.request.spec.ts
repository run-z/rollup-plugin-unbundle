import { beforeEach, describe, expect, it } from '@jest/globals';
import { PackageResolution, resolveRootPackage } from '@run-z/npk';
import { TestPackageFS } from './test-package-fs.js';
import { Unbundle$Request } from './unbundle.request.js';

describe('UnbundleRequest', () => {
  let fs: TestPackageFS;
  let resolutionRoot: PackageResolution;

  beforeEach(async () => {
    fs = await TestPackageFS.create();

    resolutionRoot = await resolveRootPackage(fs);
  });

  describe('resolveImporter', () => {
    it('uses resolution root when unspecified', async () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'package:root/subpath',
      });

      await expect(request.resolveImporter()).resolves.toBe(resolutionRoot);
    });
    it('resolves importer when specified', async () => {
      fs.addRoot({
        name: 'root',
        version: '1.0.0',
        dependencies: {
          dep1: '^1.0.0',
        },
      });
      fs.addPackage({
        name: 'dep1',
        version: '1.0.0',
        dependencies: {
          dep2: '^1.0.0',
        },
      });
      resolutionRoot = await resolveRootPackage(fs);

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'package:root/subpath',
        importerId: 'dep1',
      });
      const importer = await request.resolveImporter();

      expect(importer.asPackage()?.packageInfo.name).toBe('dep1');
    });
  });

  describe('isExternal()', () => {
    it('returns none for the module itself', async () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'package:root/subpath',
      });

      await expect(request.resolveDependency()).resolves.toMatchObject({ kind: 'self' });
      await expect(request.isExternal()).resolves.toBeUndefined();
    });
    it('returns none for synthetic module', async () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: '\0unknown',
      });

      await expect(request.resolveDependency()).resolves.toMatchObject({ kind: 'synthetic' });
      await expect(request.isExternal()).resolves.toBeUndefined();
    });
    it('returns true for Node built-ins', async () => {
      const request = new Unbundle$Request({ resolutionRoot, moduleId: 'node:fs' });

      await expect(request.resolveDependency()).resolves.toMatchObject({ kind: 'implied' });
      await expect(request.isExternal()).resolves.toBe(true);
    });
    it('returns true for runtime dependency', async () => {
      fs.addRoot({
        name: 'root',
        version: '1.0.0',
        dependencies: {
          dep: '^1.0.0',
        },
      });
      fs.addPackage({
        name: 'dep',
        version: '1.0.0',
      });
      resolutionRoot = await resolveRootPackage(fs);

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      await expect(request.resolveDependency()).resolves.toMatchObject({ kind: 'runtime' });
      await expect(request.isExternal()).resolves.toBe(true);
    });
    it('returns true for peer dependency', async () => {
      fs.addRoot({
        name: 'root',
        version: '1.0.0',
        peerDependencies: {
          dep: '^1.0.0',
        },
        devDependencies: {
          dep: '^1.0.0',
        },
      });
      fs.addPackage({
        name: 'dep',
        version: '1.0.0',
      });
      resolutionRoot = await resolveRootPackage(fs);

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      await expect(request.resolveDependency()).resolves.toMatchObject({ kind: 'peer' });
      await expect(request.isExternal()).resolves.toBe(true);
    });
    it('returns false for dev dependency', async () => {
      fs.addRoot({
        name: 'root',
        version: '1.0.0',
        devDependencies: {
          dep: '^1.0.0',
        },
      });
      fs.addPackage({
        name: 'dep',
        version: '1.0.0',
      });
      resolutionRoot = await resolveRootPackage(fs);

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      await expect(request.resolveDependency()).resolves.toMatchObject({ kind: 'dev' });
      await expect(request.isExternal()).resolves.toBe(false);
    });
    it('returns false for unknown package', async () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'unknown',
      });

      await expect(request.resolveDependency()).resolves.toBeNull();
      await expect(request.isExternal()).resolves.toBe(false);
    });
    it('returns true for URI', async () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'http://localhost/dep',
      });

      await expect(request.resolveDependency()).resolves.toBeNull();
      await expect(request.isExternal()).resolves.toBe(true);
    });
  });

  describe('hasSideEffects()', () => {
    it('returns none for the module itself', async () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'package:root/subpath',
      });

      await expect(request.resolveDependency()).resolves.toMatchObject({ kind: 'self' });
      await expect(request.hasSideEffects()).resolves.toBeUndefined();
    });
    it('returns none for synthetic module', async () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: '\0unknown',
      });

      await expect(request.resolveDependency()).resolves.toMatchObject({ kind: 'synthetic' });
      await expect(request.hasSideEffects()).resolves.toBeUndefined();
    });
    it('returns false for Node built-ins', async () => {
      const request = new Unbundle$Request({ resolutionRoot, moduleId: 'node:fs' });

      await expect(request.resolveDependency()).resolves.toMatchObject({ kind: 'implied' });
      await expect(request.hasSideEffects()).resolves.toBe(false);
    });
    it('returns none for dependency without sideEffects specified', async () => {
      fs.addRoot({
        name: 'root',
        version: '1.0.0',
        dependencies: {
          dep: '^1.0.0',
        },
      });
      fs.addPackage({
        name: 'dep',
        version: '1.0.0',
      });
      resolutionRoot = await resolveRootPackage(fs);

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      await expect(request.resolveDependency()).resolves.toMatchObject({ kind: 'runtime' });
      await expect(request.hasSideEffects()).resolves.toBeUndefined();
    });
    it('returns none for dependency with sideEffects set to wrong value', async () => {
      fs.addRoot({
        name: 'root',
        version: '1.0.0',
        dependencies: {
          dep: '^1.0.0',
        },
      });
      fs.addPackage({
        name: 'dep',
        version: '1.0.0',
        sideEffects: 1,
      });
      resolutionRoot = await resolveRootPackage(fs);

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      await expect(request.resolveDependency()).resolves.toMatchObject({ kind: 'runtime' });
      await expect(request.hasSideEffects()).resolves.toBeUndefined();
    });
    it('returns true for dependency with sideEffects: true', async () => {
      fs.addRoot({
        name: 'root',
        version: '1.0.0',
        dependencies: {
          dep: '^1.0.0',
        },
      });
      fs.addPackage({
        name: 'dep',
        version: '1.0.0',
        sideEffects: true,
      });
      resolutionRoot = await resolveRootPackage(fs);

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      await expect(request.resolveDependency()).resolves.toMatchObject({ kind: 'runtime' });
      await expect(request.hasSideEffects()).resolves.toBe(true);
    });
    it('returns false for dependency with sideEffects: false', async () => {
      fs.addRoot({
        name: 'root',
        version: '1.0.0',
        dependencies: {
          dep: '^1.0.0',
        },
      });
      fs.addPackage({
        name: 'dep',
        version: '1.0.0',
        sideEffects: false,
      });
      resolutionRoot = await resolveRootPackage(fs);

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      await expect(request.resolveDependency()).resolves.toMatchObject({ kind: 'runtime' });
      await expect(request.hasSideEffects()).resolves.toBe(false);
    });
    it('returns undefined for unknown dependency', async () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      await expect(request.resolveDependency()).resolves.toBeNull();
      await expect(request.hasSideEffects()).resolves.toBeUndefined();
    });
  });
});

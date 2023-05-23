import { beforeEach, describe, expect, it } from '@jest/globals';
import { PackageResolution, VirtualPackageFS, resolveRootPackage } from '@run-z/npk';
import { Unbundle$Request } from './unbundle.request.js';

describe('UnbundleRequest', () => {
  let fs: VirtualPackageFS;
  let resolutionRoot: PackageResolution;

  beforeEach(() => {
    fs = new VirtualPackageFS();
    fs.addPackage(fs.root, {
      name: 'root',
      version: '1.0.0',
    });
    resolutionRoot = resolveRootPackage(fs);
  });

  describe('resolveImporter', () => {
    it('uses resolution root when unspecified', () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'package:root/subpath',
      });

      expect(request.resolveImporter()).toBe(resolutionRoot);
    });
    it('resolves importer when specified', () => {
      fs.addPackage(fs.root, {
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

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'package:root/subpath',
        importerId: 'dep1',
      });

      expect(request.resolveImporter().asPackage()?.packageInfo.name).toBe('dep1');
    });
  });

  describe('isExternal()', () => {
    it('returns none for the module itself', () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'package:root/subpath',
      });

      expect(request.resolveDependency()?.kind).toBe('self');
      expect(request.isExternal()).toBeUndefined();
    });
    it('returns none for synthetic module', () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: '\0unknown',
      });

      expect(request.resolveDependency()?.kind).toBe('synthetic');
      expect(request.isExternal()).toBeUndefined();
    });
    it('returns true for Node built-ins', () => {
      const request = new Unbundle$Request({ resolutionRoot, moduleId: 'node:fs' });

      expect(request.resolveDependency()?.kind).toBe('implied');
      expect(request.isExternal()).toBe(true);
    });
    it('returns true for runtime dependency', () => {
      fs.addPackage(fs.root, {
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

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      expect(request.resolveDependency()?.kind).toBe('runtime');
      expect(request.isExternal()).toBe(true);
    });
    it('returns true for peer dependency', () => {
      fs.addPackage(fs.root, {
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

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      expect(request.resolveDependency()?.kind).toBe('peer');
      expect(request.isExternal()).toBe(true);
    });
    it('returns false for dev dependency', () => {
      fs.addPackage(fs.root, {
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

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      expect(request.resolveDependency()?.kind).toBe('dev');
      expect(request.isExternal()).toBe(false);
    });
    it('returns false for unknown package', () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'unknown',
      });

      expect(request.resolveDependency()).toBeNull();
      expect(request.isExternal()).toBe(false);
    });
    it('returns true for URI', () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'http://localhost/dep',
      });

      expect(request.resolveDependency()).toBeNull();
      expect(request.isExternal()).toBe(true);
    });
  });

  describe('hasSideEffects()', () => {
    it('returns none for the module itself', () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'package:root/subpath',
      });

      expect(request.resolveDependency()?.kind).toBe('self');
      expect(request.hasSideEffects()).toBeUndefined();
    });
    it('returns none for synthetic module', () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: '\0unknown',
      });

      expect(request.resolveDependency()?.kind).toBe('synthetic');
      expect(request.hasSideEffects()).toBeUndefined();
    });
    it('returns false for Node built-ins', () => {
      const request = new Unbundle$Request({ resolutionRoot, moduleId: 'node:fs' });

      expect(request.resolveDependency()?.kind).toBe('implied');
      expect(request.hasSideEffects()).toBe(false);
    });
    it('returns none for dependency without sideEffects specified', () => {
      fs.addPackage(fs.root, {
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

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      expect(request.resolveDependency()?.kind).toBe('runtime');
      expect(request.hasSideEffects()).toBeUndefined();
    });
    it('returns none for dependency with sideEffects set to wrong value', () => {
      fs.addPackage(fs.root, {
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

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      expect(request.resolveDependency()?.kind).toBe('runtime');
      expect(request.hasSideEffects()).toBeUndefined();
    });
    it('returns true for dependency with sideEffects: true', () => {
      fs.addPackage(fs.root, {
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

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      expect(request.resolveDependency()?.kind).toBe('runtime');
      expect(request.hasSideEffects()).toBe(true);
    });
    it('returns false for dependency with sideEffects: false', () => {
      fs.addPackage(fs.root, {
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

      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      expect(request.resolveDependency()?.kind).toBe('runtime');
      expect(request.hasSideEffects()).toBe(false);
    });
    it('returns undefined for unknown dependency', () => {
      const request = new Unbundle$Request({
        resolutionRoot,
        moduleId: 'dep',
      });

      expect(request.resolveDependency()).toBeNull();
      expect(request.hasSideEffects()).toBeUndefined();
    });
  });
});

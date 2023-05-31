import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { resolveRootPackage } from '@run-z/npk';
import path from 'node:path';
import { CustomPluginOptions, Plugin, PluginContext, ResolveIdResult, ResolvedId } from 'rollup';
import { Unbundle$Request } from './impl/unbundle.request.js';
import unbundle, {
  type UnbundleOptions,
  type UnbundlePlugin,
  type UnbundleRequest,
} from './plugin.js';
import { TestPackageFS } from './spec/test-package-fs.js';

describe('unbundle', () => {
  let fs: TestPackageFS;

  beforeEach(async () => {
    fs = await TestPackageFS.create();
  });

  let context: jest.MockedObject<PluginContext>;

  beforeEach(() => {
    context = {
      resolve: jest.fn(),
    } as Partial<jest.MockedObject<PluginContext>> as jest.MockedObject<PluginContext>;
  });

  let plugin: UnbundlePlugin;

  afterEach(() => {
    ((plugin as Plugin).closeBundle as (this: PluginContext) => void).call(context);
  });

  let alreadyResolved: Set<string>;

  beforeEach(() => {
    alreadyResolved = new Set<string>();
  });

  describe('init', () => {
    it('creates plugin', () => {
      plugin = unbundle();

      expect(plugin.name).toBe('unbundle');
    });

    it('accepts empty resolution root', async () => {
      plugin = unbundle();

      await expect(resolve('@run-z/npk')).resolves.toEqual({
        id: '@run-z/npk',
        external: true,
        moduleSideEffects: false,
        meta: {
          unbundle: expect.any(Unbundle$Request),
        },
      });
    });
    it('accepts path to resolution root', async () => {
      plugin = unbundle({ resolutionRoot: '.' });

      await expect(resolve('@run-z/npk')).resolves.toEqual({
        id: '@run-z/npk',
        external: true,
        moduleSideEffects: false,
        meta: {
          unbundle: expect.any(Unbundle$Request),
        },
      });
    });
    it('accepts resolution root instance', async () => {
      plugin = unbundle({ resolutionRoot: await resolveRootPackage() });

      await expect(resolve('@run-z/npk')).resolves.toEqual({
        id: '@run-z/npk',
        external: true,
        moduleSideEffects: false,
        meta: {
          unbundle: expect.any(Unbundle$Request),
        },
      });
    });
  });

  describe('resolveId', () => {
    beforeAll(() => {
      plugin = unbundle({
        resolutionRoot: async () => await resolveRootPackage(fs),
        isExternal: async request => await isExternal(request),
      });
    });

    let isExternal: Exclude<UnbundleOptions['isExternal'], undefined>;

    beforeEach(() => {
      isExternal = () => void 0;
    });

    it('externalizes runtime dependency', async () => {
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

      await expect(resolve('dep')).resolves.toEqual({
        id: 'dep',
        external: true,
        meta: {
          unbundle: expect.any(Unbundle$Request),
        },
      });
    });
    it('externalizes peer dependency', async () => {
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
      await expect(resolve('dep')).resolves.toEqual({
        id: 'dep',
        external: true,
        meta: {
          unbundle: expect.any(Unbundle$Request),
        },
      });
    });
    it('does not resolve dev dependency', async () => {
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

      await expect(resolve('dep')).resolves.toBeUndefined();
    });
    it('resolves external dev dependency', async () => {
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

      isExternal = () => true;

      await expect(resolve('dep')).resolves.toEqual({
        id: 'dep',
        external: true,
        meta: {
          unbundle: expect.any(Unbundle$Request),
        },
      });
    });
    it('resolves URI dependency', async () => {
      await expect(resolve('http://localhost/pkg')).resolves.toEqual({
        id: 'http://localhost/pkg',
        external: true,
        meta: {
          unbundle: expect.any(Unbundle$Request),
        },
      });
    });
    it('ignores non-external URI', async () => {
      isExternal = () => false;
      await expect(resolve('http://localhost/pkg')).resolves.toBeUndefined();
    });
    it('does not resolve unknown dependency', async () => {
      await expect(resolve('unknown')).resolves.toBeUndefined();
    });
    it('externalizes unknown external dependency', async () => {
      isExternal = () => true;
      await expect(resolve('unknown')).resolves.toBe(false);
    });
    it('externalizes resolution of another plugin', async () => {
      fs.addRoot({
        name: 'root',
        version: '1.0.0',
        dependencies: {
          target: '^1.0.0',
        },
      });
      fs.addPackage({
        name: 'target',
        version: '1.0.0',
      });

      const resolution = buildResolution({
        id: '/path/to/target',
        resolvedBy: 'test',
        meta: { test: true },
      });

      context.resolve.mockImplementation((source, _importer, _options) => {
        if (source === 'target') {
          return Promise.resolve(resolution);
        }

        return Promise.resolve(null);
      });

      const result = await resolve('target');

      expect(result).toEqual({
        id: 'target',
        external: true,
        meta: {
          unbundle: expect.any(Unbundle$Request),
        },
      });
    });
    it('externalizes non-external resolution of another plugin', async () => {
      fs.addRoot({
        name: 'root',
        version: '1.0.0',
        dependencies: {
          target: '^1.0.0',
        },
      });
      fs.addPackage({
        name: 'target',
        version: '1.0.0',
      });

      const resolution = buildResolution({
        id: 'target',
        resolvedBy: 'test',
        meta: { test: true },
      });

      context.resolve.mockImplementation((source, _importer, _options) => {
        if (source === 'target') {
          return Promise.resolve(resolution);
        }

        return Promise.resolve(null);
      });

      const result = (await resolve('target')) as ResolvedId;

      expect(result).toEqual({
        id: 'target',
        external: true,
        meta: {
          unbundle: expect.any(Unbundle$Request),
        },
      });

      const request = result.meta.unbundle as UnbundleRequest;

      expect(request.isResolved).toBe(false);
    });
    it('resolves dependency recurrently', async () => {
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

      context.resolve.mockImplementation(async (source, importer, options) => {
        if (source === 'dep') {
          return await resolveId('package:dep/1.0.0', importer, options);
        }

        return null;
      });

      const result = (await resolve('dep')) as ResolvedId;

      expect(result).toEqual({
        id: 'dep',
        assertions: {},
        external: true,
        moduleSideEffects: false,
        syntheticNamedExports: false,
        resolvedBy: 'unbundle',
        meta: {
          unbundle: expect.any(Unbundle$Request),
        },
      });

      const request = result.meta.unbundle as UnbundleRequest;

      expect(request.isResolved).toBe(true);
      expect(request.moduleId).toBe('package:dep/1.0.0');
      expect(request.importerId).toBeUndefined();
      expect(request.rewrittenRequest?.moduleId).toBe('dep');
      expect(request.rewrittenRequest?.importerId).toBeUndefined();
    });
    it('do not try to resolve recurrently for absolute path', async () => {
      const resolution = buildResolution({
        id: '/path/to/target',
        meta: { test: true },
        resolvedBy: 'test',
      });

      context.resolve.mockImplementation(async (source, importer, options) => {
        if (source === 'dep') {
          return (await resolveId('/path/to/target', importer, options)) ?? resolution;
        }

        return null;
      });

      const result = (await resolve('dep')) as ResolvedId;

      expect(result).toEqual(resolution);
      expect(result.meta.unbundle).toBeUndefined();
    });
    it('starts resolution over for another importer', async () => {
      fs.addRoot({
        name: 'root',
        version: '1.0.0',
        dependencies: {
          dep: '^1.0.0',
        },
      });
      fs.addPackage({
        name: 'another-importer',
        version: '1.0.0',
        devDependencies: {
          dep: '^1.0.0',
        },
      });
      fs.addPackage({
        name: 'dep',
        version: '1.0.0',
      });

      context.resolve.mockImplementation(async (source, _importer, options) => {
        if (source === 'dep') {
          return await resolveId('package:dep/1.0.0', 'package:another-importer/1.0.0', options);
        }

        return null;
      });

      const result = (await resolve('dep')) as ResolvedId;

      expect(result).toEqual({
        id: 'dep',
        external: true,
        moduleSideEffects: false,
        assertions: {},
        meta: {
          unbundle: expect.any(Unbundle$Request),
        },
        resolvedBy: 'unbundle',
        syntheticNamedExports: false,
      });

      const request = result.meta.unbundle as UnbundleRequest;

      expect(request.isResolved).toBe(false);
      expect(request.moduleId).toBe('package:dep/1.0.0');
      expect(request.importerId).toBe('package:another-importer/1.0.0');
    });
    it('resolves externalized self-reference', async () => {
      isExternal = async request => (await request.resolveModule()).asSubPackage()?.importSpec.spec === '#private';

      const result = (await resolve('#private')) as ResolvedId;

      expect(result).toEqual({
        id: '#private',
        external: true,
        meta: {
          unbundle: expect.any(Unbundle$Request),
        },
      });
    });
    it('dereferences package', async () => {
      fs.addRoot({
        name: 'root',
        version: '1.0.0',
        devDependencies: {
          dep: '^1.0.0',
        },
      });
      fs.addPackage(
        {
          name: 'dep',
          version: '1.0.0',
        },
        {
          deref: { '': './dist/index.js' },
        },
      );

      context.resolve.mockImplementation(
        async (source, importer, options) => await resolveId(source, importer, options),
      );

      const result = (await resolve('dep')) as ResolvedId;

      expect(result).toEqual(
        buildResolution({
          id: path.resolve('/dep/1.0.0/dist/index.js'),
          external: false,
          meta: {
            unbundle: expect.any(Unbundle$Request),
          },
        }),
      );

      const request = result.meta.unbundle as UnbundleRequest;

      expect(request.isResolved).toBe(true);
      expect(request.moduleId).toBe(path.resolve('/dep/1.0.0/dist/index.js'));
      expect(request.rewrittenRequest?.moduleId).toBe('dep');
      expect(request.importerId).toBeUndefined();
    });
    it('does not resolve synthetic imports', async () => {
      const result = await resolve('\0synthetic');

      expect(result).toBeUndefined();
    });
    it('respects isExternal option for synthetic imports', async () => {
      isExternal = () => true;

      const result = await resolve('\0synthetic');

      expect(result).toBe(false);
    });
    it('externalizes Node.js built-in', async () => {
      const result = await resolve('node:fs');

      expect(result).toEqual({
        id: 'node:fs',
        external: true,
        meta: {
          unbundle: expect.any(Unbundle$Request),
        },
        moduleSideEffects: false,
      });
    });
    it('ignores non-external Node.js built-in', async () => {
      isExternal = () => false;

      const result = await resolve('node:fs');

      expect(result).toBeUndefined();
    });
  });

  async function resolve(
    moduleId: string,
    importerId?: string,
    options: {
      assertions?: Record<string, string> | undefined;
      custom?: CustomPluginOptions | undefined;
      isEntry?: boolean | undefined;
    } = {},
  ): Promise<ResolveIdResult> {
    if (alreadyResolved.has(moduleId)) {
      return null;
    }

    alreadyResolved.add(moduleId);

    const { assertions = {}, isEntry = true } = options;

    return await plugin.resolveId.call(context, moduleId, importerId, {
      ...options,
      assertions,
      isEntry,
    });
  }

  async function resolveId(
    moduleId: string,
    importerId: string | undefined,
    options: {
      assertions?: Record<string, string> | undefined;
      custom?: CustomPluginOptions | undefined;
      isEntry?: boolean | undefined;
    } = {},
  ): Promise<ResolvedId | null> {
    return buildResolution(await resolve(moduleId, importerId, options));
  }

  function buildResolution(
    result: ResolveIdResult,
    options: {
      assertions?: Record<string, string> | undefined;
      custom?: CustomPluginOptions | undefined;
      isEntry?: boolean | undefined;
    } = {},
  ): ResolvedId | null {
    const { assertions = {}, custom } = options;

    if (!result) {
      return null;
    }
    if (typeof result === 'string') {
      result = {
        id: result,
      };
    }

    const { external, moduleSideEffects, resolvedBy = 'unbundle' } = result;

    return {
      ...result,
      external: !!external,
      resolvedBy,
      assertions,
      meta: { ...custom, ...result.meta },
      moduleSideEffects: moduleSideEffects ?? false,
      syntheticNamedExports: false,
    };
  }
});

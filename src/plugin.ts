/**
 * @module rollup-plugin-unbundle
 */
export type * from './unbundle-options.js';
export type * from './unbundle-request.js';
import { recognizeImport, resolveRootPackage, type DependencyResolution } from '@run-z/npk';
import type {
  CustomPluginOptions,
  MakeAsync,
  Plugin,
  PluginContext,
  ResolveIdHook,
  ResolveIdResult,
} from 'rollup';
import { Unbundle$Request } from './impl/unbundle.request.js';
import type { UnbundleOptions } from './unbundle-options.js';

/**
 * Creates unbundle Rollup plugin.
 *
 * @param options - Unbundle options.
 *
 * @returns New plugin instance.
 */
export default function unbundle(options: UnbundleOptions = {}): UnbundlePlugin {
  const { resolutionRoot: root, isExternal } = options;
  const resolutionRoot = root == null || typeof root === 'string' ? resolveRootPackage(root) : root;

  return {
    name: 'unbundle',
    async resolveId(
      this: PluginContext,
      moduleId: string,
      importerId: string | undefined,
      options: {
        assertions: Record<string, string>;
        custom?: CustomUnbundleOptions | undefined;
        isEntry: boolean;
      },
    ): Promise<ResolveIdResult> {
      const { custom = {} } = options;
      const { unbundle: rewrittenRequest } = custom;
      let request: Unbundle$Request;

      if (!rewrittenRequest) {
        request = new Unbundle$Request({ resolutionRoot, moduleId, importerId });
      } else {
        // Recurrent request.
        const importSpec = recognizeImport(moduleId);

        if (importSpec.kind === 'path' && !importSpec.isRelative) {
          // Do not try to resolve absolute path.
          // Such request may be sent e.g. by `node-resolve` after it resolves module ID to module path.
          return;
        }

        request = rewrittenRequest.rewrite({ moduleId, importerId });
      }

      const resolution = await this.resolve(moduleId, importerId, {
        ...options,
        skipSelf: true, // Prevent recurrent requests with the same `moduleId` and `importerId`.
        custom: { ...custom, unbundle: request },
      });

      if (!resolution) {
        // Other plugins failed to resolve ID.
        // Try to resolve it.
        return resolveModuleId(request);
      }

      const { external } = resolution;

      if (external) {
        // Module is external already.
        return resolution;
      }

      const pluginResolution = resolveModuleId(request);

      if (
        pluginResolution
        && (pluginResolution.id !== resolution.id
          || (!resolution.external && pluginResolution.external))
      ) {
        return pluginResolution;
      }

      return resolution;
    },
  };

  function detectExternal(request: Unbundle$Request): boolean {
    return isExternal?.(request) ?? request.isExternal() ?? false;
  }

  function resolveModuleId(request: Unbundle$Request): UnbundleResult {
    const dependency = request.resolveDependency();
    const result = dependency
      ? resolveDependencyId(request, dependency)
      : resolveUnknownId(request);

    if (result != null) {
      return result && { ...result, meta: { unbundle: request } };
    }

    // External module without ID?
    return detectExternal(request) ? false : undefined;
  }

  function resolveUnknownId(request: Unbundle$Request): UnbundleResult {
    const resolvedModule = request.resolveModule();

    if (resolvedModule.importSpec.kind === 'uri' && detectExternal(request)) {
      // Resolve external URI.
      return {
        id: resolvedModule.uri,
        external: true,
        moduleSideEffects: request.hasSideEffects(),
      };
    }

    return resolveSubPackageId(request);
  }

  function resolveDependencyId(
    request: Unbundle$Request,
    { kind }: DependencyResolution,
  ): UnbundleResult {
    switch (kind) {
      case 'synthetic':
        // Can not decide for synthetic imports.
        break;
      case 'implied':
        return resolveImpliedId(request);
      case 'dev':
      case 'peer':
      case 'runtime':
        return resolveSubPackageId(request);
      case 'self':
        return resolveSelfId(request);
    }
  }

  function resolveSelfId(request: Unbundle$Request): UnbundleResult {
    const self = request.resolveModule().asSubPackage()!;

    if (self && detectExternal(request)) {
      const { importSpec } = self;

      return {
        id: importSpec.spec,
        external: true,
        moduleSideEffects: request.hasSideEffects(),
      };
    }
  }

  function resolveSubPackageId(request: Unbundle$Request): UnbundleResult {
    const subPackage = request.resolveModule().asSubPackage();

    if (subPackage) {
      const { importSpec } = subPackage;

      if (detectExternal(request)) {
        return {
          id: importSpec.spec,
          external: true,
          moduleSideEffects: request.hasSideEffects(),
        };
      }

      // TODO Unwrap to file path?
    }
  }

  function resolveImpliedId(request: Unbundle$Request): UnbundleResult {
    if (detectExternal(request)) {
      const resolvedModule = request.resolveModule();

      return {
        id: resolvedModule.importSpec.spec,
        external: true,
        moduleSideEffects: request.hasSideEffects(),
      };
    }
  }
}

export interface UnbundlePlugin extends Plugin {
  readonly name: 'unbundle';
  readonly resolveId: MakeAsync<ResolveIdHook>;
}

interface CustomUnbundleOptions extends CustomPluginOptions {
  unbundle?: Unbundle$Request | undefined;
}

type UnbundleResult = Exclude<ResolveIdResult, string | null>;

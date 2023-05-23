/**
 * @module rollup-plugin-unbundle
 */
export type * from './unbundle-options.js';
export type * from './unbundle-request.js';
import { resolveRootPackage, type DependencyResolution } from '@run-z/npk';
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
      const { unbundle: prevRequest } = custom;
      const request = prevRequest
        ? prevRequest.continueResolution({ moduleId, importerId })
        : new Unbundle$Request({ resolutionRoot, moduleId, importerId });

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

      return {
        ...resolution,
        external: detectExternal(request),
      };
    },
  };

  function detectExternal(request: Unbundle$Request, byDefault = false): boolean {
    return isExternal?.(request) ?? request.isExternal() ?? byDefault;
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
  }

  function resolveDependencyId(
    request: Unbundle$Request,
    { kind }: DependencyResolution,
  ): UnbundleResult {
    const resolved = request.resolveModule();

    switch (kind) {
      case 'synthetic':
        // Can not decide for synthetic imports.
        break;
      case 'implied':
      case 'dev':
      case 'peer':
      case 'runtime':
      case 'self':
        return detectExternal(request)
          ? {
              id: resolved.importSpec.spec,
              external: true,
              moduleSideEffects: request.hasSideEffects(),
            }
          : undefined;
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

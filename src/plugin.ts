/**
 * @module rollup-plugin-unbundle
 */
export type * from './unbundle-options.js';
export type * from './unbundle-request.js';
import { resolveRootPackage, type ImportDependency, type ImportResolution } from '@run-z/npk';
import type {
  CustomPluginOptions,
  MakeAsync,
  Plugin,
  PluginContext,
  ResolveIdHook,
  ResolveIdResult,
  ResolvedId,
} from 'rollup';
import { Unbundle$Request } from './impl/unbundle.request.js';
import { uriToPath } from './impl/uri-to-path.js';
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
  let createResolutionRoot: () => ImportResolution | Promise<ImportResolution>;

  if (root == null || typeof root === 'string') {
    createResolutionRoot = async () => await resolveRootPackage(root);
  } else if (typeof root === 'function') {
    createResolutionRoot = async () => await root();
  } else {
    createResolutionRoot = () => root;
  }

  let resolutionRoot: ImportResolution | undefined;

  return {
    name: 'unbundle',
    closeBundle() {
      resolutionRoot = undefined;
    },
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
      const { unbundle: { request: rewrittenRequest, resolvePath } = {} } = custom;
      let request: Unbundle$Request;

      const next = async (
        moduleId: string,
        {
          resolvePath = false,
        }: {
          readonly resolvePath?: boolean | undefined;
        } = {},
      ): Promise<ResolvedId | null> => await this.resolve(moduleId, importerId, {
          ...options,
          skipSelf: !resolvePath, // Prevent recurrent requests with the same `moduleId` and `importerId`.
          custom: { ...custom, unbundle: { request, resolvePath } },
        });

      if (!resolutionRoot) {
        resolutionRoot = await createResolutionRoot();
      }

      const importSpec = resolutionRoot.fs.recognizeImport(moduleId);
      const isAbsolutePath = importSpec.kind === 'path' && !importSpec.isRelative;

      if (!rewrittenRequest) {
        request = new Unbundle$Request({ resolutionRoot, moduleId, importerId });
      } else {
        // Recurrent request.
        if (!resolvePath && isAbsolutePath) {
          // Do not try to resolve absolute path.
          // Such request may be sent e.g. by `node-resolve` after it resolves module ID to module path.
          return;
        }

        request = rewrittenRequest.rewrite({ moduleId, importerId });
      }

      const resolution = await next(moduleId);

      if (!resolution) {
        // Other plugins failed to resolve ID.
        // Try to resolve it.
        return await resolveModuleId(request);
      }

      const { external } = resolution;

      if (external) {
        // Module is external already.
        return resolution;
      }

      const pluginResolution = await resolveModuleId(request);

      if (pluginResolution && !resolution.external && pluginResolution.external) {
        // Replace non-external resolution with external one.
        return pluginResolution;
      }

      return resolution;

      async function resolveModuleId(request: Unbundle$Request): Promise<UnbundleResult> {
        const dependency = await request.resolveDependency();
        const result = dependency
          ? await resolveDependencyId(request, dependency)
          : await resolveUnknownId(request);

        if (result != null) {
          return (
            result && {
              ...result,
              meta: {
                unbundle: result.meta?.unbundle ?? request,
              },
            }
          );
        }

        // External module without ID?
        return (await detectExternal(request)) ? false : undefined;
      }

      async function resolveUnknownId(request: Unbundle$Request): Promise<UnbundleResult> {
        const on = await request.resolveModule();

        if (on.importSpec.kind === 'uri' && (await detectExternal(request))) {
          // Resolve external URI.
          return {
            id: on.uri,
            external: true,
            moduleSideEffects: await request.hasSideEffects(),
          };
        }

        return await resolveSubPackageId(request, on);
      }

      async function resolveDependencyId(
        request: Unbundle$Request,
        { kind, on }: ImportDependency,
      ): Promise<UnbundleResult> {
        switch (kind) {
          case 'synthetic':
            // Can not decide for synthetic imports.
            break;
          case 'implied':
            return await resolveImpliedId(request, on);
          case 'dev':
          case 'peer':
          case 'runtime':
          case 'self':
            return await resolveSubPackageId(request, on);
        }
      }

      async function resolveSubPackageId(
        request: Unbundle$Request,
        on: ImportResolution,
      ): Promise<UnbundleResult> {
        const subPackage = on.asSubPackage();

        if (subPackage) {
          const { importSpec } = subPackage;

          if (await detectExternal(request)) {
            return {
              id: importSpec.spec,
              external: true,
              moduleSideEffects: await request.hasSideEffects(),
            };
          }

          const deref = subPackage.deref().asSubPackage();

          if (deref?.importSpec.kind === 'path') {
            if (resolvePath) {
              // Recurrently requested path resolution.
              return {
                id: request.moduleId,
                external: await detectExternal(request),
                moduleSideEffects: await request.hasSideEffects(),
              };
            }

            // Recurrently request path resolution.
            return await next(uriToPath(deref.uri), { resolvePath: true });
          }
        }
      }
    },
  };

  async function detectExternal(request: Unbundle$Request): Promise<boolean> {
    return (await isExternal?.(request)) ?? (await request.isExternal()) ?? false;
  }

  async function resolveImpliedId(
    request: Unbundle$Request,
    on: ImportResolution,
  ): Promise<UnbundleResult> {
    if (await detectExternal(request)) {
      return {
        id: on.importSpec.spec,
        external: true,
        moduleSideEffects: await request.hasSideEffects(),
      };
    }
  }
}

export interface UnbundlePlugin extends Plugin {
  readonly name: 'unbundle';
  readonly resolveId: MakeAsync<ResolveIdHook>;
}

interface CustomUnbundleOptions extends CustomPluginOptions {
  unbundle?: {
    readonly request: Unbundle$Request;
    readonly resolvePath: boolean;
  };
}

type UnbundleResult = Exclude<ResolveIdResult, string>;

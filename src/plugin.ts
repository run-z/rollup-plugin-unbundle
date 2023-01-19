/**
 * @module rollup-plugin-unbundle
 */
export * from './unbundle-options.js';
export * from './unbundle-request.js';
import { InputOptions, MinimalPluginContext } from 'rollup';
import { IsRollupExternalImport } from './api/is-rollup-external-import.js';
import { updateExternal } from './impl/update-external.js';
import { UnbundleOptions } from './unbundle-options.js';

/**
 * Creates unbundle Rollup plugin.
 *
 * @param options - Unbundle options.
 *
 * @returns New plugin instance.
 */
export default function unbundle(options?: UnbundleOptions): UnbundlePlugin {
  return {
    name: 'unbundle',
    options(this: MinimalPluginContext, rollupOptions: InputOptions) {
      return {
        ...rollupOptions,
        external: updateExternal(IsRollupExternalImport(rollupOptions.external), options),
      };
    },
  };
}

export interface UnbundlePlugin {
  readonly name: 'unbundle';
  readonly options: (
    this: MinimalPluginContext,
    rollupOptions: InputOptions,
  ) => UnbundlePlugin.ModifiedOptions;
}

export namespace UnbundlePlugin {
  export interface ModifiedOptions extends InputOptions {
    external: IsRollupExternalImport;
  }
}

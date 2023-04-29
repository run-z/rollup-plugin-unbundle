/**
 * @module rollup-plugin-unbundle
 */
export type * from './is-rollup-external-import.js';
export type * from './unbundle-options.js';
export type * from './unbundle-request.js';
import type { InputOptions, MinimalPluginContext } from 'rollup';
import { mergeRollupExternal } from './impl/merge-rollup-external.js';
import { updateExternal } from './impl/update-external.js';
import type { IsRollupExternalImport } from './is-rollup-external-import.js';
import type { UnbundleOptions } from './unbundle-options.js';

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
        external: updateExternal(mergeRollupExternal(rollupOptions.external), options),
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

/**
 * @module rollup-plugin-unbundle
 */
export * from './unbundle-options.js';
export * from './unbundle-request.js';
import { InputOptions, MinimalPluginContext, Plugin } from 'rollup';
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
export default function unbundle(options?: UnbundleOptions): Plugin {
  return {
    name: 'unbundle',
    options(this: MinimalPluginContext, rollupOptions: InputOptions): InputOptions {
      return {
        ...rollupOptions,
        external: updateExternal(IsRollupExternalImport(rollupOptions.external), options),
      };
    },
  };
}

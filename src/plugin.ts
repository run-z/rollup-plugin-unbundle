/**
 * @module rollup-plugin-unbundle
 */
import { InputOptions, MinimalPluginContext, Plugin } from 'rollup';
import { IsRollupExternalImport } from './api/is-rollup-external-import.js';
import { updateExternal } from './impl/update-external.js';

/**
 * Creates unbundle Rollup plugin.
 *
 * @returns New plugin instance.
 */
export default function unbundle(): Plugin {
  return {
    name: 'unbundle',
    options(this: MinimalPluginContext, options: InputOptions): InputOptions {
      return {
        ...options,
        external: updateExternal(IsRollupExternalImport(options.external)),
      };
    },
  };
}

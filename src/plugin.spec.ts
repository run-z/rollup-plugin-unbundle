import { describe, expect, it } from '@jest/globals';
import { MinimalPluginContext } from 'rollup';
import unbundle from './plugin.js';

describe('unbundle', () => {
  it('creates plugin', () => {
    const plugin = unbundle();

    expect(plugin.name).toBe('unbundle');
  });
  it('enhances "external" option', () => {
    const plugin = unbundle();
    const options = plugin.options.call({} as MinimalPluginContext, {});

    expect(options.external.name).toBe('isExternalOrBundled');
  });
});

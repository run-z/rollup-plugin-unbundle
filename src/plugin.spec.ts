import { describe, expect, it } from '@jest/globals';
import { InputOptions } from 'rollup';
import { IsRollupExternalImport } from './api/is-rollup-external-import.js';
import unbundle from './plugin.js';

describe('unbundle', () => {
  it('creates plugin', () => {
    const plugin = unbundle();

    expect(plugin.name).toBe('unbundle');
  });
  it('enhances "external" option', () => {
    const plugin = unbundle();
    const options = (plugin.options as (options: InputOptions) => InputOptions)({});

    expect((options.external as IsRollupExternalImport).name).toBe('isExternalOrBundled');
  });
});

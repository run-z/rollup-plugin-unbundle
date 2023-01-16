import { beforeEach, describe, expect, it } from '@jest/globals';
import { IsRollupExternalImport } from '../api/is-rollup-external-import.js';
import { updateExternal } from './update-external.js';

describe('updateExternal', () => {
  let isExternal: IsRollupExternalImport;
  let baseExternal: IsRollupExternalImport;

  beforeEach(() => {
    isExternal = updateExternal((...args) => baseExternal(...args));
    baseExternal = source => source === 'external-module';
  });

  it('respects updated option', () => {
    expect(isExternal('external-module', undefined, false)).toBe(true);
    expect(isExternal('internal-module', undefined, false)).toBe(false);
  });
  it('excludes nodejs built-ins', () => {
    baseExternal = () => null;
    expect(isExternal('node:fs', undefined, false)).toBe(true);
  });
});

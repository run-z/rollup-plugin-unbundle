import { describe, expect, it } from '@jest/globals';
import { IsRollupExternalImport } from '../is-rollup-external-import.js';
import { mergeRollupExternal } from './merge-rollup-external.js';

describe('mergeRollupExternal', () => {
  it('converts undefined to no-op', () => {
    const external = mergeRollupExternal(undefined);

    expect(external('some', 'importer', false)).toBeUndefined();
    expect(external.name).toBe('notExternal');
  });
  it('converts empty array to no-op', () => {
    const external = mergeRollupExternal([]);

    expect(external('some', 'importer', false)).toBeUndefined();
    expect(external.name).toBe('notExternal');
  });
  it('retains function as is', () => {
    const external: IsRollupExternalImport = () => false;

    expect(mergeRollupExternal(external)).toBe(external);
  });
  it('converts string to function', () => {
    const external = mergeRollupExternal('foo');

    expect(external.name).toBe('hasExternalId');
    expect(external('foo', 'importer', false)).toBe(true);
    expect(external('bar', 'importer', false)).toBeUndefined();
  });
  it('converts array of strings to function', () => {
    const external = mergeRollupExternal(['foo', 'bar']);

    expect(external.name).toBe('hasOneOfExternalIds');
    expect(external('foo', 'importer', false)).toBe(true);
    expect(external('bar', 'importer', false)).toBe(true);
    expect(external('baz', 'importer', false)).toBeUndefined();
  });
  it('converts regexp to function', () => {
    const external = mergeRollupExternal(/^foo/);

    expect(external.name).toBe('matchesExternalIdPattern');
    expect(external('foo', 'importer', false)).toBe(true);
    expect(external('foo-2', 'importer', false)).toBe(true);
    expect(external('bar', 'importer', false)).toBeUndefined();
  });
  it('converts array of regexps to function', () => {
    const external = mergeRollupExternal([/^foo/, /^bar/]);

    expect(external.name).toBe('matchesOneOfExternalIdPatterns');
    expect(external('foo', 'importer', false)).toBe(true);
    expect(external('bar-2', 'importer', false)).toBe(true);
    expect(external('baz', 'importer', false)).toBeUndefined();
  });
  it('converts mixed array to function', () => {
    const external = mergeRollupExternal(['foo', /^bar/]);

    expect(external.name).toBe('isExternalModuleId');
    expect(external('foo', 'importer', false)).toBe(true);
    expect(external('bar', 'importer', false)).toBe(true);
    expect(external('bar-2', 'importer', false)).toBe(true);
    expect(external('baz', 'importer', false)).toBeUndefined();
  });
});

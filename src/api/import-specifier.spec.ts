import { describe, expect, it } from '@jest/globals';
import { parseImportSpecifier } from './import-specifier.js';

describe('parseImportSpecifier', () => {
  it('recognizes scoped package', () => {
    const spec = '@test-scope/test-package';

    expect(parseImportSpecifier(spec)).toEqual({
      kind: 'package',
      spec,
      name: spec,
      scope: '@test-scope',
      local: 'test-package',
    });
  });
  it('recognizes subpath of scoped package', () => {
    const spec = '@test-scope/test-package/some/path';

    expect(parseImportSpecifier(spec)).toEqual({
      kind: 'package',
      spec,
      name: '@test-scope/test-package',
      scope: '@test-scope',
      local: 'test-package',
      subpath: '/some/path',
    });
  });
  it('recognizes unscoped package', () => {
    const spec = 'test-package';

    expect(parseImportSpecifier(spec)).toEqual({
      kind: 'package',
      spec,
      name: spec,
      local: 'test-package',
    });
  });
  it('recognizes subpath of unscoped package', () => {
    const spec = 'test-package/some/path';

    expect(parseImportSpecifier(spec)).toEqual({
      kind: 'package',
      spec,
      name: 'test-package',
      local: 'test-package',
      subpath: '/some/path',
    });
  });
  it('does not recognize wrong package name', () => {
    expect(parseImportSpecifier('@test')).toEqual({ kind: 'unknown', spec: '@test' });
    expect(parseImportSpecifier('_test')).toEqual({ kind: 'unknown', spec: '_test' });
    expect(parseImportSpecifier('.test')).toEqual({ kind: 'unknown', spec: '.test' });
  });
  it('recognizes URI', () => {
    const spec = 'file:///test-path?query';

    expect(parseImportSpecifier(spec)).toEqual({
      kind: 'uri',
      spec,
      scheme: 'file',
      path: '/test-path',
    });
  });
  it('recognizes absolute path', () => {
    const spec = '/test-path';

    expect(parseImportSpecifier(spec)).toEqual({
      kind: 'path',
      spec,
      isRelative: false,
    });
  });
  it('recognizes relative path', () => {
    const spec = './test-path';

    expect(parseImportSpecifier(spec)).toEqual({
      kind: 'path',
      spec,
      isRelative: true,
    });
  });
  it('recognizes virtual module', () => {
    const spec = '\0file:///test-path?query';

    expect(parseImportSpecifier(spec)).toEqual({
      kind: 'virtual',
      spec,
    });
  });
  it('recognizes subpath', () => {
    const spec = '#/internal';

    expect(parseImportSpecifier(spec)).toEqual({
      kind: 'subpath',
      spec,
    });
  });
});

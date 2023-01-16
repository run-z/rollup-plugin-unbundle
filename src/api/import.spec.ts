import { describe, expect, it } from '@jest/globals';
import { Import, recognizeImport } from './import.js';

describe('recognizeImport', () => {
  it('does not alter recognized import', () => {
    const spec: Import = { kind: 'unknown', spec: '_path/to/file' };

    expect(recognizeImport(spec)).toBe(spec);
  });

  describe('node imports', () => {
    it('recognized with "node:" prefix', () => {
      expect(recognizeImport('node:fs')).toEqual({
        kind: 'env',
        spec: 'node:fs',
        env: 'node',
      });
    });
    it('recognizes built-in module name', () => {
      expect(recognizeImport('fs')).toEqual({
        kind: 'env',
        spec: 'fs',
        env: 'node',
      });
      expect(recognizeImport('path')).toEqual({
        kind: 'env',
        spec: 'path',
        env: 'node',
      });
    });
    it('recognizes sub-export of built-in module', () => {
      expect(recognizeImport('fs/promises')).toEqual({
        kind: 'env',
        spec: 'fs/promises',
        env: 'node',
      });
      expect(recognizeImport('stream/web')).toEqual({
        kind: 'env',
        spec: 'stream/web',
        env: 'node',
      });
    });
    it('does not recognize wrong node built-in with "node:" prefix', () => {
      expect(recognizeImport('node:wrong-module')).toEqual({
        kind: 'uri',
        spec: 'node:wrong-module',
        scheme: 'node',
        path: 'wrong-module',
      });
      expect(recognizeImport('node:fs/wrong-sub-module')).toEqual({
        kind: 'uri',
        spec: 'node:fs/wrong-sub-module',
        scheme: 'node',
        path: 'fs/wrong-sub-module',
      });
    });
  });

  it('recognizes scoped package', () => {
    const spec = '@test-scope/test-package';

    expect(recognizeImport(spec)).toEqual({
      kind: 'package',
      spec,
      name: spec,
      scope: '@test-scope',
      local: 'test-package',
    });
  });
  it('recognizes subpath of scoped package', () => {
    const spec = '@test-scope/test-package/some/path';

    expect(recognizeImport(spec)).toEqual({
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

    expect(recognizeImport(spec)).toEqual({
      kind: 'package',
      spec,
      name: spec,
      local: 'test-package',
    });
  });
  it('recognizes subpath of unscoped package', () => {
    const spec = 'test-package/some/path';

    expect(recognizeImport(spec)).toEqual({
      kind: 'package',
      spec,
      name: 'test-package',
      local: 'test-package',
      subpath: '/some/path',
    });
  });
  it('does not recognize wrong package name', () => {
    expect(recognizeImport('@test')).toEqual({ kind: 'unknown', spec: '@test' });
    expect(recognizeImport('_test')).toEqual({ kind: 'unknown', spec: '_test' });
    expect(recognizeImport('.test')).toEqual({ kind: 'unknown', spec: '.test' });
  });
  it('recognizes URI', () => {
    const spec = 'file:///test-path?query';

    expect(recognizeImport(spec)).toEqual({
      kind: 'uri',
      spec,
      scheme: 'file',
      path: '/test-path',
    });
  });
  it('recognizes absolute path', () => {
    const spec = '/test-path';

    expect(recognizeImport(spec)).toEqual({
      kind: 'path',
      spec,
      isRelative: false,
    });
  });
  it('recognizes relative path', () => {
    const spec = './test-path';

    expect(recognizeImport(spec)).toEqual({
      kind: 'path',
      spec,
      isRelative: true,
    });
  });
  it('recognizes virtual module', () => {
    const spec = '\0file:///test-path?query';

    expect(recognizeImport(spec)).toEqual({
      kind: 'virtual',
      spec,
    });
  });
  it('recognizes subpath', () => {
    const spec = '#/internal';

    expect(recognizeImport(spec)).toEqual({
      kind: 'subpath',
      spec,
    });
  });
});

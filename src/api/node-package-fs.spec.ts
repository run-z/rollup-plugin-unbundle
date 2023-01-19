import { beforeEach, describe, expect, it } from '@jest/globals';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Import, recognizeImport } from './import.js';
import { NodePackageFS } from './node-package-fs.js';

describe('NodePackageFS', () => {
  let fs: NodePackageFS;

  beforeEach(() => {
    fs = new NodePackageFS();
  });

  describe('getPackageURI', () => {
    it('ignores non-file URLs', () => {
      expect(
        fs.getPackageURI(recognizeImport('http:///localhost/pkg') as Import.URI),
      ).toBeUndefined();
    });
  });

  describe('parentDir', () => {
    it('returns undefined for root dir', () => {
      expect(fs.parentDir('file:///')).toBeUndefined();
    });
  });

  describe('loadPackageJson', () => {
    it('ignores non-file package.json', () => {
      expect(fs.loadPackageJson(pathToFileURL(path.resolve('testing')).href)).toBeUndefined();
    });
    it('ignores incomplete package.json', () => {
      expect(
        fs.loadPackageJson(pathToFileURL(path.resolve('testing/wrong-package')).href),
      ).toBeUndefined();
    });
  });
});
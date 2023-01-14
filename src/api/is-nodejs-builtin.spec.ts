import { describe, expect, it } from '@jest/globals';
import { isNodeJSBuiltin } from './is-nodejs-builtin.js';

describe('isNodeJSBuiltin', () => {
  it('returns true for module id with "node:" prefix', () => {
    expect(isNodeJSBuiltin('node:fs')).toBe(true);
  });
  it('returns true for built-in module name', () => {
    expect(isNodeJSBuiltin('fs')).toBe(true);
    expect(isNodeJSBuiltin('path')).toBe(true);
  });
  it('returns true for sub-export of built-in module', () => {
    expect(isNodeJSBuiltin('fs/promises')).toBe(true);
    expect(isNodeJSBuiltin('stream/web')).toBe(true);
  });
  it('returns false for wrong node built-in with "node:" prefix', () => {
    expect(isNodeJSBuiltin('node:wrong-module')).toBe(false);
    expect(isNodeJSBuiltin('node:fs/wrong-sub-module')).toBe(false);
  });
  it('returns false for non-built-in module', () => {
    expect(isNodeJSBuiltin('some-test-module')).toBe(false);
    expect(isNodeJSBuiltin('some-test-module/sub-module')).toBe(false);
  });
  it('returns false for absolute path', () => {
    expect(isNodeJSBuiltin('/fs')).toBe(false);
  });
  it('returns false for relative path', () => {
    expect(isNodeJSBuiltin('./fs')).toBe(false);
    expect(isNodeJSBuiltin('../fs')).toBe(false);
  });
});

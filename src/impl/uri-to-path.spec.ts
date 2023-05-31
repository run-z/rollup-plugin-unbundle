import { describe, expect, it } from '@jest/globals';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { uriToPath } from './uri-to-path.js';

describe('uriToPath', () => {
  it('converts file URL to path', () => {
    expect(uriToPath(pathToFileURL(process.cwd()).href)).toBe(process.cwd());
  });
  it('converts arbitrary URL to path', () => {
    const cwd = pathToFileURL(process.cwd()).pathname.slice(1);

    expect(uriToPath(`package:${cwd}`)).toBe(fileURLToPath(`file:///${cwd}`));
  });
});

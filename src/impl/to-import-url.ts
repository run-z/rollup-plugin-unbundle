import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { getRequire } from './get-require.js';

export function toImportURL(spec: string, importer: string | undefined): string {
  if (isRelativeImport(spec)) {
    const url = importer
      ? new URL(spec, isFileURL(importer) ? importer : pathToFileURL(importer))
      : pathToFileURL(spec);

    return url.href;
  }

  if (isFileURL(spec)) {
    return spec;
  }

  const requireModule = importer ? createRequire(importer) : getRequire();

  return requireModule.resolve(spec);
}

function isRelativeImport(spec: string): boolean {
  return spec.startsWith('./') || spec.startsWith('../') || spec === '.' || spec === '..';
}

function isFileURL(spec: string): boolean {
  return spec.startsWith('file:///');
}

import { ImportResolver } from '../api/import-resolver.js';
import { isNodeJSBuiltin } from '../api/is-nodejs-builtin.js';
import { IsRollupExternalImport } from '../api/is-rollup-external-import.js';

export function updateExternal(isExternal: IsRollupExternalImport): IsRollupExternalImport {
  const resolver = new ImportResolver();

  return function isExternalOrBundled(source, importer, isResolved) {
    if (isNodeJSBuiltin(source)) {
      return true;
    }

    const packageInfo = resolver.resolveImport(source, importer);
    const resolution = isExternal(source, importer, isResolved);

    if (resolution != null || packageInfo == null) {
      return resolution;
    }

    // Try second time with package name.
    return isExternal(packageInfo.name, importer, false);
  };
}

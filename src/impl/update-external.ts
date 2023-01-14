import { isNodeJSBuiltin } from '../api/is-nodejs-builtin.js';
import { IsRollupExternalImport } from '../api/is-rollup-external-import.js';

export function updateExternal(isExternal: IsRollupExternalImport): IsRollupExternalImport {
  return function isExternalOrBundled(source, importer, isResolved) {
    if (isNodeJSBuiltin(source)) {
      return true;
    }

    return isExternal(source, importer, isResolved);
  };
}

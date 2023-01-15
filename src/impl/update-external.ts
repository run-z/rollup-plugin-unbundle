import { isNodeJSBuiltin } from '../api/is-nodejs-builtin.js';
import { IsRollupExternalImport } from '../api/is-rollup-external-import.js';
import { resolveRootPackage } from '../api/package-resolution.js';

export function updateExternal(isExternal: IsRollupExternalImport): IsRollupExternalImport {
  const root = resolveRootPackage();

  return function isExternalOrBundled(source, importer, isResolved) {
    if (isNodeJSBuiltin(source)) {
      return true;
    }

    const customRelation = isExternal(source, importer, isResolved);

    if (customRelation != null) {
      return customRelation;
    }

    const base = importer ? root.resolveImport(importer) : root;
    const resolution = base.resolveImport(source);
    const packageResolution = resolution.asPackageResolution();

    if (packageResolution && source !== packageResolution.name) {
      // Try second time with package name.
      const packageRelation = isExternal(packageResolution.name, importer, false);

      if (packageRelation != null) {
        return packageRelation;
      }
    }

    const relation = root.dependsOn(resolution);

    // Externalize runtime and peer dependencies.
    // Bundle only development and unexpected dependencies.
    return relation === true || relation === 'peer';
  };
}

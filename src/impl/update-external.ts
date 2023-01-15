import { isNodeJSBuiltin } from '../api/is-nodejs-builtin.js';
import { IsRollupExternalImport } from '../api/is-rollup-external-import.js';
import { resolveRootPackage } from '../api/package-resolution.js';

export function updateExternal(isExternal: IsRollupExternalImport): IsRollupExternalImport {
  const root = resolveRootPackage();

  return function isExternalOrBundled(source, importer, isResolved) {
    if (isNodeJSBuiltin(source)) {
      return true;
    }

    const initiallyExternal = isExternal(source, importer, isResolved);

    if (initiallyExternal != null) {
      return initiallyExternal;
    }

    const base = importer ? root.resolveImport(importer) : root;
    const resolution = base.resolveImport(source);
    const packageResolution = resolution.asPackageResolution();

    if (packageResolution && source !== packageResolution.name) {
      // Try second time with package name.
      const externalPackage = isExternal(packageResolution.name, importer, false);

      if (externalPackage != null) {
        return externalPackage;
      }
    }

    const dependencyKind = root.dependsOn(resolution);

    // Externalize runtime and peer dependencies.
    // Bundle only development and unexpected dependencies.
    return dependencyKind === true || dependencyKind === 'peer';
  };
}

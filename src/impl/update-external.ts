import { IsRollupExternalImport } from '../api/is-rollup-external-import.js';
import { resolveRootPackage } from '../api/package-resolution.js';
import { UnbundleOptions } from '../unbundle-options.js';

export function updateExternal(
  isExternal: IsRollupExternalImport,
  { resolutionRoot = resolveRootPackage() }: UnbundleOptions = {},
): IsRollupExternalImport {
  return function isExternalOrBundled(source, importer, isResolved): boolean | undefined {
    const initiallyExternal = isExternal(source, importer, isResolved);

    if (initiallyExternal != null) {
      return initiallyExternal;
    }

    const base = importer ? resolutionRoot.resolveImport(importer) : resolutionRoot;
    const resolution = base.resolveImport(source);
    const packageResolution = resolution.asPackageResolution();

    if (packageResolution && source !== packageResolution.name) {
      // Try second time with package name.
      const externalPackage = isExternal(packageResolution.name, importer, false);

      if (externalPackage != null) {
        return externalPackage;
      }
    }

    const dependency = resolutionRoot.resolveDependency(resolution);

    if (!dependency) {
      // Something imported, but no dependency declared.
      // Externalize it.
      return true;
    }

    const { kind } = dependency;

    if (kind === 'self' || kind === 'synthetic') {
      // No decision on self-dependencies and synthetic ones.
      // Rollup will decide which chunk to place them to.
      return;
    }

    // Externalize implied, runtime and peer dependencies.
    // Bundle development everything else (e.g. development dependencies).
    return kind === 'implied' || kind === 'runtime' || kind === 'peer';
  };
}

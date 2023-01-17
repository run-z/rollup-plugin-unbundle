import { NullValue } from 'rollup';
import { IsRollupExternalImport } from '../api/is-rollup-external-import.js';
import { resolveRootPackage } from '../api/package-resolution.js';
import { UnbundleOptions } from '../unbundle-options.js';
import { Unbundle$Request } from './unbundle.request.js';

export function updateExternal(
  isExternal: IsRollupExternalImport,
  options: UnbundleOptions = {},
): IsRollupExternalImport {
  const { resolutionRoot: root } = options;
  const resolutionRoot = root == null || typeof root === 'string' ? resolveRootPackage(root) : root;

  return function isExternalOrBundled(moduleId, importerId, isResolved): boolean | NullValue {
    const initiallyExternal = isExternal(moduleId, importerId, isResolved);

    if (initiallyExternal != null) {
      return initiallyExternal;
    }

    const request = new Unbundle$Request({ resolutionRoot, moduleId, isResolved, importerId });

    if (!isResolved) {
      const packageResolution = request.resolveModule().asPackageResolution();

      if (packageResolution && moduleId !== packageResolution.name) {
        // Try second time with package name.
        const externalPackage = isExternal(packageResolution.name, importerId, false);

        if (externalPackage != null) {
          return externalPackage;
        }
      }
    }

    return options.external ? options.external(request) : request.detectExternal();
  };
}

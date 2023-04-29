import { resolveRootPackage } from '@run-z/npk';
import { NullValue } from 'rollup';
import { IsRollupExternalImport } from '../is-rollup-external-import.js';
import { UnbundleOptions } from '../unbundle-options.js';
import { Unbundle$Request } from './unbundle.request.js';

export function updateExternal(
  isExternal: IsRollupExternalImport,
  options: UnbundleOptions = {},
): IsRollupExternalImport {
  const { resolutionRoot: root } = options;
  const resolutionRoot = root == null || typeof root === 'string' ? resolveRootPackage(root) : root;

  return function isExternalOrBundled(moduleId, importerId, isResolved): boolean | NullValue {
    const moduleIdExternal = isExternal(moduleId, importerId, isResolved);

    if (moduleIdExternal != null) {
      return moduleIdExternal;
    }

    const request = new Unbundle$Request({ resolutionRoot, moduleId, isResolved, importerId });

    if (!isResolved) {
      const packageResolution = request.resolveModule().asPackage();

      if (packageResolution && moduleId !== packageResolution.packageInfo.name) {
        // Try second time with package name.
        const packageIsExternal = isExternal(packageResolution.packageInfo.name, importerId, false);

        if (packageIsExternal != null) {
          return packageIsExternal;
        }
      }
    }

    return options.isExternal ? options.isExternal(request) : request.isExternal();
  };
}

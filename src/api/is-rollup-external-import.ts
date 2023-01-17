import { ExternalOption } from 'rollup';

/**
 * Rollup `external` option specified as function.
 *
 * This function checks whether the given module import is external or not.
 */
export type IsRollupExternalImport = Extract<ExternalOption, (...args: any[]) => any>;

/**
 * Convert arbitrary `external` Rollup option to function.
 *
 * @param external - `external` option value.
 *
 * @returns `external` option specified as function.
 */
export function IsRollupExternalImport(
  external: ExternalOption | undefined,
): IsRollupExternalImport {
  if (external == null) {
    // Unspecified.
    return notExternal;
  }
  if (typeof external === 'function') {
    // A function already.
    return external;
  }

  const byIds = externalByIds(external);
  const byPatterns = externalByPatterns(external);

  if (byIds) {
    if (byPatterns) {
      return function isExternalModuleId(moduleId, importerId, isResolved) {
        return (
          byIds(moduleId, importerId, isResolved) ?? byPatterns(moduleId, importerId, isResolved)
        );
      };
    }

    return byIds;
  }
  if (byPatterns) {
    return byPatterns;
  }

  // Empty array.
  return notExternal;
}

function notExternal(
  _moduleId: string,
  _importerId: string | undefined,
  _isResolved: boolean,
): void {
  // No externals specified explicitly.
}

function externalByIds(
  external: string | RegExp | readonly (string | RegExp)[],
): IsRollupExternalImport | undefined {
  const externalIdList: string[] =
    typeof external === 'string'
      ? [external]
      : Array.isArray(external)
      ? external.filter(item => typeof item === 'string')
      : [];

  if (externalIdList.length < 2) {
    if (!externalIdList.length) {
      return;
    }
    if (externalIdList.length === 1) {
      const [externalId] = externalIdList;

      return function hasExternalId(moduleId, _importerId, _isResolved) {
        return moduleId === externalId || undefined;
      };
    }
  }

  const externalIdSet = new Set(externalIdList);

  return function hasOneOfExternalIds(moduleId, _importerId, _isResolved) {
    return externalIdSet.has(moduleId) || undefined;
  };
}

function externalByPatterns(
  external: string | RegExp | readonly (string | RegExp)[],
): IsRollupExternalImport | undefined {
  const patterns: RegExp[] = Array.isArray(external)
    ? external.filter(item => typeof item !== 'string')
    : typeof external !== 'string'
    ? [external]
    : [];

  if (patterns.length < 2) {
    if (!patterns.length) {
      return;
    }
    if (patterns.length === 1) {
      const [pattern] = patterns;

      return function matchesExternalIdPattern(moduleId, _importerId, _isResolved) {
        return pattern.test(moduleId) || undefined;
      };
    }
  }

  return function matchesOneOfExternalIdPatterns(moduleId, _importerId, _isResolved) {
    return patterns.some(pattern => pattern.test(moduleId)) || undefined;
  };
}

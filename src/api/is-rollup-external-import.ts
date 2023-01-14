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
      return function isExternalModuleId(source, importer, isResolved) {
        return byIds(source, importer, isResolved) ?? byPatterns(source, importer, isResolved);
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

function notExternal(_source: string, _importer: string | undefined, _isResolved: boolean): void {
  // No externals specified explicitly.
}

function externalByIds(
  external: string | RegExp | readonly (string | RegExp)[],
): IsRollupExternalImport | undefined {
  const ids: string[] =
    typeof external === 'string'
      ? [external]
      : Array.isArray(external)
      ? external.filter(item => typeof item === 'string')
      : [];

  if (ids.length < 2) {
    if (!ids.length) {
      return;
    }
    if (ids.length === 1) {
      const [id] = ids;

      return function hasExternalId(source, _importer, _isResolved) {
        return source === id || undefined;
      };
    }
  }

  const setOfIds = new Set(ids);

  return function hasOneOfExternalIds(source, _importer, _isResolved) {
    return setOfIds.has(source) || undefined;
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

      return function matchesExternalIdPattern(source, _importer, _isResolved) {
        return pattern.test(source) || undefined;
      };
    }
  }

  return function matchesOneOfExternalIdPatterns(source, _importer, _isResolved) {
    return patterns.some(pattern => pattern.test(source)) || undefined;
  };
}

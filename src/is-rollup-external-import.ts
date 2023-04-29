import { type ExternalOption } from 'rollup';

/**
 * Rollup `external` option specified as function.
 *
 * This function checks whether the given module import is external or not.
 */
export type IsRollupExternalImport = Extract<ExternalOption, (...args: any[]) => any>;

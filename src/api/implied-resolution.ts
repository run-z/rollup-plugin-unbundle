import { ImportResolution } from './import-resolution.js';

/**
 * Implied module resolution represents something that is just present, e.g. in runtime environment.
 *
 * This can be e.g. a Node.js built-in.
 */
export interface ImpliedResolution extends ImportResolution {
  asPackageResolution(): undefined;
  asImpliedResolution(): this;
}

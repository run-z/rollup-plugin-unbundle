/**
 * Dependency resolution indicates how an imported module {@link ImportResolution#dependencyOn depends} on another one.
 */
export interface DependencyResolution {
  /**
   * Dependency kind.
   *
   * One of:
   *
   * - `self` for module dependency on itself or some of its sub-modules.
   * - `implied` for dependency on {@link ImpliedResolution implied module}, such as Node.js built-in.
   * - `runtime` for runtime (production) dependency.
   * - `dev` for development dependency.
   * - `peer` for peer dependency.
   */
  readonly kind: 'self' | 'implied' | 'runtime' | 'dev' | 'peer';
}

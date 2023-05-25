import type { DependencyResolution, ImportResolution } from '@run-z/npk';
import type { UnbundleRequest } from '../unbundle-request.js';

export class Unbundle$Request implements UnbundleRequest {

  readonly #resolutionRoot: ImportResolution;
  readonly #moduleId: string;
  readonly #prevRequest: Unbundle$Request | undefined;
  readonly #importerId: string | undefined;

  #importerResolution?: ImportResolution;
  #moduleResolution?: ImportResolution;
  #dependencyResolution?: DependencyResolution | null;

  constructor({
    resolutionRoot,
    moduleId,
    importerId,
    prevRequest,
  }: {
    readonly resolutionRoot: ImportResolution;
    readonly moduleId: string;
    readonly importerId?: string | undefined;
    readonly prevRequest?: Unbundle$Request | undefined;
  }) {
    this.#resolutionRoot = resolutionRoot;
    this.#moduleId = moduleId;
    this.#importerId = importerId;
    this.#prevRequest = prevRequest;
  }

  get resolutionRoot(): ImportResolution {
    return this.#resolutionRoot;
  }

  get moduleId(): string {
    return this.#moduleId;
  }

  get isResolved(): boolean {
    return !!this.rewrittenRequest;
  }

  get importerId(): string | undefined {
    return this.#importerId;
  }

  get rewrittenRequest(): Unbundle$Request | undefined {
    return this.#prevRequest;
  }

  resolveImporter(): ImportResolution {
    return (this.#importerResolution ??= this.#resolveImporter());
  }

  #resolveImporter(): ImportResolution {
    const { resolutionRoot, importerId, rewrittenRequest: prevRequest } = this;

    if (prevRequest) {
      return prevRequest.resolveImporter();
    }

    return importerId != null ? resolutionRoot.resolveImport(importerId) : resolutionRoot;
  }

  resolveModule(): ImportResolution {
    return (this.#moduleResolution ??= this.resolveImporter().resolveImport(this.moduleId));
  }

  resolveDependency(): DependencyResolution | null {
    if (this.#dependencyResolution === undefined) {
      this.#dependencyResolution = this.resolutionRoot.resolveDependency(this.resolveModule());
    }

    return this.#dependencyResolution;
  }

  isExternal(): boolean | undefined {
    const dependency = this.resolveDependency();

    if (!dependency) {
      // Something is imported, but no dependency declared.
      // Bundle it, unless this is an URI.
      return this.resolveModule().importSpec.kind === 'uri';
    }

    const { kind } = dependency;

    switch (kind) {
      case 'self':
      case 'synthetic':
        // No decision on self-dependencies and synthetic ones.
        // Rollup will decide which chunk to place them to.
        return;
      case 'implied':
      case 'runtime':
      case 'peer':
        // Externalize implied, runtime and peer dependencies.
        return true;
      case 'dev':
        // Bundle development dependencies.
        return false;
    }
  }

  hasSideEffects(): boolean | undefined {
    const dependency = this.resolveDependency();

    if (!dependency) {
      // Can not decide.
      return;
    }

    const { kind } = dependency;

    switch (kind) {
      case 'synthetic':
      case 'self':
        // No decision on self-dependencies and synthetic ones.
        return;
      case 'implied':
        // Node.js dependencies considered free of side effects.
        return false;
      case 'runtime':
      case 'peer':
      case 'dev':
        return this.#packageHasSideEffects();
    }
  }

  #packageHasSideEffects(): boolean | undefined {
    const resolved = this.resolveModule();
    const { host } = resolved;

    // Detect based on `sideEffect` property in `package.json`.
    const {
      packageInfo: {
        packageJson: { sideEffects },
      },
    } = host!;

    if (sideEffects == null) {
      // `sideEffects` unspecified.
      return;
    }
    if (typeof sideEffects === 'boolean') {
      // Explicit `sideEffects` flag.
      return sideEffects;
    }

    // TODO: Handle `sideEffects` pattern.
    // Unknown `sideEffects` format.
    return;
  }

  rewrite({
    moduleId,
    importerId,
  }: {
    readonly moduleId: string;
    readonly importerId: string | undefined;
  }): Unbundle$Request {
    return new Unbundle$Request({
      resolutionRoot: this.resolutionRoot,
      moduleId,
      importerId,
      // Another importer means another resolution request chain.
      prevRequest: this.importerId === importerId ? this : undefined,
    });
  }

}

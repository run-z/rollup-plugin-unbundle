import type { ImportDependency, ImportResolution, SubPackageResolution } from '@run-z/npk';
import type { UnbundleRequest } from '../unbundle-request.js';

export class Unbundle$Request implements UnbundleRequest {

  readonly #resolutionRoot: ImportResolution;
  readonly #moduleId: string;
  readonly #prevRequest: Unbundle$Request | undefined;
  readonly #importerId: string | undefined;

  #importerResolution?: Promise<ImportResolution>;
  #moduleResolution?: Promise<ImportResolution>;
  #dependency?: Promise<ImportDependency | null>;

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

  resolveImporter(): Promise<ImportResolution> {
    return (this.#importerResolution ??= this.#resolveImporter());
  }

  async #resolveImporter(): Promise<ImportResolution> {
    const { resolutionRoot, importerId, rewrittenRequest: prevRequest } = this;

    if (prevRequest) {
      return await prevRequest.resolveImporter();
    }
    if (importerId == null) {
      return resolutionRoot;
    }

    return await resolutionRoot.resolveImport(importerId);
  }

  resolveModule(): Promise<ImportResolution> {
    return (this.#moduleResolution ??= this.#resolveModule());
  }

  async #resolveModule(): Promise<ImportResolution> {
    const importer = await this.resolveImporter();

    return importer.resolveImport(this.moduleId);
  }

  resolveDependency(): Promise<ImportDependency | null> {
    return (this.#dependency ??= this.#resolveDependency());
  }

  async #resolveDependency(): Promise<ImportDependency | null> {
    const resolved = await this.resolveModule();

    return this.resolutionRoot.resolveDependency(resolved);
  }

  async isExternal(): Promise<boolean | undefined> {
    const dependency = await this.resolveDependency();

    if (!dependency) {
      // Something is imported, but no dependency declared.
      // Bundle it, unless this is an URI.
      const resolved = await this.resolveModule();

      return resolved.importSpec.kind === 'uri';
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

  async hasSideEffects(): Promise<boolean | undefined> {
    const dependency = await this.resolveDependency();

    if (!dependency) {
      // Can not decide.
      return;
    }

    const { kind, on } = dependency;

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
        // Detect based on `sideEffect` property in `package.json`.
        return this.#packageHasSideEffects(on);
    }
  }

  #packageHasSideEffects({
    host: {
      packageInfo: {
        packageJson: { sideEffects },
      },
    },
  }: SubPackageResolution): boolean | undefined {
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

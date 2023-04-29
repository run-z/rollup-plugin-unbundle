import { ImportResolution } from '@run-z/npk';
import { NullValue } from 'rollup';
import { UnbundleRequest } from '../unbundle-request.js';

export class Unbundle$Request implements UnbundleRequest {

  readonly #resolutionRoot: ImportResolution;
  readonly #moduleId: string;
  readonly #isResolved: boolean;
  readonly #importerId: string | undefined;

  #resolutionBase?: ImportResolution;
  #moduleResolution?: ImportResolution;

  constructor({
    resolutionRoot,
    moduleId,
    isResolved,
    importerId,
  }: {
    readonly resolutionRoot: ImportResolution;
    readonly moduleId: string;
    readonly isResolved: boolean;
    readonly importerId: string | undefined;
  }) {
    this.#resolutionRoot = resolutionRoot;
    this.#moduleId = moduleId;
    this.#isResolved = isResolved;
    this.#importerId = importerId;
  }

  get resolutionRoot(): ImportResolution {
    return this.#resolutionRoot;
  }

  get moduleId(): string {
    return this.#moduleId;
  }

  get isResolved(): boolean {
    return this.#isResolved;
  }

  get importerId(): string | undefined {
    return this.#importerId;
  }

  resolveImporter(): ImportResolution {
    const { resolutionRoot, importerId } = this;

    return (this.#resolutionBase ??=
      importerId != null ? resolutionRoot.resolveImport(importerId) : resolutionRoot);
  }

  resolveModule(): ImportResolution {
    return (this.#moduleResolution ??= this.resolveImporter().resolveImport(this.moduleId));
  }

  isExternal(): boolean | NullValue {
    const dependency = this.resolutionRoot.resolveDependency(this.resolveModule());

    if (!dependency) {
      // Something is imported, but no dependency declared.
      // Bundle it.
      return false;
    }

    const { kind } = dependency;

    if (kind === 'self' || kind === 'synthetic') {
      // No decision on self-dependencies and synthetic ones.
      // Rollup will decide which chunk to place them to.
      return;
    }

    // Externalize implied, runtime and peer dependencies.
    // Bundle everything else (e.g. development dependencies).
    return kind === 'implied' || kind === 'runtime' || kind === 'peer';
  }

}

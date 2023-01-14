export class PackageName {

  static of(name: string | PackageName): PackageName {
    return typeof name === 'string' ? new PackageName(name) : name;
  }

  readonly #name: string;
  #parts?: PackageName$Parts;

  constructor(name: string) {
    this.#name = name;
  }

  /**
   * Full package name.
   */
  get name(): string {
    return this.#name;
  }

  get scope(): string | undefined {
    return this.#getParts().scope;
  }

  get localName(): string {
    return this.#getParts().local;
  }

  get subpath(): string | undefined {
    return this.#getParts().subpath;
  }

  #getParts(): PackageName$Parts {
    if (!this.#parts) {
      let scope: string | undefined;
      let local: string;
      let subpath: string | undefined;

      let name = this.name;

      if (name.startsWith('@')) {
        const scopeEnd = name.indexOf('/', 1);

        if (scopeEnd > 0) {
          scope = name.slice(0, scopeEnd);
          name = name.slice(scopeEnd + 1);
        }
      }

      const nameEnd = name.indexOf('/');

      if (nameEnd < 0) {
        local = name;
      } else {
        local = name.slice(0, nameEnd);
        subpath = name.slice(nameEnd);
      }

      this.#parts = {
        scope,
        local,
        subpath,
      };
    }

    return this.#parts;
  }

}

interface PackageName$Parts {
  readonly scope: string | undefined;
  readonly local: string;
  readonly subpath: string | undefined;
}

/**
 * Recognized import statement specifier.
 *
 * Several kinds of specifiers recognized by {@link parseImportSpecifier} function.
 */
export type ImportSpecifier =
  | ImportSpecifier.Package
  | ImportSpecifier.URI
  | ImportSpecifier.Path
  | ImportSpecifier.Subpath
  | ImportSpecifier.Virtual
  | ImportSpecifier.Unknown;

export namespace ImportSpecifier {
  /**
   * Package import specifier.
   *
   * May be scoped or unscoped package, and may include import sub-path.
   */
  export interface Package {
    readonly kind: 'package';

    /**
     * Original import specifier.
     */
    readonly spec: string;

    /**
     * Imported package name, excluding {@link subpath}.
     */
    readonly name: string;

    /**
     * Resolved package scope. I.e. the part of the {@link name} with `@` prefix, if any.
     */
    readonly scope: `@${string}` | undefined;

    /**
     * Local name within imported package {@link scope}.
     *
     * Part of the {@link name} after the the slash (`/`) for scoped package, or the {@link name} itself for
     * unscoped one.
     */
    readonly local: string;

    /**
     * Imported subpath following package {@link name}, if any.
     *
     * Includes leading slash.
     */
    readonly subpath: `/${string}` | undefined;
  }

  /**
   * Absolute URI import specifier.
   */
  export interface URI {
    readonly kind: 'uri';

    /**
     * Original import URI.
     */
    readonly spec: string;

    /**
     * URI scheme.
     */
    readonly scheme: string;

    /**
     * URI path.
     */
    readonly path: string;
  }

  /**
   * Absolute or relative import path specifier.
   */
  export type Path = Absolute | Relative;

  /**
   * Absolute import path specifier.
   */
  export interface Absolute {
    readonly kind: 'path';

    /**
     * Never relative.
     */
    readonly isRelative: false;

    /**
     * Original import path. Always starts with the slash (`/`).
     */
    readonly spec: `/${string}`;
  }

  /**
   * Relative import path specifier.
   */
  export interface Relative {
    readonly kind: 'path';

    /**
     * Always relative.
     */
    readonly isRelative: true;

    /**
     * Original import path. Always starts with the dot (`.`).
     */
    readonly spec: '.' | '..' | `./${string}` | `../${string}`;
  }

  /**
   * [Subpath import](https://nodejs.org/dist/latest/docs/api/packages.html#subpath-imports) specifier.
   */
  export interface Subpath {
    readonly kind: 'subpath';

    /**
     * Original import specifier. Always starts with `#`.
     */
    readonly spec: `#${string}`;
  }

  /**
   * Virtual module import specifier.
   *
   * The module ID starting with _zero char_ (`U+0000`). Such IDs generated e.g. by Rollup plugins.
   */
  export interface Virtual {
    readonly kind: 'virtual';

    /**
     * Original import specifier. Always starts with zero char (`U+0000`).
     */
    readonly spec: `\0${string}`;
  }

  /**
   * Unknown import specifier not recognized as any of the other kinds of imports.
   */
  export interface Unknown {
    readonly kind: 'unknown';

    /**
     * Original import specifier.
     */
    readonly spec: string;
  }
}

/**
 * Recognizes import specifier and tries to parse it accordingly.
 *
 * @param spec - Import specifier string to recognize.
 *
 * @returns Recognized import specifier.
 */
export function parseImportSpecifier(spec: string): ImportSpecifier {
  return IMPORT_SPEC_PARSERS[spec[0]]?.(spec) ?? parseImportURI(spec) ?? parsePackageImport(spec);
}

const IMPORT_SPEC_PARSERS: {
  readonly [prefix: string]: ((spec: string) => ImportSpecifier) | undefined;
} = {
  '\0': spec => ({
    kind: 'virtual',
    spec: spec as `\0${string}`,
  }),
  '#': spec => ({
    kind: 'subpath',
    spec: spec as `#${string}`,
  }),
  '.': spec => isRelativeImport(spec)
      ? {
          kind: 'path',
          isRelative: true,
          spec,
        }
      : {
          // Unscoped package name can not start with dot.
          kind: 'unknown',
          spec,
        },
  '/': spec => ({
    kind: 'path',
    isRelative: false,
    spec: spec as `/${string}`,
  }),
  '@': parseScopedPackageImport,
  _: spec => ({
    // Unscoped package name can not start with underscore
    kind: 'unknown',
    spec,
  }),
};

function isRelativeImport(spec: string): spec is '.' | '..' | `./${string}` | `../${string}` {
  return spec.startsWith('./') || spec.startsWith('../') || spec === '.' || spec === '..';
}

const URI_PATTERN = /^(?:([^:/?#]+):)(?:\/\/(?:[^/?#]*))?([^?#]*)(?:\?(?:[^#]*))?(?:#(?:.*))?/;

export function parseImportURI(spec: string): ImportSpecifier.URI | undefined {
  const match = URI_PATTERN.exec(spec);

  if (!match) {
    return;
  }

  return {
    kind: 'uri',
    spec,
    scheme: match[1],
    path: match[2],
  };
}

function parseScopedPackageImport(spec: string): ImportSpecifier {
  const scopeEnd = spec.indexOf('/', 1);

  if (scopeEnd > 0) {
    return parsePackageImport(spec.slice(scopeEnd + 1), spec.slice(0, scopeEnd) as `@${string}`);
  }

  // Unscoped package name can not start with `@`.
  return {
    kind: 'unknown',
    spec,
  };
}

function parsePackageImport(spec: string, scope?: `@${string}`): ImportSpecifier {
  let local: string;
  let subpath: `/${string}` | undefined;

  const nameEnd = spec.indexOf('/');

  if (nameEnd < 0) {
    local = spec;
  } else {
    local = spec.slice(0, nameEnd);
    subpath = spec.slice(nameEnd) as `/${string}`;
  }

  return {
    kind: 'package',
    spec: scope ? `${scope}/${spec}` : spec,
    name: scope ? `${scope}/${local}` : local,
    scope,
    local,
    subpath,
  };
}

import { builtinModules } from 'node:module';

/**
 * Import statement specifier.
 *
 * Several kinds of specifiers recognized by {@link recognizeImport} function.
 */
export type Import =
  | Import.Package
  | Import.Env
  | Import.URI
  | Import.Path
  | Import.Subpath
  | Import.Virtual
  | Import.Unknown;

export namespace Import {
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
   * Execution environment import specifier.
   */
  export interface Env {
    readonly kind: 'env';

    /**
     * Original import specifier.
     */
    readonly spec: string;

    /**
     * The name of the environment to import from.
     *
     * Can be anything, e.g. `node` or `browser`.
     *
     * Only `node` built-in imports {@link recognizeImport recognized} currently.
     */
    readonly env: string;
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
 * Recognizes import specifier.
 *
 * @typeParam TImport - Type of recognized import specifier.
 * @param spec - Already recognized import specifier.
 *
 * @returns The unchanged specifier.
 */
export function recognizeImport<TImport extends Import>(spec: TImport): TImport;

/**
 * Recognizes import specifier and parses it accordingly.
 *
 * @param spec - Import specifier to recognize. May be recognized already.
 *
 * @returns Recognized import specifier.
 */
export function recognizeImport(spec: Import | string): Import;

export function recognizeImport(spec: Import | string): Import {
  if (typeof spec !== 'string') {
    return spec;
  }

  return (
    IMPORT_SPEC_PARSERS[spec[0]]?.(spec)
    ?? recognizeNodeImport(spec)
    ?? recognizeImportURI(spec)
    ?? recognizePackageImport(spec)
  );
}

const IMPORT_SPEC_PARSERS: {
  readonly [prefix: string]: ((spec: string) => Import) | undefined;
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
  '@': recognizeScopedPackageImport,
  _: spec => ({
    // Unscoped package name can not start with underscore
    kind: 'unknown',
    spec,
  }),
};

function recognizeNodeImport(spec: string): Import.Env | undefined {
  if (getNodeJSBuiltins().has(spec.startsWith('node:') ? spec.slice(5) : spec)) {
    return {
      kind: 'env',
      spec,
      env: 'node',
    };
  }

  return;
}

function getNodeJSBuiltins(): ReadonlySet<string> {
  return (nodeJSBuiltins ??= new Set(builtinModules));
}

let nodeJSBuiltins: Set<string> | undefined;

function isRelativeImport(spec: string): spec is '.' | '..' | `./${string}` | `../${string}` {
  return spec.startsWith('./') || spec.startsWith('../') || spec === '.' || spec === '..';
}

const URI_PATTERN = /^(?:([^:/?#]+):)(?:\/\/(?:[^/?#]*))?([^?#]*)(?:\?(?:[^#]*))?(?:#(?:.*))?/;

export function recognizeImportURI(spec: string): Import.URI | undefined {
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

function recognizeScopedPackageImport(spec: string): Import {
  const scopeEnd = spec.indexOf('/', 1);

  if (scopeEnd > 0) {
    return recognizePackageImport(spec, spec.slice(0, scopeEnd) as `@${string}`, scopeEnd + 1);
  }

  // Unscoped package name can not start with `@`.
  return {
    kind: 'unknown',
    spec,
  };
}

function recognizePackageImport(spec: string, scope?: `@${string}`, localOffset = 0): Import {
  let local: string;
  let subpath: `/${string}` | undefined;

  const nameEnd = spec.indexOf('/', localOffset);
  let name: string;

  if (nameEnd < 0) {
    local = spec.slice(localOffset);
    name = spec;
  } else {
    local = spec.slice(localOffset, nameEnd);
    name = spec.slice(0, nameEnd);
    subpath = spec.slice(nameEnd) as `/${string}`;
  }

  return {
    kind: 'package',
    spec,
    name,
    scope,
    local,
    subpath,
  };
}

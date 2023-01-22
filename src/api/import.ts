import { builtinModules } from 'node:module';
import win32 from 'node:path/win32';
import { pathToFileURL } from 'node:url';
import normalizePath from 'normalize-path';

/**
 * Import statement specifier.
 *
 * Several kinds of specifiers recognized by {@link recognizeImport} function.
 */
export type Import =
  | Import.Package
  | Import.Implied
  | Import.URI
  | Import.Path
  | Import.Subpath
  | Import.Synthetic
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
   * Implied module import specifier, such as execution environment.
   */
  export interface Implied {
    readonly kind: 'implied';

    /**
     * Original import specifier.
     */
    readonly spec: string;

    /**
     * The source of implied dependency.
     *
     * Can be anything, e.g. `node` or `browser`.
     *
     * Only `node` built-in imports {@link recognizeImport recognized} currently.
     */
    readonly from: string;
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
     * Original, system-dependent import path.
     */
    readonly spec: string;

    /**
     * Never relative.
     */
    readonly isRelative: false;

    /**
     * Absolute import URI.
     */
    readonly uri: `file:///${string}`;
  }

  /**
   * Relative import path specifier.
   */
  export interface Relative {
    readonly kind: 'path';

    /**
     * Original, system-dependent import path.
     */
    readonly spec: string;

    /**
     * Always relative.
     */
    readonly isRelative: true;

    /**
     * Relative import URI.
     */
    readonly uri: '.' | '..' | `./${string}` | `../${string}`;
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
   * Synthetic module import specifier.
   *
   * The module ID starting with _zero char_ (`U+0000`). Such IDs generated e.g. by Rollup plugins.
   */
  export interface Synthetic {
    readonly kind: 'synthetic';

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
    ?? recognizeAbsoluteWindowsPathImport(spec)
    ?? recognizeImportURI(spec)
    ?? recognizePackageImport(spec)
  );
}

const IMPORT_SPEC_PARSERS: {
  readonly [prefix: string]: ((spec: string) => Import | undefined) | undefined;
} = {
  '\0': spec => ({
    kind: 'synthetic',
    spec: spec as `\0${string}`,
  }),
  '#': spec => ({
    kind: 'subpath',
    spec: spec as `#${string}`,
  }),
  '.': spec => recognizeRelativePathImport(spec) ?? {
      // Unscoped package name can not start with dot.
      kind: 'unknown',
      spec,
    },
  '/': recognizeAbsoluteUnixPathImport,
  '\\': recognizeAbsoluteWindowsPathImport,
  '@': recognizeScopedPackageImport,
  _: spec => ({
    // Unscoped package name can not start with underscore
    kind: 'unknown',
    spec,
  }),
};

function recognizeNodeImport(spec: string): Import.Implied | undefined {
  if (getNodeJSBuiltins().has(spec.startsWith('node:') ? spec.slice(5) : spec)) {
    return {
      kind: 'implied',
      spec,
      from: 'node',
    };
  }

  return;
}

function getNodeJSBuiltins(): ReadonlySet<string> {
  return (nodeJSBuiltins ??= new Set(builtinModules));
}

let nodeJSBuiltins: Set<string> | undefined;

function recognizeRelativePathImport(spec: string): Import.Relative | undefined {
  if (spec === '.' || spec === '..') {
    return {
      kind: 'path',
      spec,
      isRelative: true,
      uri: spec,
    };
  }

  if (spec.startsWith('./') || spec.startsWith('../')) {
    // Unix path.
    return {
      kind: 'path',
      spec,
      isRelative: true,
      uri: encodeURI(spec) as `./${string}` | `../${string}`,
    };
  }

  if (spec.startsWith('.\\') || spec.startsWith('..\\')) {
    // Windows path.
    return {
      kind: 'path',
      spec,
      isRelative: true,
      uri: encodeURI(spec.replaceAll('\\', '/')) as `./${string}` | `../${string}`,
    };
  }

  return;
}

function recognizeAbsoluteUnixPathImport(spec: string): Import.Absolute {
  return {
    kind: 'path',
    spec,
    isRelative: false,
    uri: pathToFileURL(spec).href as `file:///${string}`,
  };
}

function recognizeAbsoluteWindowsPathImport(spec: string): Import.Absolute | undefined {
  if (!win32.isAbsolute(spec)) {
    return;
  }

  const unixPath = normalizePath(spec);

  return {
    kind: 'path',
    spec,
    isRelative: false,
    uri: pathToFileURL(unixPath.startsWith('/') ? unixPath : '/' + unixPath)
      .href as `file:///${string}`,
  };
}

const URI_PATTERN = /^(?:([^:/?#]+):)(?:\/\/(?:[^/?#]*))?([^?#]*)(?:\?(?:[^#]*))?(?:#(?:.*))?/;

function recognizeImportURI(spec: string): Import.URI | undefined {
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

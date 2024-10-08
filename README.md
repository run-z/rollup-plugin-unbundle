# Unbundle (Some) Dependencies

[![NPM][npm-image]][npm-url]
[![Build Status][build-status-img]][build-status-link]
[![Build@Windows][build-windows-img]][build-windows-link]
[![Build@MacOS][build-macos-img]][build-macos-link]
[![Code Quality][quality-img]][quality-link]
[![Coverage][coverage-img]][coverage-link]
[![GitHub Project][github-image]][github-url]
[![API Documentation][api-docs-image]][api documentation]

[Rollup] plugin helping to decide what modules to externalize, and what to bundle. It's not always easy, especially
when plugins like [`@rollup/plugin-node-resolve`] replace module names with file paths.

By default, the plugin does the following:

- [Resolves packages].

- Externalizes Node.js built-ins.

- Externalizes packages listed as [package dependencies].

  As they _will_ be installed along the bundled package anyway.

- Externalizes packages listed as [package peerDependencies].

  As they _expected to be added_ to the package that depends on bundled one.

- Maps module IDs back to their package names if necessary.

- Detects side effects of modules according to [sideEffects] property in their `package.json` files.

- Respects [external] option and other plug-ins resolutions.

[npm-image]: https://img.shields.io/npm/v/rollup-plugin-unbundle.svg?logo=npm
[npm-url]: https://www.npmjs.com/package/rollup-plugin-unbundle
[build-status-img]: https://github.com/run-z/rollup-plugin-unbundle/workflows/Build/badge.svg
[build-windows-img]: https://github.com/run-z/rollup-plugin-unbundle/workflows/Build@Windows/badge.svg
[build-macos-img]: https://github.com/run-z/rollup-plugin-unbundle/workflows/Build@MacOS/badge.svg
[build-status-link]: https://github.com/run-z/rollup-plugin-unbundle/actions?query=workflow:Build
[build-windows-link]: https://github.com/run-z/rollup-plugin-unbundle/actions?query=workflow:Build@Windows
[build-macos-link]: https://github.com/run-z/rollup-plugin-unbundle/actions?query=workflow:Build@MacOS
[quality-img]: https://app.codacy.com/project/badge/Grade/2de1f7d57474445084344aa20b00ebc2
[quality-link]: https://app.codacy.com/gh/run-z/rollup-plugin-unbundle/dashboard?utm_source=gh&utm_medium=referral&utm_content=run-z/rollup-plugin-unbundle&utm_campaign=Badge_Grade
[coverage-img]: https://app.codacy.com/project/badge/Coverage/2de1f7d57474445084344aa20b00ebc2
[coverage-link]: https://app.codacy.com/gh/run-z/rollup-plugin-unbundle/dashboard?utm_source=gh&utm_medium=referral&utm_content=run-z/rollup-plugin-unbundle&utm_campaign=Badge_Coverage
[github-image]: https://img.shields.io/static/v1?logo=github&label=GitHub&message=project&color=informational
[github-url]: https://github.com/run-z/rollup-plugin-unbundle
[api-docs-image]: https://img.shields.io/static/v1?logo=typescript&label=API&message=docs&color=informational
[API documentation]: https://run-z.github.io/rollup-plugin-unbundle
[Rollup]: https://rollupjs.org/
[`@rollup/plugin-node-resolve`]: https://www.npmjs.com/package/@rollup/plugin-node-resolve
[`@rollup/plugin-commonjs`]: https://www.npmjs.com/package/@rollup/plugin-commonjs
[external]: https://rollupjs.org/guide/en/#external
[package dependencies]: https://docs.npmjs.com/cli/v8/configuring-npm/package-json#dependencies
[package peerDependencies]: https://docs.npmjs.com/cli/v8/configuring-npm/package-json#peerdependencies
[sideEffects]: https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free

## Example Configuration

Add the following `rollup.config.js`:

```javascript
import unbundle from 'rollup-plugin-unbundle';

export default {
  input: './src/index.js',
  plugins: [
    unbundle({
      /* Unbundle options */
    }),
  ],
  output: {
    format: 'esm',
    sourcemap: true,
    file: 'dist/index.js',
  },
};
```

## Options

The plugin utilizes import resolution API to make decisions. Some of its behavior can be customized with appropriate
options.

> See [Node.js package kit] documentation for the details.

[Node.js package kit]: https://www.npmjs.com/package/@run-z/rollup-plugin-unbundle

### `resolutionRoot`

Resolution root of the imports.

One of:

- path to the root package directory,
- an `ImportResolution` instance (may cause issues with watch mode), or
- a function returning `ImportResolution` instance or a promise-like instance resolving to one.

By default, new resolution root will be created for the package in current working directory.

### `isExternal`

This method decides whether to bundle the module or not. May be asynchronous.

Unlike [external] Rollup option, this method can be asynchronous. It accepts `UnbundleRequest` class instance that
helps in making decisions.

`UnbundleRequest` has the following API:

- `resolutionRoot` - Imports resolution root.

- `moduleId` - The identifier of the module in question.

- `isResolved` - Whether the module has been resolved by e.g. plugins.

- `importerId` - The identifier of the module doing the import, if known.

- `resolveImporter()` - Asynchronously resolves the module doing the import.

  Either the importer module, or resolution root when the former is missing.

- `resolveModule()` - Asynchronously resolves the module in question.

- `isExternal()` - Asynchronously checks whether the module should be bundled or not according to default plugin logic.

  This can be used to retain the default plugin functionality for some modules.

## Package Resolution

[Resolves packages]: #package-resolution

This plugin resolves packages using standard Node.js [module resolution machinery]. This means the imported modules
might be in CommonJS format. E.g. when the importer package doesn't have a `"type": "module"` in its `package.json`,
or when the imported package is in `CommonJS` format. This is not a problem if the imported package is externalized.
Otherwise, a CommonJS support has to be enabled, e.g. with [`@rollup/plugin-commonjs`] plug-in:

```javascript
import commonjs from '@rollup/plugin-commonjs';
import unbundle from 'rollup-plugin-unbundle';

export default {
  input: './src/index.js',
  plugins: [unbundle(), commonjs()],
  output: {
    format: 'esm',
    sourcemap: true,
    file: 'dist/index.js',
  },
};
```

Alternatively, a [`@rollup/plugin-node-resolve`] plug-in can be used with config like this:

```javascript
import nodeResolve from '@rollup/plugin-node-resolve';
import unbundle from 'rollup-plugin-unbundle';

export default {
  input: './src/index.js',
  plugins: [unbundle(), nodeResolve()],
  output: {
    format: 'esm',
    sourcemap: true,
    file: 'dist/index.js',
  },
};
```

Place node-resolve plug-in _after_ unbundle one to prefer node-resolve resolutions.

Even with node-resolve enabled, the unbundle plug-in maps resolved files back to their package names and thus decides
whether to externalize them.

[module resolution machinery]: https://nodejs.org/dist/latest/docs/api/modules.html#requireresolverequest-options

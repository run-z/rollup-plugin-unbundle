# Unbundle (Some) Dependencies

[![NPM][npm-image]][npm-url]
[![Build Status][build-status-img]][build-status-link]
[![Code Quality][quality-img]][quality-link]
[![GitHub Project][github-image]][github-url]
[![API Documentation][api-docs-image]][api documentation]

**The issue.**: Rollup supports [external] option to externalize some of the dependencies and bundle the others.
However, it's not trivial to implement sometimes. E.g. once dependency resolved, its ID becomes an absolute path rather
package name. It is not so simple to decide whether the module should be external in this case.

**The solution.** This plugin does the following:

- Externalizes Node.js built-ins unconditionally.

- Externalizes packages listed as [package dependencies].

  As they _will_ be installed along the bundled package anyway.

- Externalizes packages listed as [package peerDependencies].

  As they _expected to be added_ to the package that depends on bundled one.

- Resolves module IDs back to their package names if necessary.

- Respects [external] option from Rollup configuration.

- Handles transitive dependencies.

  Once a transitive dependency (not listed in `package.json` or [external] option) imported, it is either externalized
  or bundled the same way as its importer.

[npm-image]: https://img.shields.io/npm/v/rollup-plugin-unbundle.svg?logo=npm
[npm-url]: https://www.npmjs.com/package/rollup-plugin-unbundle
[build-status-img]: https://github.com/run-z/rollup-plugin-unbundle/workflows/Build/badge.svg
[build-status-link]: https://github.com/run-z/rollup-plugin-unbundle/actions?query=workflow:Build
[quality-img]: https://app.codacy.com/project/badge/Grade/2de1f7d57474445084344aa20b00ebc2
[quality-link]: https://www.codacy.com/gh/run-z/rollup-plugin-unbundle/dashboard?utm_source=github.com&utm_medium=referral&utm_content=run-z/rollup-plugin-unbundle&utm_campaign=Badge_Grade
[github-image]: https://img.shields.io/static/v1?logo=github&label=GitHub&message=project&color=informational
[github-url]: https://github.com/run-z/rollup-plugin-unbundle
[api-docs-image]: https://img.shields.io/static/v1?logo=typescript&label=API&message=docs&color=informational
[API documentation]: https://run-z.github.io/rollup-plugin-unbundle
[external]: https://rollupjs.org/guide/en/#external
[package dependencies]: https://docs.npmjs.com/cli/v8/configuring-npm/package-json#dependencies
[package peerDependencies]: https://docs.npmjs.com/cli/v8/configuring-npm/package-json#peerdependencies

## Example Configuration

Add the following `rollup.config.js`:

```javascript
import nodeResolve from '@rollup/plugin-node-resolve';
import unbundle from 'rollup-plugin-unbundle';

export default {
  input: './src/index.js',
  plugins: [nodeResolve(), unbundle()],
  external: [
    /*
      List external deps here.

      These can be package names, even though they are not necessarily listed
      in `package.json`.

      If you provide a function instead, make sure it returns `null`
      or `undefined` to allow plugin to decide.
    */
  ],
  output: {
    format: 'esm',
    sourcemap: true,
    file: 'dist/index.js',
  },
};
```

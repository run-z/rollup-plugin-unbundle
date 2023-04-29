import ts from '@rollup/plugin-typescript';
import { builtinModules, createRequire } from 'node:module';
import { defineConfig } from 'rollup';
import flatDts from 'rollup-plugin-flat-dts';
import typescript from 'typescript';

const req = createRequire(import.meta.url);
const pkg = req('./package.json');
const externals = new Set([
  ...builtinModules,
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
]);

export default defineConfig({
  input: {
    'unbundle.plugin': './src/plugin.ts',
  },
  plugins: [
    ts({
      typescript,
      cacheDir: 'target/.rts_cache',
    }),
  ],
  external(id) {
    return id.startsWith('node:') || externals.has(id);
  },
  output: [
    {
      format: 'cjs',
      sourcemap: true,
      dir: '.',
      exports: 'auto',
      entryFileNames: 'dist/[name].cjs',
      hoistTransitiveImports: false,
    },
    {
      format: 'esm',
      sourcemap: true,
      dir: '.',
      entryFileNames: 'dist/[name].js',
      hoistTransitiveImports: false,
      plugins: [
        flatDts({
          file: './dist/unbundle.plugin.d.ts',
          lib: true,
          compilerOptions: {
            declarationMap: true,
          },
          entries: {
            api: {
              file: './dist/unbundle.api.d.ts',
            },
          },
          internal: ['**/*.impl.ts', '**/impl/**'],
        }),
      ],
    },
  ],
});

import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

/** Web-worker extension host bundle: CommonJS, browser platform, `vscode` provided by the host. */
const ctx = await esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: ['vscode'],
  sourcemap: true,
  minify: false,
  logLevel: 'info',
  define: { 'process.env.NODE_ENV': '"production"' },
});
if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
}

import * as esbuild from 'esbuild';
import { readdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const tests = process.argv.includes('--tests');

if (tests) {
  // Bundle node:test files (TypeScript, extensionless imports) into out/test/*.js.
  const entryPoints = readdirSync('test').filter((f) => f.endsWith('.test.ts')).map((f) => `test/${f}`);
  await esbuild.build({
    entryPoints,
    bundle: true,
    outdir: 'out/test',
    format: 'cjs',
    platform: 'node',
    target: 'node22',
    external: ['vscode'],
    sourcemap: 'inline',
    logLevel: 'warning',
  });
  process.exit(0);
}

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

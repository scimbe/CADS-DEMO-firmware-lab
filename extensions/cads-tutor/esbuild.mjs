import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

/** Redirects a few imports so the ESM-only @cads/tutor-platform bundles cleanly into CJS. */
const platformShims = {
  name: "cads-tutor-platform-shims",
  setup(build) {
    build.onResolve({ filter: /^node:sqlite$/ }, (args) => {
      // The shim itself must reach the real built-in (external), everything else gets the shim.
      if (args.importer.endsWith("node-sqlite.cjs")) return { path: "node:sqlite", external: true };
      return { path: path.join(here, "shims", "node-sqlite.cjs") };
    });
    build.onResolve({ filter: /(^|\/)stt(-race)?\.js$/ }, (args) => {
      if (args.importer.includes("tutor-platform")) {
        return { path: path.join(here, "shims", "empty.cjs") };
      }
      return undefined;
    });
  },
};

/** @type {esbuild.BuildOptions} */
const options = {
  entryPoints: [path.join(here, "src", "extension.ts")],
  bundle: true,
  outfile: path.join(here, "dist", "extension.js"),
  platform: "node",
  format: "cjs",
  target: "node22",
  sourcemap: true,
  minify: false,
  external: ["vscode", "student-memory"],
  logLevel: "info",
  plugins: [platformShims],
  define: { "process.env.CADS_TUTOR_BUNDLED": '"1"' },
};

/** Content packs (grounding index + curriculum) ship inside the VSIX: dist/content-packs/. */
function copyContentPacks() {
  const src = path.join(here, "node_modules", "@cads", "tutor-platform", "content-packs");
  const dst = path.join(here, "dist", "content-packs");
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });
  fs.copyFileSync(path.join(src, "curriculum.json"), path.join(dst, "curriculum.json"));
  // Every pack the platform ships, not a hard-coded list: the list said
  // ["firmware"] while @cads/tutor-platform also carries javascript and rust,
  // so the language courses fell back to their own sources/ - three MDN pages
  // instead of the seven calibrated chapters their grounding threshold was set
  // against. A new pack in the dependency now needs no change here.
  const packs = fs
    .readdirSync(src, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  for (const pack of packs) {
    fs.mkdirSync(path.join(dst, pack), { recursive: true });
    for (const f of ["index.json", "sources.json", "manifest.json"]) fs.copyFileSync(path.join(src, pack, f), path.join(dst, pack, f));
  }
  console.log(`copied content packs → ${path.relative(here, dst)} (${packs.join(", ")})`);
}
copyContentPacks();

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}

#!/usr/bin/env node
/**
 * Reads step front matter the way the tutor itself reads it.
 *
 * The validator used to bring its own YAML parser, and two parsers meant two
 * truths. A step titled `CaDS: RAM budget` without quotes was invalid YAML to
 * the runtime - which dropped the file and with it the whole course - while the
 * validator reported PASS. The second crack was escapes: `"a\s*b"` is not a
 * legal double-quoted scalar, the runtime rejects the file, and a hand-rolled
 * parser hands back a literal backslash-s instead.
 *
 * So there is no second parser any more. This helper imports the extension's
 * own `parseFrontMatter`, which means the same `yaml` package, the same version
 * and the same `strict`/`uniqueKeys` options as the running tutor. Node 22.18+
 * strips the types on import, so nothing has to be built first.
 *
 * Protocol: a JSON array of file paths on stdin, a JSON array of results on
 * stdout, one per input path and in the same order:
 *   { "file": …, "ok": true,  "data": <front matter>, "body": <markdown> }
 *   { "file": …, "ok": true,  "data": null, "body": …, "hasFrontMatter": false }
 *   { "file": …, "ok": false, "error": "<the message the runtime would log>" }
 * A file that cannot be read is reported the same way, as `ok: false`.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const FRONT_MATTER = path.resolve(here, "..", "extensions", "cads-tutor", "src", "frontmatter.ts");

let parseFrontMatter;
try {
  ({ parseFrontMatter } = await import(`file://${FRONT_MATTER}`));
} catch (err) {
  process.stderr.write(
    `cannot load ${FRONT_MATTER}: ${err?.message ?? err}\n` +
      "The validator parses front matter with the extension's own parser.\n" +
      "Run `npm ci` in extensions/cads-tutor once, and use Node 22.18 or newer.\n",
  );
  process.exit(2);
}

const stdin = await new Promise((resolve, reject) => {
  let buf = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk) => (buf += chunk));
  process.stdin.on("end", () => resolve(buf));
  process.stdin.on("error", reject);
});

let files;
try {
  files = JSON.parse(stdin || "[]");
  if (!Array.isArray(files)) throw new Error("expected a JSON array of paths");
} catch (err) {
  process.stderr.write(`bad input: ${err?.message ?? err}\n`);
  process.exit(2);
}

const out = files.map((file) => {
  let text;
  try {
    text = fs.readFileSync(file, "utf-8");
  } catch (err) {
    return { file, ok: false, error: `cannot read file: ${err?.message ?? err}` };
  }
  try {
    const { data, body, hasFrontMatter } = parseFrontMatter(text);
    // The runtime treats a non-map front matter as unusable, and so must the
    // validator - otherwise `- a\n- b` would validate as an empty step.
    if (hasFrontMatter && data !== undefined && data !== null && (typeof data !== "object" || Array.isArray(data))) {
      return { file, ok: false, error: "front matter is not a YAML mapping" };
    }
    return { file, ok: true, data: data ?? null, body, hasFrontMatter };
  } catch (err) {
    // Exactly the message loader.ts writes into its diagnostics, so the
    // validator quotes what a student would otherwise hit at load time.
    return { file, ok: false, error: `invalid YAML front matter: ${err?.message ?? err}` };
  }
});

process.stdout.write(JSON.stringify(out));

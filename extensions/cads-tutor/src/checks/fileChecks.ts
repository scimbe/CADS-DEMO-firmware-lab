import * as fs from "node:fs";
import * as path from "node:path";

export interface FileCheckResult {
  passed: boolean;
  message: string;
  /** 1-based line of the first match, if any. */
  line?: number;
}

/** Resolves `file` relative to `root`, refusing to escape it (packs must not read outside the project). */
export function resolveInRoot(root: string, file: string): string {
  const abs = path.resolve(root, file);
  const rel = path.relative(root, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error(`path "${file}" escapes the project root`);
  return abs;
}

function readText(root: string, file: string): { text?: string; error?: string; abs: string } {
  const abs = resolveInRoot(root, file);
  try {
    return { text: fs.readFileSync(abs, "utf8"), abs };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    return { error: code === "ENOENT" ? `file not found: ${file}` : `cannot read ${file}: ${err instanceof Error ? err.message : String(err)}`, abs };
  }
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

export function fileMatches(root: string, file: string, pattern: string, flags?: string): FileCheckResult {
  const { text, error } = readText(root, file);
  if (text === undefined) return { passed: false, message: error! };
  const re = new RegExp(pattern, normalizeFlags(flags));
  const m = re.exec(text);
  if (!m) return { passed: false, message: `pattern /${pattern}/ not found in ${file}` };
  const line = lineOf(text, m.index);
  return { passed: true, message: `found /${pattern}/ in ${file}:${line}`, line };
}

export function fileNotMatches(root: string, file: string, pattern: string, flags?: string): FileCheckResult {
  const { text, error } = readText(root, file);
  if (text === undefined) return { passed: false, message: error! };
  const re = new RegExp(pattern, normalizeFlags(flags));
  const m = re.exec(text);
  if (m) {
    const line = lineOf(text, m.index);
    return { passed: false, message: `pattern /${pattern}/ still present in ${file}:${line}`, line };
  }
  return { passed: true, message: `/${pattern}/ is absent from ${file}` };
}

/** Removes the global flag (exec with /g is stateful) and dedupes. */
function normalizeFlags(flags?: string): string {
  if (!flags) return "";
  return [...new Set(flags.replace(/g/g, ""))].join("");
}

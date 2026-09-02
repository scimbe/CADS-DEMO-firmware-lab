import YAML from "yaml";

export interface FrontMatterResult {
  /** Parsed YAML (may be `undefined` for an empty block). */
  data: unknown;
  body: string;
  /** True if a `---` fenced block was found at the top of the file. */
  hasFrontMatter: boolean;
}

/**
 * Splits a step file into its YAML front matter and Markdown body. Only a block that starts on
 * the very first line (`---`) and is closed by a line consisting of `---` counts; anything else
 * is a plain Markdown file without metadata.
 */
export function parseFrontMatter(text: string): FrontMatterResult {
  const normalized = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const match = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(normalized);
  if (!match) {
    return { data: undefined, body: normalized, hasFrontMatter: false };
  }
  const yamlText = match[1];
  const body = normalized.slice(match[0].length);
  const data = YAML.parse(yamlText, { strict: true, uniqueKeys: true });
  return { data, body, hasFrontMatter: true };
}

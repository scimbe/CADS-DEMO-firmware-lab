/**
 * Markdown → HTML for step bodies, with the course-pack link scheme (SPEC §3.3):
 *   step:<stepId>            → in-panel navigation
 *   file:<path>[#L<line>]    → opens the file in the editor at that line
 *   doc:<path>               → opens a doc file from the project root
 *   http(s)://…              → external link
 * Relative image paths resolve against the pack's assets/ directory via `resolveAsset`.
 * Pure module (no vscode import): the panel supplies URI conversion callbacks.
 *
 * It also owns the `::: do` instruction block (SPEC A9.1). The block is parsed
 * here and drawn by the panel, which is why the card itself is a callback: the
 * card belongs with the other cards in webview.ts, the syntax belongs here.
 */
import MarkdownIt from "markdown-it";

export interface RenderOptions {
  /** Converts a path relative to the step file's directory (or assets/) into a webview URI. */
  resolveAsset: (relPath: string) => string;
  /** Draws a `::: do` card. Supplied by the panel, so this module stays presentation-free. */
  renderDo: (block: DoBlockView) => string;
}

export type TutorLink =
  | { kind: "step"; stepId: string }
  | { kind: "file"; path: string; line?: number }
  | { kind: "doc"; path: string }
  | { kind: "url"; url: string };

export function parseTutorLink(href: string): TutorLink | undefined {
  const step = /^step:([A-Za-z0-9._-]+)$/.exec(href);
  if (step) return { kind: "step", stepId: step[1] };
  const file = /^file:([^#]+)(?:#L?(\d+))?$/.exec(href);
  if (file) return { kind: "file", path: file[1], line: file[2] ? Number(file[2]) : undefined };
  const doc = /^doc:(.+)$/.exec(href);
  if (doc) return { kind: "doc", path: doc[1] };
  if (/^https?:\/\//.test(href)) return { kind: "url", url: href };
  return undefined;
}

/** `data-tutor-link` attributes let the webview script intercept clicks without the CSP-blocked inline handlers. */
export function tutorLinkAttrs(link: TutorLink): string {
  switch (link.kind) {
    case "step":
      return `href="#" data-tutor-link="step" data-step="${escapeAttr(link.stepId)}"`;
    case "file":
      return `href="#" data-tutor-link="file" data-path="${escapeAttr(link.path)}"${link.line ? ` data-line="${link.line}"` : ""}`;
    case "doc":
      return `href="#" data-tutor-link="doc" data-path="${escapeAttr(link.path)}"`;
    case "url":
      return `href="${escapeAttr(link.url)}" data-tutor-link="url"`;
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function escapeAttr(s: string): string {
  return escapeHtml(s);
}

// ---------------------------------------------------------------------------
// SPEC A9.1: the `::: do` instruction block.
//
//   ::: do task="CaDS: RAM budget"
//   Öffne die Befehlspalette und führe den Task aus.
//   > expect: Im Terminal steht am Ende `PASS`.
//   > recover: Steht dort `command not found`, ist das Terminal im falschen Ordner.
//   :::
//
// One action per block, and the block says how the student recognises success
// and what to do when it did not happen. Three courses were lost to instructions
// that read fine and could not be followed: a palette entry typed without its
// `>` prefix, a command run in the wrong directory, a task name that existed
// nowhere. None of those survives this format - the button performs the literal
// route printed beside it, and the validator rejects a route nothing defines.
// ---------------------------------------------------------------------------

/** The single thing a `::: do` block asks for. `keys` is display-only. */
export type DoAction =
  | { kind: "task"; label: string }
  | { kind: "command"; command: string; cwd?: string }
  | { kind: "palette"; entry: string }
  | { kind: "file"; path: string; line?: number }
  | { kind: "keys"; keys: string };

/** A parsed block, still in markdown. `problems` is empty for a well-formed block. */
export interface DoBlockSource {
  action?: DoAction;
  instruction: string;
  expect?: string;
  recover?: string;
  problems: string[];
}

/** The same block with its inline markdown rendered, as handed to the panel. */
export interface DoBlockView {
  action?: DoAction;
  instructionHtml: string;
  expectHtml?: string;
  recoverHtml?: string;
  problems: string[];
}

const DO_OPEN_RE = /^:::[ \t]+do(?:[ \t]+(.*))?$/;
const DO_CLOSE_RE = /^:::[ \t]*$/;

/**
 * Removes every `::: do ... :::` block from a step's raw markdown body, line by
 * line, same boundaries the renderer itself uses. For indexing (GroundingEngine):
 * a `::: do` block is an operating instruction, not an explanation - its `expect:`
 * line names the very result a content question would be asking for, so leaving
 * it in the search index would let a citation hand back the answer instead of the
 * material to reason from it.
 */
export function stripDoBlocks(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  let inBlock = false;
  for (const line of lines) {
    if (!inBlock && DO_OPEN_RE.test(line)) {
      inBlock = true;
      continue;
    }
    if (inBlock) {
      if (DO_CLOSE_RE.test(line)) inBlock = false;
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}
const DO_ATTR_RE = /([a-zA-Z]+)[ \t]*=[ \t]*(?:"([^"]*)"|(\S+))/g;
const DO_ACTION_KEYS = ["task", "command", "palette", "file", "keys"] as const;
const DO_MODIFIER_KEYS = ["cwd", "line"] as const;

/**
 * Reads the attributes of a `::: do` opening line. Exactly one action attribute
 * is allowed; anything else is reported rather than guessed at, because a block
 * with two actions is two instructions and the student would do only one.
 */
export function parseDoAttributes(attrText: string): { action?: DoAction; problems: string[] } {
  const problems: string[] = [];
  const attrs = new Map<string, string>();
  DO_ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  const text = attrText.trim();
  while ((m = DO_ATTR_RE.exec(text)) !== null) {
    const key = m[1];
    const value = m[2] !== undefined ? m[2] : m[3];
    if (attrs.has(key)) problems.push(`attribute "${key}" given twice`);
    attrs.set(key, value);
  }
  const known = new Set<string>([...DO_ACTION_KEYS, ...DO_MODIFIER_KEYS]);
  for (const key of attrs.keys()) if (!known.has(key)) problems.push(`unknown attribute "${key}"`);

  const present = DO_ACTION_KEYS.filter((k) => attrs.has(k));
  if (present.length === 0) problems.push(`no action: one of ${DO_ACTION_KEYS.join(", ")} is required`);
  if (present.length > 1) problems.push(`${present.join(" and ")} in one block; one action per block`);
  if (attrs.has("cwd") && !attrs.has("command")) problems.push('cwd= only applies to command=');
  if (attrs.has("line") && !attrs.has("file")) problems.push('line= only applies to file=');

  if (present.length !== 1) return { problems };
  const only = present[0];
  const value = attrs.get(only)!;
  if (!value.trim()) {
    problems.push(`${only}= is empty`);
    return { problems };
  }
  switch (only) {
    case "task":
      return { action: { kind: "task", label: value }, problems };
    case "command": {
      const cwd = attrs.get("cwd");
      if (cwd !== undefined && (cwd.startsWith("/") || cwd.split("/").includes(".."))) problems.push(`cwd "${cwd}" must stay inside the project`);
      return { action: { kind: "command", command: value, cwd: cwd || undefined }, problems };
    }
    case "palette": {
      // Without the leading ">" the palette searches file names and answers "no
      // matching results", which reads as "that command does not exist".
      if (!value.startsWith(">")) problems.push(`palette "${value}" must carry the leading ">"`);
      return { action: { kind: "palette", entry: value }, problems };
    }
    case "file": {
      const raw = attrs.get("line");
      let line: number | undefined;
      if (raw !== undefined) {
        line = Number(raw);
        if (!Number.isInteger(line) || line < 1) {
          problems.push(`line "${raw}" is not a positive line number`);
          line = undefined;
        }
      }
      return { action: { kind: "file", path: value, line }, problems };
    }
    default:
      return { action: { kind: "keys", keys: value }, problems };
  }
}

/**
 * Parses the body lines of a block (everything between the `::: do` line and the
 * closing `:::`). `> expect:` and `> recover:` continue across following `>`
 * lines, so a recovery instruction may be a sentence rather than a fragment.
 */
export function parseDoBody(lines: readonly string[]): { instruction: string; expect?: string; recover?: string; problems: string[] } {
  const problems: string[] = [];
  const instruction: string[] = [];
  const expect: string[] = [];
  const recover: string[] = [];
  let sink: string[] | undefined;
  for (const raw of lines) {
    const line = raw.trim();
    const marked = /^>[ \t]*(expect|recover):[ \t]*(.*)$/.exec(line);
    if (marked) {
      sink = marked[1] === "expect" ? expect : recover;
      if (sink.length > 0) problems.push(`"${marked[1]}:" given twice`);
      sink.push(marked[2]);
      continue;
    }
    if (line.startsWith(">") && sink) {
      sink.push(line.slice(1).trim());
      continue;
    }
    sink = undefined;
    instruction.push(raw);
  }
  const joined = (parts: string[]) => parts.join(" ").trim();
  const text = instruction.join("\n").trim();
  if (!text) problems.push("no instruction: the block needs one imperative sentence");
  if (expect.length === 0) problems.push("no `> expect:` line");
  if (recover.length === 0) problems.push("no `> recover:` line");
  return { instruction: text, expect: joined(expect) || undefined, recover: joined(recover) || undefined, problems };
}

/** Parses a whole block, opening and closing line included. Exported for tests and the panel. */
export function parseDoBlock(text: string): DoBlockSource | undefined {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const open = DO_OPEN_RE.exec(lines[0]?.trim() ?? "");
  if (!open) return undefined;
  let end = lines.length;
  for (let i = 1; i < lines.length; i++) {
    if (DO_CLOSE_RE.test(lines[i].trim())) {
      end = i;
      break;
    }
  }
  const attrs = parseDoAttributes(open[1] ?? "");
  const body = parseDoBody(lines.slice(1, end));
  return { action: attrs.action, instruction: body.instruction, expect: body.expect, recover: body.recover, problems: [...attrs.problems, ...body.problems] };
}

export function createRenderer(options: RenderOptions): (markdown: string) => string {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: false });

  // Validate links: allow our custom schemes in addition to markdown-it's defaults.
  const defaultValidate = md.validateLink.bind(md);
  md.validateLink = (url: string) => /^(step|file|doc):/.test(url) || defaultValidate(url);

  const defaultLinkOpen = md.renderer.rules.link_open ?? ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));
  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const href = token.attrGet("href") ?? "";
    const link = parseTutorLink(href);
    if (!link) return defaultLinkOpen(tokens, idx, opts, env, self);
    return `<a ${tutorLinkAttrs(link)} class="tutor-link tutor-link-${link.kind}">`;
  };

  const defaultImage = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const src = token.attrGet("src") ?? "";
    if (!/^(https?:|data:|vscode-)/.test(src)) {
      token.attrSet("src", options.resolveAsset(src));
    }
    return defaultImage(tokens, idx, opts, env, self);
  };

  // A9.1: `::: do` is a block of its own, not a paragraph. Registered before
  // `fence` so a block is recognised wherever a fenced code block could start,
  // and written by hand rather than pulled in as a container plugin - the rule
  // is twenty lines and the dependency would be permanent.
  md.block.ruler.before(
    "fence",
    "tutor_do",
    (state, startLine, endLine, silent) => {
      const start = state.bMarks[startLine] + state.tShift[startLine];
      const max = state.eMarks[startLine];
      if (state.sCount[startLine] - state.blkIndent >= 4) return false;
      const open = DO_OPEN_RE.exec(state.src.slice(start, max).trim());
      if (!open) return false;
      if (silent) return true;

      // Find the closing ":::"; an unterminated block ends at the end of input,
      // so a missing terminator loses no text - the validator names it instead.
      let line = startLine + 1;
      let closed = false;
      for (; line < endLine; line++) {
        const s = state.bMarks[line] + state.tShift[line];
        const e = state.eMarks[line];
        if (DO_CLOSE_RE.test(state.src.slice(s, e).trim())) {
          closed = true;
          break;
        }
      }
      const body: string[] = [];
      for (let i = startLine + 1; i < line; i++) {
        body.push(state.src.slice(state.bMarks[i] + state.tShift[i], state.eMarks[i]));
      }
      const attrs = parseDoAttributes(open[1] ?? "");
      const parsed = parseDoBody(body);
      const problems = [...attrs.problems, ...parsed.problems];
      if (!closed) problems.push("block is not closed by `:::`");

      const token = state.push("tutor_do", "div", 0);
      token.block = true;
      token.map = [startLine, line];
      token.meta = { action: attrs.action, instruction: parsed.instruction, expect: parsed.expect, recover: parsed.recover, problems } satisfies DoBlockSource;
      state.line = closed ? line + 1 : line;
      return true;
    },
    { alt: ["paragraph", "reference", "blockquote", "list"] },
  );

  md.renderer.rules.tutor_do = (tokens, idx) => {
    const src = tokens[idx].meta as DoBlockSource;
    return options.renderDo({
      action: src.action,
      // The instruction may be several sentences and carries links and code
      // spans, so it goes through the block renderer; expect/recover are one
      // line each and stay inline.
      instructionHtml: src.instruction ? md.render(src.instruction) : "",
      expectHtml: src.expect ? md.renderInline(src.expect) : undefined,
      recoverHtml: src.recover ? md.renderInline(src.recover) : undefined,
      problems: src.problems,
    });
  };

  // Code blocks: keep the language as a class so the webview can style it.
  return (markdown: string) => md.render(markdown);
}

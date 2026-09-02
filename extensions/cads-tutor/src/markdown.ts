/**
 * Markdown → HTML for step bodies, with the course-pack link scheme (SPEC §3.3):
 *   step:<stepId>            → in-panel navigation
 *   file:<path>[#L<line>]    → opens the file in the editor at that line
 *   doc:<path>               → opens a doc file from the project root
 *   http(s)://…              → external link
 * Relative image paths resolve against the pack's assets/ directory via `resolveAsset`.
 * Pure module (no vscode import): the panel supplies URI conversion callbacks.
 */
import MarkdownIt from "markdown-it";

export interface RenderOptions {
  /** Converts a path relative to the step file's directory (or assets/) into a webview URI. */
  resolveAsset: (relPath: string) => string;
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

  // Code blocks: keep the language as a class so the webview can style it.
  return (markdown: string) => md.render(markdown);
}

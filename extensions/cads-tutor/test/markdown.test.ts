import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRenderer, parseTutorLink } from "../src/markdown";
import { renderStepHtml, type StepView } from "../src/webview";

describe("markdown", () => {
  const render = createRenderer({ resolveAsset: (p) => `vscode-resource://assets/${p}` });

  it("parses the link scheme", () => {
    assert.deepEqual(parseTutorLink("step:m0-03-build"), { kind: "step", stepId: "m0-03-build" });
    assert.deepEqual(parseTutorLink("file:core/hal/cads_hal.h#L42"), { kind: "file", path: "core/hal/cads_hal.h", line: 42 });
    assert.deepEqual(parseTutorLink("file:scripts/x.sh"), { kind: "file", path: "scripts/x.sh", line: undefined });
    assert.deepEqual(parseTutorLink("doc:docs/HARDWARE.md"), { kind: "doc", path: "docs/HARDWARE.md" });
    assert.deepEqual(parseTutorLink("https://x.y/z"), { kind: "url", url: "https://x.y/z" });
    assert.equal(parseTutorLink("javascript:alert(1)"), undefined);
  });

  it("renders step:/file:/doc: links as data attributes and rewrites image paths", () => {
    const html = render("[Go](step:m0-02) [Src](file:core/cads_hal.h#L42) [Doc](doc:docs/HARDWARE.md) [Ext](https://example.org) ![d](diagram.svg)\n\n```c\nint x;\n```");
    assert.match(html, /data-tutor-link="step" data-step="m0-02"/);
    assert.match(html, /data-tutor-link="file" data-path="core\/cads_hal.h" data-line="42"/);
    assert.match(html, /data-tutor-link="doc" data-path="docs\/HARDWARE.md"/);
    assert.match(html, /href="https:\/\/example.org" data-tutor-link="url"/);
    assert.match(html, /src="vscode-resource:\/\/assets\/diagram.svg"/);
    assert.match(html, /<code class="language-c">/);
    assert.doesNotMatch(html, /<script/);
  });

  it("escapes raw HTML in step bodies", () => {
    const html = render("<script>alert(1)</script> **b**");
    assert.match(html, /&lt;script&gt;/);
  });
});

describe("webview", () => {
  it("renders a step with CSP nonce, tasks, hint tier and the language choice", () => {
    const view: StepView = {
      lang: "de", courseId: "c", courseTitle: "Kurs", moduleTitle: "M0", stepId: "s", title: "Titel <x>", index: 0, total: 4, bloom: "apply",
      estimatedMinutes: 5, objectives: ["o1"], creates: [], status: "active", lockedBy: [], bodyHtml: "<p>hi</p>",
      links: [{ label: "Doc", link: { kind: "doc", path: "docs/x.md" } }],
      tasks: [
        { id: "a", title: "A", type: "fileMatches", status: "failed", message: "nope", hint: { tier: 2, question: "Q?", hint: "H" }, needsAnswer: false, manual: false, live: true },
        { id: "q", title: "Q", type: "question", status: "pending", needsAnswer: true, manual: true, live: false },
      ],
      prev: undefined, next: { stepId: "s2", title: "Next" }, llmConfigured: false, bridgeAvailable: false, scaffold: "independent",
    };
    const html = renderStepHtml(view, "vscode-webview://x", "NONCE123");
    assert.match(html, /script-src 'nonce-NONCE123'/);
    assert.match(html, /<script nonce="NONCE123">/);
    assert.match(html, /Titel &lt;x&gt;/);
    assert.match(html, /Hinweis 2 von 3/);
    // The switcher names BOTH languages and marks the active one. It must never
    // be a single button labelled with the other language, which read as a claim
    // about the current state.
    assert.match(html, /class="btn lang-choice active"[^>]*data-lang="de"[^>]*>Deutsch</);
    assert.match(html, /data-lang="en"[^>]*>English</);
    assert.doesNotMatch(html, /id="lang-toggle"/);
    assert.match(html, /data-tutor-link="doc" data-path="docs\/x.md"/);
    assert.match(html, /class="task status-failed" data-task="a"/);
    assert.match(html, /textarea class="answer" data-task="q"/);
    assert.match(html, /TUTOR_LLM_BASE_URL/);
    assert.match(html, /Bloom-Stufe: Anwenden/);
    const en = renderStepHtml({ ...view, lang: "en" }, "vscode-webview://x", "N");
    assert.match(en, /Hint 2 of 3/);
    assert.match(en, /Bloom level: apply/);
  });
});

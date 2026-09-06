import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRenderer, parseDoAttributes, parseDoBlock, parseTutorLink } from "../src/markdown";
import { renderDoCard, renderStepHtml, type StepView } from "../src/webview";

describe("markdown", () => {
  const render = createRenderer({ resolveAsset: (p) => `vscode-resource://assets/${p}`, renderDo: (b) => renderDoCard(b, "de") });

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
      prev: undefined, next: { stepId: "s2", title: "Next" }, llmConfigured: false, bridgeAvailable: false, scaffold: "independent", hasBoard: false,
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

/**
 * SPEC A9.1. The three failures this format exists to prevent are each covered
 * here: a palette entry without its ">" prefix, a command without the directory
 * it belongs in, and a route that names something the course never defines
 * (the last one is the validator's, the first two are the parser's).
 */
describe("::: do instruction blocks", () => {
  const render = createRenderer({ resolveAsset: (p) => `asset:${p}`, renderDo: (b) => renderDoCard(b, "de") });

  it("parses one action, the instruction and both required lines", () => {
    const block = parseDoBlock(
      '::: do task="CaDS: RAM budget"\n' +
        "Öffne die Befehlspalette und führe den Task aus.\n" +
        "> expect: Im Terminal steht am Ende `PASS`.\n" +
        "> recover: Steht dort `command not found`, ist das Terminal im falschen Ordner.\n" +
        ":::",
    );
    assert.deepEqual(block?.action, { kind: "task", label: "CaDS: RAM budget" });
    assert.equal(block?.instruction, "Öffne die Befehlspalette und führe den Task aus.");
    assert.equal(block?.expect, "Im Terminal steht am Ende `PASS`.");
    assert.match(block!.recover!, /command not found/);
    assert.deepEqual(block?.problems, []);
  });

  it("reads every action attribute, with cwd and line", () => {
    assert.deepEqual(parseDoAttributes('command="npm test" cwd="workspaces/js"').action, { kind: "command", command: "npm test", cwd: "workspaces/js" });
    assert.deepEqual(parseDoAttributes('palette="> Tasks: Run Task"').action, { kind: "palette", entry: "> Tasks: Run Task" });
    assert.deepEqual(parseDoAttributes('file="src/main.c" line="42"').action, { kind: "file", path: "src/main.c", line: 42 });
    assert.deepEqual(parseDoAttributes('keys="Strg/Cmd + J"').action, { kind: "keys", keys: "Strg/Cmd + J" });
  });

  it("refuses two actions in one block, because the student would do only one", () => {
    const r = parseDoAttributes('task="CaDS: Build" command="make"');
    assert.equal(r.action, undefined);
    assert.match(r.problems.join(" "), /one action per block/);
  });

  it("insists on an action at all", () => {
    assert.match(parseDoAttributes("").problems.join(" "), /no action/);
  });

  it("insists on the leading '>' of a palette entry", () => {
    const r = parseDoAttributes('palette="Tasks: Run Task"');
    assert.match(r.problems.join(" "), /leading ">"/);
  });

  it("rejects a cwd or a line without the attribute it modifies", () => {
    assert.match(parseDoAttributes('task="t" cwd="x"').problems.join(" "), /cwd= only applies/);
    assert.match(parseDoAttributes('task="t" line="3"').problems.join(" "), /line= only applies/);
  });

  it("keeps a cwd inside the project", () => {
    assert.match(parseDoAttributes('command="ls" cwd="../../etc"').problems.join(" "), /must stay inside the project/);
    assert.match(parseDoAttributes('command="ls" cwd="/etc"').problems.join(" "), /must stay inside the project/);
  });

  it("reports a block without expect: or recover: as unfinished", () => {
    const block = parseDoBlock('::: do task="t"\nTu das.\n:::');
    assert.match(block!.problems.join(" "), /no `> expect:` line/);
    assert.match(block!.problems.join(" "), /no `> recover:` line/);
  });

  it("continues expect: and recover: across following '>' lines", () => {
    const block = parseDoBlock(
      '::: do keys="F1"\nDrücke die Taste.\n> expect: Oben öffnet sich ein Eingabefeld,\n> das den Namen des Befehls filtert.\n> recover: Passiert nichts, hat der Browser die Taste abgefangen.\n:::',
    );
    assert.equal(block?.expect, "Oben öffnet sich ein Eingabefeld, das den Namen des Befehls filtert.");
    assert.match(block!.recover!, /Browser/);
    assert.deepEqual(block?.problems, []);
  });

  it("renders a card whose button runs the task and whose route stays visible", () => {
    const html = render(
      'Vorher.\n\n::: do task="CaDS: RAM budget"\nFühre den Task aus.\n> expect: `PASS` in der letzten Zeile.\n> recover: Kein Terminal? Dann lief der Task nicht.\n:::\n\nNachher.',
    );
    assert.match(html, /<div class="card do">/);
    assert.match(html, /data-kind="runTask"/);
    assert.match(html, /data-arg="CaDS: RAM budget"/);
    // The literal route survives the click: the button demonstrates it, it does not replace it.
    assert.match(html, /<code>CaDS: RAM budget<\/code>/);
    assert.match(html, /Daran erkennst du/);
    assert.match(html, /Wenn nicht/);
    // Never the page's primary button (R11a.5).
    assert.doesNotMatch(html, /class="btn action do-action[^"]*primary/);
    assert.match(html, /<p>Vorher.<\/p>/);
    assert.match(html, /<p>Nachher.<\/p>/);
    assert.doesNotMatch(html, /::: do/);
  });

  it("gives a palette block a button that opens the palette prefilled, prefix included", () => {
    const html = render('::: do palette="> Tasks: Run Task"\nÖffne die Palette.\n> expect: Die Liste der Tasks.\n> recover: Nichts? Dann F1 drücken.\n:::');
    assert.match(html, /data-kind="openPalette"/);
    assert.match(html, /data-arg="&gt; Tasks: Run Task"/);
    assert.match(html, /Befehlspalette öffnen/);
  });

  it("carries cwd and line through to the button, so the command runs where it belongs", () => {
    const cmd = render('::: do command="npm test" cwd="workspaces/js"\nFühre die Tests aus.\n> expect: Alle Tests grün.\n> recover: Rot? Lies den ersten Fehler.\n:::');
    assert.match(cmd, /data-kind="runInTerminal"/);
    assert.match(cmd, /data-cwd="workspaces\/js"/);
    const file = render('::: do file="src/main.c" line="42"\nÖffne die Datei.\n> expect: Der Cursor steht in Zeile 42.\n> recover: Falsche Datei? Sieh im Explorer nach.\n:::');
    assert.match(file, /data-kind="openFile"/);
    assert.match(file, /data-line="42"/);
  });

  it("gives a keys block no button: a keystroke is something the student presses", () => {
    const html = render('::: do keys="Strg/Cmd + J"\nKlappe das Terminal auf.\n> expect: Unten erscheint der Terminal-Bereich.\n> recover: Nichts? Menü ☰ → Terminal → New Terminal.\n:::');
    assert.doesNotMatch(html, /do-action/);
    assert.match(html, /Tastenkürzel/);
    assert.match(html, /<code>Strg\/Cmd \+ J<\/code>/);
  });

  it("shows an author what is wrong instead of swallowing a malformed block", () => {
    const html = render('::: do\nTu irgendwas.\n:::');
    assert.match(html, /do-problem/);
    assert.match(html, /no action/);
  });

  it("escapes raw HTML inside a block", () => {
    const html = render('::: do task="t"\n<script>alert(1)</script>\n> expect: <img src=x onerror=alert(1)>\n> recover: nichts\n:::');
    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  });
});

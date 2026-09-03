import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { ui } from "../src/i18n";
import { renderLanguageChoice } from "../src/webview";

const ROOT = path.resolve(__dirname, "..", "..");

describe("language switcher semantics", () => {
  // The live fault: the button showed the TARGET language, so an English UI
  // displayed "Deutsch" and people believed German was already active.
  it("marks the active language, not the other one", () => {
    const de = renderLanguageChoice("de");
    assert.match(de, /class="btn lang-choice active"[^>]*data-lang="de"/, "German marked active");
    assert.doesNotMatch(de, /class="btn lang-choice active"[^>]*data-lang="en"/);
    const en = renderLanguageChoice("en");
    assert.match(en, /class="btn lang-choice active"[^>]*data-lang="en"/, "English marked active");
  });
  it("offers both languages by their own name, always", () => {
    for (const active of ["de", "en"] as const) {
      const html = renderLanguageChoice(active);
      assert.match(html, />Deutsch</);
      assert.match(html, />English</);
    }
  });
  it("exposes the active state to assistive technology", () => {
    const html = renderLanguageChoice("de");
    assert.match(html, /data-lang="de"[^>]*aria-pressed="true"/s);
    assert.match(html, /data-lang="en"[^>]*aria-pressed="false"/s);
    assert.match(html, /role="group"/);
  });
  it("titles the active one as a statement and the other as an offer", () => {
    const html = renderLanguageChoice("de");
    assert.match(html, /title="Deutsch ist aktiv"/);
    assert.match(html, /title="Auf English umschalten"/);
  });
});

describe("no mixed-language strings in the panel", () => {
  it("counts steps in German as Schritt, not Step", () => {
    assert.equal(ui("de").stepOf(1, 41), "Schritt 1 von 41");
    assert.equal(ui("en").stepOf(1, 41), "Step 1 of 41");
  });
  it("uses German wording for the run-all button", () => {
    assert.equal(ui("de").checkAll, "Alle Aufgaben prüfen");
  });
  it("has no leftover English 'Step' anywhere in the German strings", () => {
    // The German block is the one that regressed; a single English word in a
    // composed sentence is exactly what the operator noticed.
    const de = ui("de") as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(de)) {
      if (typeof value !== "string") continue;
      assert.doesNotMatch(value, /\bStep\b/, `de.${key} still says "Step": ${value}`);
      assert.doesNotMatch(value, /\bCheck(s)?\b/, `de.${key} still says "Check": ${value}`);
    }
  });
});

describe("package contributions are localized, not doubled", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, "package.nls.json"), "utf8"));
  const de = JSON.parse(fs.readFileSync(path.join(ROOT, "package.nls.de.json"), "utf8"));

  it("shows one language per contribution, chosen by VS Code", () => {
    // "KURSE / COURSES" in the sidebar was both at once.
    const strings: string[] = [];
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === "object") Object.values(o).forEach(walk);
      else if (typeof o === "string") strings.push(o);
    };
    walk(pkg.contributes);
    for (const s of strings) assert.ok(!s.includes(" / "), `contribution still dual-language: ${s}`);
  });
  it("resolves every %key% used in package.json", () => {
    const used = new Set<string>();
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === "object") Object.values(o).forEach(walk);
      else if (typeof o === "string" && /^%.+%$/.test(o)) used.add(o.slice(1, -1));
    };
    walk(pkg.contributes);
    assert.ok(used.size > 0, "contributions are externalised");
    for (const k of used) {
      assert.ok(k in en, `missing English string for ${k}`);
      assert.ok(k in de, `missing German string for ${k}`);
    }
  });
  it("keeps command links intact in both languages", () => {
    // The mechanical split broke markdown links the first time round.
    for (const bundle of [en, de]) {
      for (const [k, v] of Object.entries(bundle) as [string, string][]) {
        const opens = (v.match(/\]\(command:/g) ?? []).length;
        const brackets = (v.match(/\[/g) ?? []).length;
        assert.equal(opens <= brackets, true, `${k} has a broken link: ${v}`);
        if (v.includes("](command:")) assert.match(v, /\[[^\]]+\]\(command:[^)]+\)/, `${k} link malformed: ${v}`);
      }
    }
  });
});

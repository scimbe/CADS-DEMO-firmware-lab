import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shellQuote, TerminalHost, TerminalLike, TutorTerminal, TUTOR_TERMINAL_NAME } from "../src/terminal";

class FakeTerminal implements TerminalLike {
  readonly sent: string[] = [];
  shown = 0;
  exitStatus: unknown = undefined;
  sendText(text: string) { this.sent.push(text); }
  show() { this.shown += 1; }
}

class FakeHost implements TerminalHost {
  readonly created: { name: string; terminal: FakeTerminal }[] = [];
  existing = new Map<string, FakeTerminal>();
  find(name: string) { return this.existing.get(name); }
  create(name: string) {
    const t = new FakeTerminal();
    this.created.push({ name, terminal: t });
    this.existing.set(name, t);
    return t;
  }
}

describe("running a command in the tutor terminal", () => {
  it("creates one terminal with the documented name and sends the command", () => {
    const host = new FakeHost();
    const t = new TutorTerminal(host);
    t.run("cargo test");
    assert.equal(host.created.length, 1);
    assert.equal(host.created[0].name, TUTOR_TERMINAL_NAME);
    assert.deepEqual(host.created[0].terminal.sent, ["cargo test"]);
  });
  it("reuses the same terminal for the next command instead of piling them up", () => {
    const host = new FakeHost();
    const t = new TutorTerminal(host);
    t.run("cargo test");
    t.run("cargo build");
    assert.equal(host.created.length, 1);
    assert.deepEqual(host.created[0].terminal.sent, ["cargo test", "cargo build"]);
  });
  it("enters the working directory first, so a reused terminal is in the right place", () => {
    const host = new FakeHost();
    new TutorTerminal(host).run("npm test", "packages/app");
    assert.deepEqual(host.created[0].terminal.sent, ["cd packages/app", "npm test"]);
  });
  it("does not cd for the project root itself", () => {
    const host = new FakeHost();
    new TutorTerminal(host).run("ls", ".");
    assert.deepEqual(host.created[0].terminal.sent, ["ls"]);
  });
  it("replaces a terminal the student closed rather than writing into a dead one", () => {
    const host = new FakeHost();
    const t = new TutorTerminal(host);
    t.run("first");
    host.created[0].terminal.exitStatus = { code: 0 };
    host.existing.delete(TUTOR_TERMINAL_NAME);
    t.run("second");
    assert.equal(host.created.length, 2);
    assert.deepEqual(host.created[1].terminal.sent, ["second"]);
  });
  it("adopts a terminal of the same name that the window already has", () => {
    const host = new FakeHost();
    const pre = new FakeTerminal();
    host.existing.set(TUTOR_TERMINAL_NAME, pre);
    new TutorTerminal(host).run("echo hi");
    assert.equal(host.created.length, 0, "no second terminal with the same name");
    assert.deepEqual(pre.sent, ["echo hi"]);
  });
  it("shows the terminal without stealing focus from the step being read", () => {
    const host = new FakeHost();
    new TutorTerminal(host).run("x");
    assert.equal(host.created[0].terminal.shown, 1);
  });
});

describe("shell quoting of the working directory", () => {
  it("leaves ordinary paths alone", () => {
    assert.equal(shellQuote("packages/app"), "packages/app");
    assert.equal(shellQuote("src"), "src");
  });
  it("quotes a path with spaces", () => {
    assert.equal(shellQuote("my project"), "'my project'");
  });
  it("escapes an embedded single quote", () => {
    assert.equal(shellQuote("it's"), "'it'\\''s'");
  });
  it("quotes shell metacharacters so a directory name cannot run a command", () => {
    for (const bad of ["a;rm -rf /", "a$(whoami)", "a&b", "a|b", "a`x`"]) {
      const q = shellQuote(bad);
      assert.ok(q.startsWith("'") && q.endsWith("'"), `${bad} -> ${q}`);
    }
  });
});

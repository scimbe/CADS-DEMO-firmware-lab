/**
 * Runs a task's command in a real terminal, so the student sees the output where
 * they will see it for the rest of their working life, not inside a panel.
 *
 * The VS Code API is behind `TerminalHost` so the behaviour is unit-testable:
 * reuse of one terminal, quoting of the working directory, and the fact that a
 * terminal the user closed is replaced rather than written into.
 */

export interface TerminalLike {
  sendText(text: string, addNewLine?: boolean): void;
  show(preserveFocus?: boolean): void;
  /** Set by VS Code once the shell has exited; such a terminal cannot be reused. */
  readonly exitStatus?: unknown;
}

export interface TerminalHost {
  /** An existing terminal with this name, if the window still has one. */
  find(name: string): TerminalLike | undefined;
  create(name: string, cwd?: string): TerminalLike;
}

export const TUTOR_TERMINAL_NAME = "CaDS Tutor";

/** POSIX single-quoting; the command runs in the user's shell, not through /bin/sh -c. */
export function shellQuote(value: string): string {
  return /^[A-Za-z0-9_.,:@%+=/-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

export class TutorTerminal {
  private current: TerminalLike | undefined;

  constructor(
    private readonly host: TerminalHost,
    private readonly name: string = TUTOR_TERMINAL_NAME,
  ) {}

  /**
   * Sends `command` to the tutor's terminal, creating it if there is none or if
   * the previous one has exited. `cwd` is entered first rather than passed at
   * creation, so a reused terminal ends up in the right directory too.
   */
  run(command: string, cwd?: string): TerminalLike {
    const terminal = this.acquire();
    if (cwd && cwd !== ".") terminal.sendText(`cd ${shellQuote(cwd)}`, true);
    terminal.sendText(command, true);
    // preserveFocus: the student is reading the step, and stealing the cursor
    // mid-sentence is worse than making them click into the terminal.
    terminal.show(true);
    return terminal;
  }

  private acquire(): TerminalLike {
    if (this.current && this.current.exitStatus === undefined) return this.current;
    const existing = this.host.find(this.name);
    if (existing && existing.exitStatus === undefined) {
      this.current = existing;
      return existing;
    }
    this.current = this.host.create(this.name);
    return this.current;
  }
}

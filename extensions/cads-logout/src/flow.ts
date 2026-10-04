/**
 * The logout sequence, free of `vscode` so it runs under node:test.
 *
 * Order matters: nothing is given up before the student confirmed, files are
 * saved before the tab leaves, and the board is released while the worker that
 * holds the WebUSB/WebSerial handles is still alive.
 */

export type BoardState = 'released' | 'busy' | 'absent';
export type LogoutResult = 'cancelled' | 'navigating' | 'failed';

export interface LogoutDeps {
  /** Modal question; true = the student chose `action`. */
  confirm(message: string, detail: string, action: string): Promise<boolean>;
  /** Save every dirty file that has a path. Untitled buffers are left alone. */
  saveAll(): Promise<boolean>;
  /** Names of the documents that are still dirty. */
  dirtyNames(): string[];
  /** Give up the board; `busy` = the probe refused (a flash is running). */
  releaseBoard(): Promise<BoardState>;
  /** Ask the page to leave; the URL it goes to, or null when nobody answered. */
  navigate(): Promise<string | null>;
  error(message: string): void;
  wait(ms: number): Promise<void>;
}

/**
 * How long a file may stay dirty after "save all" before the student is asked.
 * Extensions that write settings (configuration.update) leave settings.json
 * dirty for a moment; that must not turn into a warning about unsaved work.
 */
export const SAVE_SETTLE_TRIES = 6;
export const SAVE_SETTLE_MS = 500;

export const TEXT = {
  confirm: 'Vom Firmware-Labor abmelden?',
  confirmDetail: 'Offene Dateien werden vorher gespeichert, die Verbindung zum Board wird getrennt.',
  action: 'Abmelden',
  dirty: (names: string[]): string =>
    names.length === 1
      ? `„${names[0]}“ ist noch nicht gespeichert.`
      : `${names.length} Dateien sind noch nicht gespeichert: ${names.join(', ')}`,
  dirtyDetail:
    'Das Abmelden konnte sie nicht speichern (Datei ohne Namen oder Fehler beim Schreiben). Abbrechen, selbst speichern und erneut abmelden – oder ohne sie abmelden.',
  dirtyAction: 'Trotzdem abmelden',
  busy: 'Das Board ist noch belegt.',
  busyDetail:
    'Vermutlich läuft gerade ein Flash-Vorgang. Wer jetzt abmeldet, bricht ihn ab; das Board muss danach neu geflasht werden.',
  busyAction: 'Trotzdem abmelden',
  noPage:
    'Abmelden nicht möglich: Die Seite hat nicht geantwortet. Bitte die Seite neu laden (F5) und erneut abmelden – oder den Browser-Tab schließen.',
} as const;

export async function runLogout(deps: LogoutDeps): Promise<LogoutResult> {
  if (!(await deps.confirm(TEXT.confirm, TEXT.confirmDetail, TEXT.action))) return 'cancelled';

  await deps.saveAll();
  let dirty = deps.dirtyNames();
  for (let i = 0; dirty.length > 0 && i < SAVE_SETTLE_TRIES; i++) {
    await deps.wait(SAVE_SETTLE_MS);
    await deps.saveAll();
    dirty = deps.dirtyNames();
  }
  if (dirty.length > 0 && !(await deps.confirm(TEXT.dirty(dirty), TEXT.dirtyDetail, TEXT.dirtyAction))) {
    return 'cancelled';
  }

  if ((await deps.releaseBoard()) === 'busy' && !(await deps.confirm(TEXT.busy, TEXT.busyDetail, TEXT.busyAction))) {
    return 'cancelled';
  }

  if ((await deps.navigate()) === null) {
    deps.error(TEXT.noPage);
    return 'failed';
  }
  return 'navigating';
}

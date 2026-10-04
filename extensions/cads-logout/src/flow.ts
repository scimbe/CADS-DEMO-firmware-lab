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
}

export const TEXT = {
  confirm: 'Vom Firmware-Labor abmelden?',
  confirmDetail: 'Offene Dateien werden vorher gespeichert, die Verbindung zum Board wird getrennt.',
  action: 'Abmelden',
  dirty: (names: string[]): string =>
    names.length === 1
      ? `„${names[0]}“ ist noch nicht gespeichert.`
      : `${names.length} Dateien sind noch nicht gespeichert: ${names.join(', ')}`,
  dirtyDetail:
    'Unbenannte Dateien speichert das Abmelden nicht von selbst. Abbrechen, die Dateien speichern und erneut abmelden – oder ohne sie abmelden.',
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
  const dirty = deps.dirtyNames();
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

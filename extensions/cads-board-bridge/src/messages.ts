/* messages.ts – the words a student reads when the board will not open.
 *
 * The driver reports a reason code; this file is the only place that turns one into text, in
 * German (the lab's default) and English. Every message names the cause AND the next step,
 * because "NetworkError: Unable to claim interface" tells a beginner nothing and reads like a
 * broken board when it almost always means something else is holding it.
 */
import type { BoardStatus } from './board';
import type { BlockReason } from './types';

export interface BoardMessage {
  /** One line naming what is wrong. */
  title: string;
  /** The next thing to try. */
  action: string;
}

/** Last resort when a reason-specific action did not help. */
export const ESCALATION_DE =
  'Alle Tabs des Labors schließen, dann diesen wieder öffnen; hilft das nicht, USB-Kabel ab- und wieder anstecken.';
export const ESCALATION_EN =
  'Close every lab tab, then reopen this one; if that does not help, unplug and replug the USB cable.';

const DE: Record<BlockReason, BoardMessage> = {
  'other-tab': {
    title: 'Das Board wird bereits in einem anderen Tab dieses Labors benutzt.',
    action: 'Schließe den anderen Tab oder trenne dort die Verbindung („Board freigeben“), dann verbinde hier erneut.',
  },
  'other-app': {
    title: 'Ein anderes Programm auf deinem Rechner hält das Board.',
    action: 'Beende st-flash, st-util, den STM32CubeProgrammer oder einen anderen Browser mit geöffnetem Labor und verbinde erneut.',
  },
  gone: {
    title: 'Das Board ist nicht mehr da.',
    action: 'Prüfe das USB-Kabel am ST-Link-Anschluss und verbinde danach erneut.',
  },
  denied: {
    title: 'Der Browser hat die Freigabe für das Board zurückgezogen.',
    action: 'Verbinde erneut und wähle im Geräte-Dialog den ST-Link aus.',
  },
  'target-unresponsive': {
    title: 'Der Debug-Adapter reagiert nicht mehr.',
    action: 'Ziehe das USB-Kabel einmal ab und wieder an, dann verbinde neu.',
  },
  unknown: {
    title: 'Das Board ließ sich nicht öffnen.',
    action: ESCALATION_DE,
  },
};

const EN: Record<BlockReason, BoardMessage> = {
  'other-tab': {
    title: 'The board is already in use in another tab of this lab.',
    action: 'Close that tab or release the board there, then connect again here.',
  },
  'other-app': {
    title: 'Another program on your computer is holding the board.',
    action: 'Quit st-flash, st-util, STM32CubeProgrammer or another browser with the lab open, then connect again.',
  },
  gone: {
    title: 'The board is gone.',
    action: 'Check the USB cable on the ST-Link port, then connect again.',
  },
  denied: {
    title: 'The browser withdrew permission for the board.',
    action: 'Connect again and pick the ST-Link in the device chooser.',
  },
  'target-unresponsive': {
    title: 'The debug adapter has stopped responding.',
    action: 'Unplug the USB cable once and plug it back in, then connect again.',
  },
  unknown: {
    title: 'The board could not be opened.',
    action: ESCALATION_EN,
  },
};

export function boardMessage(reason: BlockReason | undefined, lang = 'de'): BoardMessage {
  const table = lang.startsWith('en') ? EN : DE;
  return table[reason ?? 'unknown'];
}

/** One line for a notification or the status bar. */
export function boardMessageLine(reason: BlockReason | undefined, lang = 'de'): string {
  const m = boardMessage(reason, lang);
  return `${m.title} ${m.action}`;
}

/** Plain text for the st-flash / st-info shims, which have no UI at all. */
export function shimMessage(reason: BlockReason | undefined, connected: boolean): string {
  if (connected) return '';
  const m = boardMessage(reason, 'de');
  const e = boardMessage(reason, 'en');
  return `${m.title} ${m.action}\n${e.title} ${e.action}`;
}

export interface BoardStatusBarText {
  text: string;
  tooltip: string;
  warning: boolean;
}

/**
 * PB-01: four course `> expect:` lines and a screenshot tell the student to
 * confirm a flash by the text "Flash ok: <bytes> Bytes in <ms> ms" - which
 * used to exist only as a `setStatusBarMessage(…, 6000)`, gone by the time a
 * student who reads the step before looking up ever sees it. `lastFlash`
 * already carries bytes/ms (board.ts); this puts them in the STATUS ITEM's
 * own text, which is redrawn on every statusChanged and stays exactly as
 * long as it is true - until the next connect, flash or core change
 * replaces it, never on a timer.
 */
export function boardStatusBarText(s: BoardStatus): BoardStatusBarText {
  if (!s.connected) {
    return { text: '$(plug) Board: getrennt', tooltip: 'CaDS Board – nicht verbunden. Klicken zum Verbinden.', warning: false };
  }
  const core = s.core === 'halted' ? 'angehalten' : s.core === 'running' ? 'läuft' : s.core;
  const serial = s.serialOpen ? ' · Konsole' : '';
  const gdb = s.gdbClients > 0 ? ' · GDB' : '';
  const flash = s.lastFlash?.ok && typeof s.lastFlash.bytes === 'number' && typeof s.lastFlash.ms === 'number' ? ` · Flash ok: ${s.lastFlash.bytes} Bytes in ${s.lastFlash.ms} ms` : '';
  const t = s.probe?.target;
  const tooltip = `ST-Link ${s.probe?.stlink?.version ?? ''} – ${t?.devName ?? ''} (${t?.flashSize ?? '?'} KB)\nCore: ${s.core}${s.lastFlash ? `\nLetzter Flash: ${s.lastFlash.file} ${s.lastFlash.ok ? 'ok' : 'FEHLER'} (${s.lastFlash.at})` : ''}`;
  return {
    text: `$(plug) Board: verbunden · ${core}${serial}${gdb}${flash}`,
    tooltip,
    warning: s.core === 'halted' && s.gdbClients === 0,
  };
}

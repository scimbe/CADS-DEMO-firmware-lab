/* busy.ts – turn "the board will not open" into something a student can act on.
 *
 * Opening or claiming the ST-Link fails with bare DOMExceptions ("Unable to claim interface",
 * "Access denied.", NetworkError) that all look like a broken board. They are not: almost always
 * something else simply holds the device. This maps the raw failure to a reason code; the
 * extension turns the code into localised text, so the driver stays free of UI strings.
 */

import type { BlockReason } from './types';
export type { BlockReason };

export interface BlockDiagnosis {
  reason: BlockReason;
  /** The untranslated driver-level detail, always kept for the log. */
  detail: string;
}

/**
 * Classify a failure from open()/selectConfiguration()/claimInterface().
 *
 * `lockHeldElsewhere` comes from the Web Lock and is the only signal that distinguishes "another
 * tab of this profile" from "another program on the machine" – the DOMException is identical for
 * both, because in both cases Chrome simply cannot get exclusive access from this process.
 */
export function diagnoseOpenFailure(e: unknown, lockHeldElsewhere = false): BlockDiagnosis {
  const detail = e instanceof Error ? e.message : String(e);
  const name = e instanceof Error ? e.name : '';
  if (lockHeldElsewhere) return { reason: 'other-tab', detail };

  if (/SecurityError|NotAllowedError|permission|not allowed/i.test(name + detail)) {
    return { reason: 'denied', detail };
  }
  if (/NotFoundError|no device selected|device not found|no such device/i.test(name + detail)) {
    return { reason: 'gone', detail };
  }
  // "Unable to claim interface" and "Access denied" are what Chrome reports when the OS or another
  // process owns the interface. NetworkError covers both that and a device that vanished mid-open,
  // so it only lands here when the device is still enumerated.
  if (/unable to claim|access denied|already in use|busy|exclusive/i.test(detail)) {
    return { reason: 'other-app', detail };
  }
  if (/NetworkError|unable to open|open failed/i.test(name + detail)) {
    return { reason: 'other-app', detail };
  }
  if (/disconnected|unavailable|InvalidStateError/i.test(name + detail)) {
    return { reason: 'gone', detail };
  }
  return { reason: 'unknown', detail };
}

/**
 * A target that does not answer over SWD while the ST-Link itself is fine. The host tool prints
 * "Failed to enter SWD mode" and chipid 0x000 for exactly this state; over WebUSB it shows up as
 * an all-zero or all-ones CPUID/core id, or a transfer timeout during identification.
 */
export function isTargetUnresponsive(coreId: number, cpuid: number): boolean {
  const dead = (v: number) => v === 0 || v === 0xffffffff;
  return dead(coreId) || dead(cpuid);
}

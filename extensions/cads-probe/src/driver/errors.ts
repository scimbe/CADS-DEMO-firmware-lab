/* errors.ts – error type of the probe driver (spec §3.1 ProbeResult.code). */

export type ProbeErrorCode = 'NO_DEVICE' | 'USB_IO' | 'TARGET_FAULT' | 'UNSUPPORTED';

export class ProbeError extends Error {
  readonly code: ProbeErrorCode;
  /** fatal: the USB connection is unusable, the device must be re-attached. */
  readonly fatal: boolean;

  constructor(message: string, code: ProbeErrorCode = 'USB_IO', fatal = false) {
    super(message);
    this.name = 'ProbeError';
    this.code = code;
    this.fatal = fatal;
  }

  static from(e: unknown, fallback: ProbeErrorCode = 'USB_IO'): ProbeError {
    if (e instanceof ProbeError) return e;
    const message = e instanceof Error ? e.message : String(e);
    // WebUSB DOMException texts that mean "device gone" – treat as fatal.
    const fatal = /unavailable|disconnected|not found|no device|NetworkError|InvalidStateError|device was disconnected/i.test(message);
    return new ProbeError(message, fatal ? 'NO_DEVICE' : fallback, fatal);
  }
}

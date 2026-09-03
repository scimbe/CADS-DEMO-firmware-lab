/* deviceLock.ts – one exclusive claim on the board per browser profile.
 *
 * WebUSB is exclusive per browser *process*, but the failure it produces when a second lab tab
 * tries to open the same ST-Link is a bare DOMException that reads like a hardware fault. A Web
 * Lock, which is shared across every tab and worker of one profile, lets us find out *before*
 * touching USB that another tab owns the board, and say so in words a student can act on.
 *
 * The lock is held for as long as the device is open: `navigator.locks.request()` keeps the lock
 * until the callback's promise settles, so the callback parks on a promise we resolve in
 * release(). Available in workers, which is where this driver runs.
 */

export interface LockInfoLike {
  name?: string;
  clientId?: string;
  mode?: string;
}

export interface LockManagerLike {
  request(
    name: string,
    options: { mode?: 'exclusive' | 'shared'; ifAvailable?: boolean; signal?: AbortSignal },
    callback: (lock: unknown) => Promise<unknown>,
  ): Promise<unknown>;
  query(): Promise<{ held?: LockInfoLike[]; pending?: LockInfoLike[] }>;
}

/** Stable per-device name so two tabs contend on the same board, not merely on "a board". */
export function deviceLockName(vendorId: number, productId: number, serialNumber?: string): string {
  const sn = (serialNumber ?? 'unknown').replace(/[^A-Za-z0-9]/g, '');
  return `cads-board-${vendorId}-${productId}-${sn}`;
}

export class DeviceLock {
  private release: (() => void) | null = null;
  private lockName: string | null = null;

  constructor(private readonly locks: LockManagerLike | undefined) {}

  get available(): boolean {
    return typeof this.locks?.request === 'function';
  }

  get held(): boolean {
    return this.release !== null;
  }

  get name(): string | null {
    return this.lockName;
  }

  /** True when some *other* context of this profile holds the lock for that device. */
  async heldElsewhere(name: string): Promise<boolean> {
    if (!this.locks?.query) return false;
    if (this.lockName === name && this.release) return false; // we are the holder
    try {
      const state = await this.locks.query();
      return (state.held ?? []).some((l) => l.name === name);
    } catch {
      return false;
    }
  }

  /**
   * Take the lock without waiting. Resolves false when another context already holds it –
   * `ifAvailable` makes that check and the acquisition one atomic step, so two tabs racing to
   * connect cannot both conclude the board is free.
   */
  async acquire(name: string): Promise<boolean> {
    if (!this.locks) return true; // no Web Locks: fall back to the raw USB error
    if (this.release) {
      if (this.lockName === name) return true;
      this.releaseNow();
    }
    let granted = false;
    let ready: () => void;
    const acquired = new Promise<void>((r) => (ready = r));
    void this.locks
      .request(name, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
        if (!lock) {
          ready();
          return;
        }
        granted = true;
        this.lockName = name;
        await new Promise<void>((resolveHold) => {
          this.release = () => {
            this.release = null;
            this.lockName = null;
            resolveHold();
          };
          ready();
        });
      })
      .catch(() => ready());
    await acquired;
    return granted;
  }

  /** Give the board back to the profile. Safe to call when nothing is held. */
  releaseNow(): void {
    this.release?.();
  }
}

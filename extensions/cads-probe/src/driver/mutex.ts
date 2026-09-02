/* mutex.ts – promise-chain mutex serialising every probe operation.
 *
 * Replaces mutex.js of devanlai/webstlink (MIT, Copyright Devan Lai 2017): the original had a
 * lock()/unlock() pair that was easy to misuse (the CADS fix for detach() was exactly a missing
 * `await lock()`). runExclusive() makes forgetting the unlock impossible.
 */

export class Mutex {
  private tail: Promise<void> = Promise.resolve();
  private depth = 0;

  /** True while some task holds the mutex. */
  get locked(): boolean {
    return this.depth > 0;
  }

  runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    const prev = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    return prev.then(async () => {
      this.depth++;
      try {
        return await fn();
      } finally {
        this.depth--;
        release();
      }
    });
  }
}

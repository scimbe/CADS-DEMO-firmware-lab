/* serial.ts – WebSerial console (VCP of the ST-Link V2-1). No DOM / VS Code dependencies. */

import { ProbeError } from './errors';
import { type Logger, nullLogger } from './logger';

/** Structural subset of WebSerial's SerialPort for mocking. */
export interface SerialPortLike {
  getInfo(): { usbVendorId?: number; usbProductId?: number };
  open(options: { baudRate: number; bufferSize?: number }): Promise<void>;
  close(): Promise<void>;
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
}

export interface SerialSink {
  onData(data: Uint8Array): void;
  onClose(error?: string): void;
}

export class SerialConsole {
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private opened = false;
  private closing = false;
  private readLoop: Promise<void> | null = null;

  constructor(
    readonly port: SerialPortLike,
    private readonly sink: SerialSink,
    private readonly log: Logger = nullLogger,
  ) {}

  get isOpen(): boolean {
    return this.opened;
  }

  async open(baudRate: number): Promise<void> {
    if (this.opened) return;
    try {
      await this.port.open({ baudRate, bufferSize: 4096 });
    } catch (e) {
      throw new ProbeError(`serial open failed: ${e instanceof Error ? e.message : String(e)}`, 'USB_IO');
    }
    if (!this.port.readable || !this.port.writable) {
      await this.port.close().catch(() => undefined);
      throw new ProbeError('serial port has no readable/writable stream', 'USB_IO');
    }
    this.opened = true;
    this.closing = false;
    this.writer = this.port.writable.getWriter();
    this.readLoop = this.runReadLoop();
  }

  private async runReadLoop(): Promise<void> {
    let error: string | undefined;
    try {
      while (this.opened && !this.closing && this.port.readable) {
        const stream = this.port.readable;
        this.reader = stream.getReader();
        try {
          for (;;) {
            const { value, done } = await this.reader.read();
            if (done) break;
            if (value && value.length) this.sink.onData(value);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (this.closing) break;
          // WebSerial: a non-fatal error (framing/parity/overrun) errors the current stream and
          // the port exposes a fresh `readable`; a lost device leaves it null or unchanged.
          if (this.port.readable && this.port.readable !== stream) {
            this.log.warn(`serial read error (continuing): ${msg}`);
            continue;
          }
          error = msg;
          break;
        } finally {
          try {
            this.reader?.releaseLock();
          } catch {
            // ignore
          }
          this.reader = null;
        }
      }
    } finally {
      const wasOpen = this.opened;
      this.opened = false;
      try {
        await this.writer?.close().catch(() => undefined);
        this.writer?.releaseLock();
      } catch {
        // ignore
      }
      this.writer = null;
      try {
        await this.port.close();
      } catch {
        // ignore – port may already be gone
      }
      if (wasOpen) this.sink.onClose(error);
    }
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.opened || !this.writer) throw new ProbeError('serial port is not open', 'NO_DEVICE');
    await this.writer.write(data);
  }

  async close(): Promise<void> {
    if (!this.opened) return;
    this.closing = true;
    try {
      await this.reader?.cancel();
    } catch {
      // ignore
    }
    if (this.readLoop) await this.readLoop.catch(() => undefined);
    this.readLoop = null;
  }
}

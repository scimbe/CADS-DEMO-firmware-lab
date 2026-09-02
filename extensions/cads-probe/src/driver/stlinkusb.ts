/* stlinkusb.ts – low-level ST-Link USB transport over WebUSB.
 *
 * Copyright Devan Lai 2017 (webstlink, MIT) – ported from lib/stlinkusb.py in the pystlink
 * project, Copyright Pavel Revak 2015. TypeScript port for the CaDS Firmware Lab (2026):
 * every transfer carries a timeout, fatal errors poison the connector, no DOM dependencies.
 */

import { ProbeError } from './errors';
import { type Logger, nullLogger } from './logger';
import { hexBytes, withTimeout } from './util';

const STLINK_CMD_SIZE_V2 = 16;

export interface StlinkDeviceType {
  version: 'V2' | 'V2-1' | 'V3';
  idVendor: number;
  idProduct: number;
  outPipe: number;
  inPipe: number;
}

export const DEV_TYPES: readonly StlinkDeviceType[] = [
  { version: 'V2', idVendor: 0x0483, idProduct: 0x3748, outPipe: 0x02, inPipe: 0x81 },
  { version: 'V2-1', idVendor: 0x0483, idProduct: 0x374b, outPipe: 0x01, inPipe: 0x81 },
  { version: 'V2-1', idVendor: 0x0483, idProduct: 0x3752, outPipe: 0x01, inPipe: 0x81 }, // V2-1 no MSD
  { version: 'V3', idVendor: 0x0483, idProduct: 0x374e, outPipe: 0x01, inPipe: 0x81 },
  { version: 'V3', idVendor: 0x0483, idProduct: 0x374f, outPipe: 0x01, inPipe: 0x81 },
  { version: 'V3', idVendor: 0x0483, idProduct: 0x3753, outPipe: 0x01, inPipe: 0x81 },
  { version: 'V3', idVendor: 0x0483, idProduct: 0x3754, outPipe: 0x01, inPipe: 0x81 },
];

/** WebUSB filters for the chooser / getDevices() matching. */
export const USB_FILTERS = DEV_TYPES.map((t) => ({ vendorId: t.idVendor, productId: t.idProduct }));

/** Structural subset of WebUSB's USBDevice so the driver can be driven by a mock in tests. */
export interface UsbDeviceLike {
  readonly vendorId: number;
  readonly productId: number;
  readonly serialNumber?: string | undefined;
  readonly productName?: string | undefined;
  readonly opened: boolean;
  readonly configuration: {
    readonly configurationValue: number;
    readonly interfaces: readonly {
      readonly interfaceNumber: number;
      readonly claimed: boolean;
      readonly alternate: { readonly alternateSetting: number } | null;
    }[];
  } | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(value: number): Promise<void>;
  claimInterface(index: number): Promise<void>;
  releaseInterface(index: number): Promise<void>;
  selectAlternateInterface(index: number, alternate: number): Promise<void>;
  transferIn(endpoint: number, length: number): Promise<{ status?: string; data?: DataView }>;
  transferOut(endpoint: number, data: Uint8Array): Promise<{ status?: string; bytesWritten: number }>;
}

export interface XferOptions {
  data?: Uint8Array;
  rxLen?: number;
  retry?: number;
  timeoutMs?: number;
}

export function matchDeviceType(vendorId: number, productId: number): StlinkDeviceType | undefined {
  return DEV_TYPES.find((t) => t.idVendor === vendorId && t.idProduct === productId);
}

export class UsbConnector {
  private readonly devType: StlinkDeviceType;
  private xferCounter = 0;
  private broken = false;
  /** Default per-transfer timeout. Flash sector erases are polled with many short transfers. */
  readonly defaultTimeoutMs: number;

  constructor(
    readonly device: UsbDeviceLike,
    private readonly log: Logger = nullLogger,
    defaultTimeoutMs = 2000,
  ) {
    const t = matchDeviceType(device.vendorId, device.productId);
    if (!t) {
      throw new ProbeError(
        `Unknown ST-Link type ${device.vendorId.toString(16)}:${device.productId.toString(16)}`,
        'UNSUPPORTED',
      );
    }
    this.devType = t;
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  get version(): string {
    return this.devType.version;
  }

  get transferCount(): number {
    return this.xferCounter;
  }

  get isBroken(): boolean {
    return this.broken;
  }

  async connect(): Promise<void> {
    try {
      if (!this.device.opened) await this.device.open();
      if (this.device.configuration === null || this.device.configuration.configurationValue !== 1) {
        await this.device.selectConfiguration(1);
      }
      const intf = this.device.configuration?.interfaces[0];
      if (!intf?.claimed) await this.device.claimInterface(0);
      if (intf && (intf.alternate === null || intf.alternate.alternateSetting !== 0)) {
        await this.device.selectAlternateInterface(0, 0);
      }
      this.broken = false;
    } catch (e) {
      throw ProbeError.from(e, 'NO_DEVICE');
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.device.opened) {
        try {
          await this.device.releaseInterface(0);
        } catch {
          // ignore – close() releases anyway
        }
        await this.device.close();
      }
    } catch (e) {
      this.log.debug(`disconnect: ${String(e)}`);
    }
  }

  private async write(data: Uint8Array, timeoutMs: number): Promise<void> {
    this.log.debug(`USB > ${hexBytes(data)}`);
    this.xferCounter++;
    let result: { status?: string; bytesWritten: number };
    try {
      result = await withTimeout(this.device.transferOut(this.devType.outPipe, data), timeoutMs, 'transferOut');
      if (result.status !== 'ok') throw new ProbeError(`transferOut status ${String(result.status)}`, 'USB_IO');
    } catch (e) {
      const err = ProbeError.from(e);
      if (err.fatal) this.broken = true;
      throw err;
    }
    if (result.bytesWritten !== data.length) {
      throw new ProbeError(`only ${result.bytesWritten} of ${data.length} bytes transmitted to ST-Link`, 'USB_IO');
    }
  }

  private async read(size: number, timeoutMs: number): Promise<DataView> {
    let readSize = size;
    if (readSize < 64) readSize = 64;
    else if (readSize % 4) readSize = (readSize + 3) & ~3;
    let result: { status?: string; data?: DataView };
    try {
      result = await withTimeout(this.device.transferIn(this.devType.inPipe & 0x7f, readSize), timeoutMs, 'transferIn');
      if (result.status !== 'ok' || !result.data) {
        throw new ProbeError(`transferIn status ${String(result.status)}`, 'USB_IO');
      }
    } catch (e) {
      const err = ProbeError.from(e);
      if (err.fatal) this.broken = true;
      throw err;
    }
    const data = result.data;
    this.log.debug(`USB < ${hexBytes(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))}`);
    if (data.byteLength > size) return new DataView(data.buffer, data.byteOffset, size);
    return data;
  }

  /** Send one 16-byte ST-Link command, optional payload, optional reply. */
  async xfer(cmd: ArrayLike<number>, opts: XferOptions = {}): Promise<DataView | undefined> {
    if (this.broken) throw new ProbeError('USB connection is broken – reconnect the probe', 'NO_DEVICE', true);
    if (cmd.length > STLINK_CMD_SIZE_V2) {
      throw new ProbeError(`command too long: ${cmd.length} > ${STLINK_CMD_SIZE_V2}`, 'UNSUPPORTED');
    }
    const timeoutMs = opts.timeoutMs ?? this.defaultTimeoutMs;
    const buf = new Uint8Array(STLINK_CMD_SIZE_V2);
    buf.set(Array.from(cmd));
    let retry = opts.retry ?? 0;
    for (;;) {
      try {
        await this.write(buf, timeoutMs);
        if (opts.data) await this.write(opts.data, timeoutMs);
        if (opts.rxLen) return await this.read(opts.rxLen, timeoutMs);
        return undefined;
      } catch (e) {
        const err = ProbeError.from(e);
        if (!err.fatal && retry > 0) {
          this.log.debug(`retrying xfer after ${err.message}`);
          retry--;
          continue;
        }
        throw err;
      }
    }
  }
}

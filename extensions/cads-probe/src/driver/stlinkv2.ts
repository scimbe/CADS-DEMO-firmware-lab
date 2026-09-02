/* stlinkv2.ts – ST-Link/V2 (API v2) command layer.
 *
 * Copyright Devan Lai 2017 (webstlink, MIT) – ported from lib/stlinkv2.py in the pystlink
 * project, Copyright Pavel Revak 2015. TypeScript port for the CaDS Firmware Lab (2026) with
 * additions taken from the stlink-org protocol description: READALLREGS (API v2, 88-byte
 * reply), GETLASTRWSTATUS/2, DRIVE_NRST.
 */

import { ProbeError } from './errors';
import { type Logger, nullLogger } from './logger';
import type { UsbConnector } from './stlinkusb';

const STLINK_GET_VERSION = 0xf1;
const STLINK_DEBUG_COMMAND = 0xf2;
const STLINK_DFU_COMMAND = 0xf3;
const STLINK_SWIM_COMMAND = 0xf4;
const STLINK_GET_CURRENT_MODE = 0xf5;
const STLINK_GET_TARGET_VOLTAGE = 0xf7;

const STLINK_MODE_DFU = 0x00;
const STLINK_MODE_DEBUG = 0x02;
const STLINK_MODE_SWIM = 0x03;

const STLINK_DFU_EXIT = 0x07;
const STLINK_SWIM_EXIT = 0x01;

const STLINK_DEBUG_EXIT = 0x21;
const STLINK_DEBUG_READCOREID = 0x22;
const STLINK_DEBUG_READMEM_32BIT = 0x07;
const STLINK_DEBUG_WRITEMEM_32BIT = 0x08;
const STLINK_DEBUG_READMEM_8BIT = 0x0c;
const STLINK_DEBUG_WRITEMEM_8BIT = 0x0d;
const STLINK_DEBUG_APIV2_ENTER = 0x30;
const STLINK_DEBUG_APIV2_RESETSYS = 0x32;
const STLINK_DEBUG_APIV2_READREG = 0x33;
const STLINK_DEBUG_APIV2_WRITEREG = 0x34;
const STLINK_DEBUG_APIV2_WRITEDEBUGREG = 0x35;
const STLINK_DEBUG_APIV2_READDEBUGREG = 0x36;
const STLINK_DEBUG_APIV2_READALLREGS = 0x3a;
const STLINK_DEBUG_APIV2_GETLASTRWSTATUS = 0x3b;
const STLINK_DEBUG_APIV2_DRIVE_NRST = 0x3c;
const STLINK_DEBUG_APIV2_GETLASTRWSTATUS2 = 0x3e;
const STLINK_DEBUG_APIV2_SWD_SET_FREQ = 0x43;
const STLINK_DEBUG_ENTER_SWD = 0xa3;

export const STLINK_MAXIMUM_TRANSFER_SIZE = 1024;

const SWD_FREQ_MAP: readonly [number, number][] = [
  [4000000, 0],
  [1800000, 1],
  [1200000, 2],
  [950000, 3],
  [480000, 7],
  [240000, 15],
  [125000, 31],
  [100000, 40],
  [50000, 79],
  [25000, 158],
  [15000, 265],
  [5000, 798],
];

export type NrstState = 'low' | 'high' | 'pulse';

export class Stlink {
  private verStlink = 0;
  private verJtag = 0;
  private verSwim: number | null = null;
  private verMass: number | null = null;
  private verApi = 0;
  private verStr = '';
  private targetVoltage: number | null = null;
  private coreId = 0;

  constructor(
    readonly connector: UsbConnector,
    private readonly log: Logger = nullLogger,
  ) {}

  get versionString(): string {
    return this.verStr;
  }
  get jtagVersion(): number {
    return this.verJtag;
  }
  get voltage(): number | null {
    return this.targetVoltage;
  }
  get coreid(): number {
    return this.coreId;
  }
  get maximumTransferSize(): number {
    return STLINK_MAXIMUM_TRANSFER_SIZE;
  }

  async init(swdFrequency = 1800000): Promise<void> {
    await this.readVersion();
    await this.leaveState();
    await this.readTargetVoltage();
    if (this.verJtag >= 22) await this.setSwdFreq(swdFrequency);
    await this.enterDebugSwd();
    await this.readCoreId();
  }

  /** macOS quirk (pystlink): the number of reads from the ST-Link must be even before closing. */
  async cleanExit(): Promise<void> {
    if (this.connector.transferCount & 1) {
      await this.connector.xfer([STLINK_GET_CURRENT_MODE], { rxLen: 2 });
    }
  }

  async readVersion(): Promise<void> {
    const rx = await this.connector.xfer([STLINK_GET_VERSION, 0x80], { rxLen: 6, retry: 2 });
    const ver = rx!.getUint16(0);
    const devVer = this.connector.version;
    this.verStlink = (ver >> 12) & 0x0f;
    this.verJtag = (ver >> 6) & 0x3f;
    this.verSwim = devVer === 'V2' ? ver & 0x3f : null;
    this.verMass = devVer === 'V2-1' ? ver & 0x3f : null;
    this.verApi = this.verJtag > 11 ? 2 : 1;
    this.verStr = `${devVer} V${this.verStlink}J${this.verJtag}`;
    if (this.verSwim !== null) this.verStr += `S${this.verSwim}`;
    if (this.verMass !== null) this.verStr += `M${this.verMass}`;
    if (this.verApi === 1) {
      throw new ProbeError(`ST-Link/${this.verStr} is not supported, please upgrade its firmware`, 'UNSUPPORTED');
    }
    if (this.verJtag < 21) {
      this.log.warn(`ST-Link/${this.verStr} firmware is old – functionality is not guaranteed`);
    }
  }

  async readTargetVoltage(): Promise<number | null> {
    const rx = await this.connector.xfer([STLINK_GET_TARGET_VOLTAGE], { rxLen: 8 });
    const a0 = rx!.getUint32(0, true);
    const a1 = rx!.getUint32(4, true);
    this.targetVoltage = a0 !== 0 ? (2 * a1 * 1.2) / a0 : null;
    return this.targetVoltage;
  }

  async readCoreId(): Promise<number> {
    const rx = await this.connector.xfer([STLINK_DEBUG_COMMAND, STLINK_DEBUG_READCOREID], { rxLen: 4 });
    this.coreId = rx!.getUint32(0, true);
    return this.coreId;
  }

  async leaveState(): Promise<void> {
    const rx = await this.connector.xfer([STLINK_GET_CURRENT_MODE], { rxLen: 2 });
    const state = rx!.getUint8(0);
    if (state === STLINK_MODE_DFU) {
      this.log.debug('leaving state DFU');
      await this.connector.xfer([STLINK_DFU_COMMAND, STLINK_DFU_EXIT]);
    } else if (state === STLINK_MODE_DEBUG) {
      this.log.debug('leaving state DEBUG');
      await this.connector.xfer([STLINK_DEBUG_COMMAND, STLINK_DEBUG_EXIT]);
    } else if (state === STLINK_MODE_SWIM) {
      this.log.debug('leaving state SWIM');
      await this.connector.xfer([STLINK_SWIM_COMMAND, STLINK_SWIM_EXIT]);
    }
  }

  async setSwdFreq(freq = 1800000): Promise<void> {
    for (const [f, divisor] of SWD_FREQ_MAP) {
      if (freq >= f) {
        const rx = await this.connector.xfer([STLINK_DEBUG_COMMAND, STLINK_DEBUG_APIV2_SWD_SET_FREQ, divisor], { rxLen: 2 });
        if (rx!.getUint8(0) !== 0x80) throw new ProbeError('error switching SWD frequency', 'USB_IO');
        this.log.debug(`SWD frequency ${f} Hz`);
        return;
      }
    }
    throw new ProbeError('selected SWD frequency is too low', 'UNSUPPORTED');
  }

  async enterDebugSwd(): Promise<void> {
    await this.connector.xfer([STLINK_DEBUG_COMMAND, STLINK_DEBUG_APIV2_ENTER, STLINK_DEBUG_ENTER_SWD], { rxLen: 2 });
    this.log.debug('entered SWD debug mode');
  }

  async exitDebug(): Promise<void> {
    await this.connector.xfer([STLINK_DEBUG_COMMAND, STLINK_DEBUG_EXIT]);
  }

  /** ST-Link-side system reset (SYSRESETREQ via the probe). Prefer CortexM.resetHalt/resetRun. */
  async debugResetSys(): Promise<void> {
    await this.connector.xfer([STLINK_DEBUG_COMMAND, STLINK_DEBUG_APIV2_RESETSYS], { rxLen: 2 });
  }

  /** Drive the NRST pin (hardware reset line). */
  async driveNrst(state: NrstState): Promise<void> {
    const v = state === 'low' ? 0 : state === 'high' ? 1 : 2;
    await this.connector.xfer([STLINK_DEBUG_COMMAND, STLINK_DEBUG_APIV2_DRIVE_NRST, v], { rxLen: 2 });
  }

  /** Result of the last memory transfer; 0x80 means OK. */
  async getLastRwStatus(): Promise<number> {
    if (this.verJtag >= 26) {
      const rx = await this.connector.xfer([STLINK_DEBUG_COMMAND, STLINK_DEBUG_APIV2_GETLASTRWSTATUS2], { rxLen: 12 });
      return rx!.getUint8(0);
    }
    const rx = await this.connector.xfer([STLINK_DEBUG_COMMAND, STLINK_DEBUG_APIV2_GETLASTRWSTATUS], { rxLen: 2 });
    return rx!.getUint8(0);
  }

  async setDebugReg32(addr: number, data: number): Promise<void> {
    if (addr % 4) throw new ProbeError('setDebugReg32: address must be word aligned', 'UNSUPPORTED');
    const cmd = new Uint8Array(10);
    const view = new DataView(cmd.buffer);
    view.setUint8(0, STLINK_DEBUG_COMMAND);
    view.setUint8(1, STLINK_DEBUG_APIV2_WRITEDEBUGREG);
    view.setUint32(2, addr >>> 0, true);
    view.setUint32(6, data >>> 0, true);
    await this.connector.xfer(cmd, { rxLen: 2 });
  }

  async getDebugReg32(addr: number): Promise<number> {
    if (addr % 4) throw new ProbeError('getDebugReg32: address must be word aligned', 'UNSUPPORTED');
    const cmd = new Uint8Array(6);
    const view = new DataView(cmd.buffer);
    view.setUint8(0, STLINK_DEBUG_COMMAND);
    view.setUint8(1, STLINK_DEBUG_APIV2_READDEBUGREG);
    view.setUint32(2, addr >>> 0, true);
    const rx = await this.connector.xfer(cmd, { rxLen: 8 });
    return rx!.getUint32(4, true);
  }

  async getDebugReg16(addr: number): Promise<number> {
    if (addr % 2) throw new ProbeError('getDebugReg16: address must be halfword aligned', 'UNSUPPORTED');
    let val = await this.getDebugReg32(addr & 0xfffffffc);
    if (addr % 4) val >>>= 16;
    return val & 0xffff;
  }

  /** Core register via the ST-Link register API (0..15 = r0..r15, 16 = xPSR, 17 = MSP, 18 = PSP). */
  async getReg(reg: number): Promise<number> {
    const rx = await this.connector.xfer([STLINK_DEBUG_COMMAND, STLINK_DEBUG_APIV2_READREG, reg], { rxLen: 8 });
    return rx!.getUint32(4, true);
  }

  async setReg(reg: number, data: number): Promise<void> {
    const cmd = new Uint8Array(7);
    const view = new DataView(cmd.buffer);
    view.setUint8(0, STLINK_DEBUG_COMMAND);
    view.setUint8(1, STLINK_DEBUG_APIV2_WRITEREG);
    view.setUint8(2, reg);
    view.setUint32(3, data >>> 0, true);
    await this.connector.xfer(cmd, { rxLen: 2 });
  }

  /** r0..r15, xPSR, MSP, PSP, RW, RW2 (21 words) in one transfer. */
  async getAllRegs(): Promise<number[]> {
    const rx = await this.connector.xfer([STLINK_DEBUG_COMMAND, STLINK_DEBUG_APIV2_READALLREGS], { rxLen: 88 });
    const out: number[] = [];
    for (let i = 0; i < 21; i++) out.push(rx!.getUint32(4 + i * 4, true));
    return out;
  }

  async getMem32(addr: number, size: number): Promise<Uint8Array> {
    if (addr % 4) throw new ProbeError('getMem32: address must be word aligned', 'UNSUPPORTED');
    if (size % 4) throw new ProbeError('getMem32: size must be a multiple of 4', 'UNSUPPORTED');
    if (size > STLINK_MAXIMUM_TRANSFER_SIZE) throw new ProbeError(`getMem32: size ${size} > ${STLINK_MAXIMUM_TRANSFER_SIZE}`, 'UNSUPPORTED');
    const cmd = new Uint8Array(10);
    const view = new DataView(cmd.buffer);
    view.setUint8(0, STLINK_DEBUG_COMMAND);
    view.setUint8(1, STLINK_DEBUG_READMEM_32BIT);
    view.setUint32(2, addr >>> 0, true);
    view.setUint32(6, size, true);
    const rx = await this.connector.xfer(cmd, { rxLen: size });
    return new Uint8Array(rx!.buffer.slice(rx!.byteOffset, rx!.byteOffset + size));
  }

  async setMem32(addr: number, data: Uint8Array): Promise<void> {
    if (addr % 4) throw new ProbeError('setMem32: address must be word aligned', 'UNSUPPORTED');
    if (data.length % 4) throw new ProbeError('setMem32: size must be a multiple of 4', 'UNSUPPORTED');
    if (data.length > STLINK_MAXIMUM_TRANSFER_SIZE) throw new ProbeError(`setMem32: size ${data.length} > ${STLINK_MAXIMUM_TRANSFER_SIZE}`, 'UNSUPPORTED');
    const cmd = new Uint8Array(10);
    const view = new DataView(cmd.buffer);
    view.setUint8(0, STLINK_DEBUG_COMMAND);
    view.setUint8(1, STLINK_DEBUG_WRITEMEM_32BIT);
    view.setUint32(2, addr >>> 0, true);
    view.setUint32(6, data.length, true);
    await this.connector.xfer(cmd, { data });
  }

  async getMem8(addr: number, size: number): Promise<Uint8Array> {
    if (size > 64) throw new ProbeError(`getMem8: size ${size} > 64`, 'UNSUPPORTED');
    const cmd = new Uint8Array(10);
    const view = new DataView(cmd.buffer);
    view.setUint8(0, STLINK_DEBUG_COMMAND);
    view.setUint8(1, STLINK_DEBUG_READMEM_8BIT);
    view.setUint32(2, addr >>> 0, true);
    view.setUint32(6, size, true);
    const rx = await this.connector.xfer(cmd, { rxLen: size });
    return new Uint8Array(rx!.buffer.slice(rx!.byteOffset, rx!.byteOffset + size));
  }

  async setMem8(addr: number, data: Uint8Array): Promise<void> {
    if (data.length > 64) throw new ProbeError(`setMem8: size ${data.length} > 64`, 'UNSUPPORTED');
    const cmd = new Uint8Array(10);
    const view = new DataView(cmd.buffer);
    view.setUint8(0, STLINK_DEBUG_COMMAND);
    view.setUint8(1, STLINK_DEBUG_WRITEMEM_8BIT);
    view.setUint32(2, addr >>> 0, true);
    view.setUint32(6, data.length, true);
    await this.connector.xfer(cmd, { data });
  }
}

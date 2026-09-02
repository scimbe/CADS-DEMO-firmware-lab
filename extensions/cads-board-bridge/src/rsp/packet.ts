/* packet.ts – GDB Remote Serial Protocol framing: parser, encoder, hex helpers. Pure. */

export type RspItem =
  | { kind: 'packet'; payload: Buffer; checksumOk: boolean }
  | { kind: 'ack' }
  | { kind: 'nack' }
  | { kind: 'interrupt' };

/** Incremental parser for `$…#xx`, `+`, `-` and 0x03 (Ctrl-C). Handles run-length `*` and `}` escapes. */
export class PacketParser {
  private state: 'idle' | 'payload' | 'csum1' | 'csum2' = 'idle';
  private buf: number[] = [];
  private sum = 0;
  private csum = '';

  feed(data: Buffer): RspItem[] {
    const out: RspItem[] = [];
    for (const byte of data) {
      switch (this.state) {
        case 'idle':
          if (byte === 0x24) {
            this.state = 'payload';
            this.buf = [];
            this.sum = 0;
          } else if (byte === 0x2b) out.push({ kind: 'ack' });
          else if (byte === 0x2d) out.push({ kind: 'nack' });
          else if (byte === 0x03) out.push({ kind: 'interrupt' });
          break;
        case 'payload':
          if (byte === 0x23) {
            this.state = 'csum1';
            this.csum = '';
          } else {
            this.buf.push(byte);
            this.sum = (this.sum + byte) & 0xff;
          }
          break;
        case 'csum1':
          this.csum = String.fromCharCode(byte);
          this.state = 'csum2';
          break;
        case 'csum2': {
          this.csum += String.fromCharCode(byte);
          const expected = parseInt(this.csum, 16);
          out.push({ kind: 'packet', payload: unescapePayload(this.buf), checksumOk: expected === this.sum });
          this.state = 'idle';
          break;
        }
      }
    }
    return out;
  }
}

/** Undo `}` escaping and `*` run-length encoding. */
export function unescapePayload(bytes: number[]): Buffer {
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] as number;
    if (b === 0x7d && i + 1 < bytes.length) {
      out.push((bytes[++i] as number) ^ 0x20);
    } else if (b === 0x2a && out.length > 0 && i + 1 < bytes.length) {
      const n = (bytes[++i] as number) - 29;
      const last = out[out.length - 1] as number;
      for (let k = 0; k < n; k++) out.push(last);
    } else {
      out.push(b);
    }
  }
  return Buffer.from(out);
}

/** `$payload#xx` with `}` escaping of `#`, `$`, `}`, `*`. */
export function encodePacket(payload: Buffer | string): Buffer {
  const src = typeof payload === 'string' ? Buffer.from(payload, 'latin1') : payload;
  const body: number[] = [];
  let sum = 0;
  for (const b of src) {
    if (b === 0x23 || b === 0x24 || b === 0x7d || b === 0x2a) {
      body.push(0x7d, b ^ 0x20);
      sum = (sum + 0x7d + (b ^ 0x20)) & 0xff;
    } else {
      body.push(b);
      sum = (sum + b) & 0xff;
    }
  }
  return Buffer.concat([Buffer.from('$'), Buffer.from(body), Buffer.from(`#${sum.toString(16).padStart(2, '0')}`)]);
}

export function hexEncode(data: Uint8Array): string {
  return Buffer.from(data).toString('hex');
}

export function hexDecode(text: string): Buffer {
  return Buffer.from(text, 'hex');
}

/** 32-bit value as GDB register hex (target byte order, little endian). */
export function regToHex(value: number): string {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(value >>> 0, 0);
  return b.toString('hex');
}

export function hexToReg(hex: string): number {
  return Buffer.from(hex.padEnd(8, '0').slice(0, 8), 'hex').readUInt32LE(0);
}

export function parseHexInt(text: string): number {
  const v = parseInt(text, 16);
  if (Number.isNaN(v)) throw new Error(`bad hex number '${text}'`);
  return v >>> 0;
}

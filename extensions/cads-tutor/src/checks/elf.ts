/**
 * ELF32 symbol lookup for the `symbolInElf` check. Tries the toolchain's `nm` first
 * (CADS_ARM_TOOLCHAIN_BIN or PATH), then falls back to a small built-in ELF32 symbol-table
 * parser, which needs no external tool and is therefore the more robust path in the container.
 */
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export interface ElfSymbol {
  name: string;
  value: number;
  size: number;
  /** STT_* type: 0 NOTYPE, 1 OBJECT, 2 FUNC, 3 SECTION, 4 FILE */
  type: number;
  /** STB_* binding: 0 LOCAL, 1 GLOBAL, 2 WEAK */
  bind: number;
  shndx: number;
}

const SHT_SYMTAB = 2;
const SHT_STRTAB = 3;

/** Parses the .symtab of a 32-bit ELF file (little or big endian). Throws on malformed input. */
export function parseElf32Symbols(buf: Buffer): ElfSymbol[] {
  if (buf.length < 52 || buf.readUInt32BE(0) !== 0x7f454c46) throw new Error("not an ELF file");
  const elfClass = buf[4];
  if (elfClass !== 1) throw new Error(`unsupported ELF class ${elfClass} (only ELF32 is supported)`);
  const little = buf[5] === 1;
  const u16 = (o: number) => (little ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = (o: number) => (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o));

  const machine = u16(18);
  const isArm = machine === 40;
  const shoff = u32(32);
  const shentsize = u16(46);
  const shnum = u16(48);
  if (shoff === 0 || shnum === 0) throw new Error("ELF has no section headers (stripped?)");
  if (shoff + shnum * shentsize > buf.length) throw new Error("section header table out of bounds");

  interface Section { type: number; offset: number; size: number; link: number; entsize: number }
  const sections: Section[] = [];
  for (let i = 0; i < shnum; i++) {
    const o = shoff + i * shentsize;
    sections.push({ type: u32(o + 4), offset: u32(o + 16), size: u32(o + 20), link: u32(o + 24), entsize: u32(o + 36) });
  }

  const symbols: ElfSymbol[] = [];
  for (const sec of sections) {
    if (sec.type !== SHT_SYMTAB) continue;
    const strtab = sections[sec.link];
    if (!strtab || strtab.type !== SHT_STRTAB) throw new Error("symtab links to a non-string-table section");
    if (strtab.offset + strtab.size > buf.length) throw new Error("string table out of bounds");
    const entsize = sec.entsize || 16;
    const count = Math.floor(sec.size / entsize);
    if (sec.offset + count * entsize > buf.length) throw new Error("symbol table out of bounds");
    for (let i = 0; i < count; i++) {
      const o = sec.offset + i * entsize;
      const nameOff = u32(o);
      const value = u32(o + 4);
      const size = u32(o + 8);
      const info = buf[o + 12];
      const shndx = u16(o + 14);
      let name = "";
      if (nameOff < strtab.size) {
        const start = strtab.offset + nameOff;
        const end = buf.indexOf(0, start);
        name = buf.toString("utf8", start, end < 0 || end > strtab.offset + strtab.size ? strtab.offset + strtab.size : end);
      }
      const type = info & 0xf;
      // ARM/Thumb: bit 0 of a function address is the Thumb flag; nm prints it masked. Do the same.
      const address = isArm && type === 2 ? value & ~1 : value;
      symbols.push({ name, value: address >>> 0, size, type, bind: info >> 4, shndx });
    }
  }
  return symbols;
}

export function findSymbol(symbols: ElfSymbol[], name: string): ElfSymbol | undefined {
  // Prefer a defined (shndx != 0) symbol; accept undefined references only if nothing else matches.
  return symbols.find((s) => s.name === name && s.shndx !== 0) ?? symbols.find((s) => s.name === name);
}

function nmCandidates(env: NodeJS.ProcessEnv): string[] {
  const out: string[] = [];
  const bin = env.CADS_ARM_TOOLCHAIN_BIN;
  if (bin) out.push(path.join(bin, "arm-none-eabi-nm"));
  out.push("arm-none-eabi-nm");
  return out;
}

function runNm(nm: string, elf: string, env: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(nm, ["--defined-only", elf], { maxBuffer: 64 * 1024 * 1024, env }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

export interface SymbolLookupResult {
  found: boolean;
  /** Which mechanism answered: "nm" or "parser". */
  via: "nm" | "parser";
  address?: number;
  detail?: string;
}

/** Looks up `symbol` in `elfPath`. Uses nm when available, else the built-in parser. */
export async function lookupSymbol(elfPath: string, symbol: string, env: NodeJS.ProcessEnv = process.env): Promise<SymbolLookupResult> {
  if (!fs.existsSync(elfPath)) throw new Error(`ELF not found: ${elfPath}`);
  for (const nm of nmCandidates(env)) {
    try {
      const out = await runNm(nm, elfPath, env);
      const re = new RegExp(`^([0-9a-fA-F]+)\\s+[A-Za-z]\\s+${escapeRe(symbol)}$`, "m");
      const m = re.exec(out);
      return { found: !!m, via: "nm", address: m ? parseInt(m[1], 16) : undefined, detail: `nm (${nm})` };
    } catch {
      // try next candidate / fall back to parser
    }
  }
  const symbols = parseElf32Symbols(fs.readFileSync(elfPath));
  const s = findSymbol(symbols, symbol);
  return { found: !!s && s.shndx !== 0, via: "parser", address: s?.value, detail: `built-in ELF32 parser (${symbols.length} symbols)` };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

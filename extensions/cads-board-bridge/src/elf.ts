/* elf.ts – extract the flash image (LMA-based) from an ELF32 file, like `objcopy -O binary`.
 * Pure Node, no toolchain needed. Only PT_LOAD segments with file data are used.
 */

export interface ElfImage {
  addr: number;
  data: Buffer;
}

export function isElf(buf: Buffer): boolean {
  return buf.length >= 52 && buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46;
}

/** Contiguous image from the lowest to the highest loaded byte; gaps are filled with 0xff. */
export function elfToImage(buf: Buffer): ElfImage {
  if (!isElf(buf)) throw new Error('not an ELF file');
  if (buf[4] !== 1) throw new Error('only ELF32 is supported');
  const le = buf[5] === 1;
  const rd32 = (o: number): number => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const rd16 = (o: number): number => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const phoff = rd32(28);
  const phentsize = rd16(42);
  const phnum = rd16(44);
  const segments: { paddr: number; data: Buffer }[] = [];
  for (let i = 0; i < phnum; i++) {
    const o = phoff + i * phentsize;
    const type = rd32(o);
    if (type !== 1) continue; // PT_LOAD
    const offset = rd32(o + 4);
    const paddr = rd32(o + 12);
    const filesz = rd32(o + 16);
    if (filesz === 0) continue;
    segments.push({ paddr, data: buf.subarray(offset, offset + filesz) });
  }
  if (segments.length === 0) throw new Error('ELF has no loadable segments');
  segments.sort((a, b) => a.paddr - b.paddr);
  const start = segments[0]!.paddr;
  let end = start;
  for (const s of segments) end = Math.max(end, s.paddr + s.data.length);
  const image = Buffer.alloc(end - start, 0xff);
  for (const s of segments) s.data.copy(image, s.paddr - start);
  return { addr: start, data: image };
}

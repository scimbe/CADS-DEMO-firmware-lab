/* memoryRanges.ts – which addresses this board's core could plausibly be executing at.
 *
 * One fact, shared: flash, SRAM1+2+3 and CCM RAM are the only places code or a stack frame can
 * live on this chip. Previously duplicated as `isCacheable` in rsp/server.ts (memory-read
 * caching) and needed again for board.ts (PB-02: a `halted` event whose pc lands outside all
 * three is not a real halt report, it is a garbled read - DFSR's own address, 0xE000ED30,
 * showed up as a "pc" bit-identical across two runs). One definition, two callers.
 */
export const CODE_RANGES = [
  { start: 0x08000000, end: 0x08200000 }, // flash
  { start: 0x20000000, end: 0x20040000 }, // SRAM1+2+3
  { start: 0x10000000, end: 0x10010000 }, // CCM RAM
];

export function isPlausibleCodeAddress(addr: number): boolean {
  return CODE_RANGES.some((r) => addr >= r.start && addr < r.end);
}

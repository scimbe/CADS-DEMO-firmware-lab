/* targets.ts – target identification (CPUID part number → DBGMCU IDCODE → flash size).
 *
 * Subset of lib/stm32devices.js of devanlai/webstlink (MIT, Copyright Devan Lai 2017 /
 * pystlink Copyright Pavel Revak 2015): only the STM32F2/F4 sector-flash ("FS") families that
 * the CaDS lab can meet. Adding a family = adding an entry here.
 */

export interface TargetFamily {
  devId: number;
  name: string;
  flashSizeReg: number;
  /** Bank-1 sector sizes in bytes (sector n = eraseSizes[n]). */
  eraseSizes: number[];
  sramSize: number; // KB (largest variant; informational)
  ccmSize?: number; // KB
}

export interface TargetInfo {
  coreId: number;
  cpuid: number;
  partNo: number;
  coreName: string;
  chipId: number;
  devName: string;
  flashSize: number; // KB (from the flash-size register)
  sramSize: number; // KB
  eraseSizes: number[];
}

const F4_SECTORS = [16, 16, 16, 16, 64, 128, 128, 128, 128, 128, 128, 128].map((k) => k * 1024);

export const CORES: Record<number, string> = {
  0xc20: 'Cortex-M0',
  0xc60: 'Cortex-M0+',
  0xc21: 'Cortex-M1',
  0xc23: 'Cortex-M3',
  0xc24: 'Cortex-M4',
  0xc27: 'Cortex-M7',
  0xd21: 'Cortex-M33',
};

/** IDCODE register per core (DBGMCU_IDCODE). */
export const IDCODE_REG: Record<number, number> = {
  0xc23: 0xe0042000,
  0xc24: 0xe0042000,
  0xc27: 0xe0042000,
};

export const FAMILIES: TargetFamily[] = [
  { devId: 0x411, name: 'STM32F2xx', flashSizeReg: 0x1fff7a22, eraseSizes: F4_SECTORS, sramSize: 128 },
  { devId: 0x413, name: 'STM32F405/407/415/417', flashSizeReg: 0x1fff7a22, eraseSizes: F4_SECTORS, sramSize: 192, ccmSize: 64 },
  { devId: 0x419, name: 'STM32F42x/F43x', flashSizeReg: 0x1fff7a22, eraseSizes: F4_SECTORS, sramSize: 256, ccmSize: 64 },
  { devId: 0x421, name: 'STM32F446', flashSizeReg: 0x1fff7a22, eraseSizes: F4_SECTORS, sramSize: 128 },
  { devId: 0x423, name: 'STM32F401xB/C', flashSizeReg: 0x1fff7a22, eraseSizes: F4_SECTORS, sramSize: 64 },
  { devId: 0x431, name: 'STM32F411', flashSizeReg: 0x1fff7a22, eraseSizes: F4_SECTORS, sramSize: 128 },
  { devId: 0x433, name: 'STM32F401xD/E', flashSizeReg: 0x1fff7a22, eraseSizes: F4_SECTORS, sramSize: 96 },
  { devId: 0x434, name: 'STM32F469/479', flashSizeReg: 0x1fff7a22, eraseSizes: F4_SECTORS, sramSize: 384, ccmSize: 64 },
  { devId: 0x441, name: 'STM32F412', flashSizeReg: 0x1fff7a22, eraseSizes: F4_SECTORS, sramSize: 256 },
  { devId: 0x458, name: 'STM32F410', flashSizeReg: 0x1fff7a22, eraseSizes: F4_SECTORS, sramSize: 32 },
  { devId: 0x463, name: 'STM32F413/423', flashSizeReg: 0x1fff7a22, eraseSizes: F4_SECTORS, sramSize: 320 },
];

export function findFamily(devId: number): TargetFamily | undefined {
  return FAMILIES.find((f) => f.devId === devId);
}

/* Linker script for STM32F429ZI (Nucleo-F429ZI). Real specs per Maintainer cads zero's own
 * hardware (st-info --probe + build config), not assumed: 2048K flash across two contiguous
 * 1MB banks (bank1 0x08000000, bank2 0x08100000 -- contiguous in address space, so a single
 * FLASH region spanning both is fine for placement; bank boundaries matter for erase/program
 * granularity, not addressing), 192K main SRAM at 0x20000000. There is also a separate 64K CCM
 * (core-coupled) RAM at 0x10000000 with no DMA access -- unused by this minimal example, so it's
 * deliberately left out of this MEMORY map rather than declared and risk something landing there
 * that later needs DMA. */

MEMORY
{
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 2048K
    RAM (rwx)   : ORIGIN = 0x20000000, LENGTH = 192K
}

_estack = ORIGIN(RAM) + LENGTH(RAM);

SECTIONS
{
    .isr_vector :
    {
        KEEP(*(.isr_vector))
    } > FLASH

    .text :
    {
        *(.text*)
        *(.rodata*)
        _etext = .;
    } > FLASH

    .data : AT (_etext)
    {
        _sdata = .;
        *(.data*)
        _edata = .;
    } > RAM

    .bss :
    {
        _sbss = .;
        *(.bss*)
        *(COMMON)
        _ebss = .;
    } > RAM

    ._user_heap_stack (NOLOAD) :
    {
        . = . + 0x400; /* 1K minimum heap/stack headroom check */
    } > RAM
}

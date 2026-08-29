/* Minimal linker script for STM32F401RE (512K flash @ 0x08000000, 96K SRAM @ 0x20000000). */

MEMORY
{
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 512K
    RAM (rwx)   : ORIGIN = 0x20000000, LENGTH = 96K
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

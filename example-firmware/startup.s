/* Minimal Cortex-M4 startup for STM32F401RE: vector table + reset handler only.
 * No interrupts used by this example beyond reset -- every other vector points at a
 * spin-loop handler so an unexpected IRQ hangs visibly instead of jumping into garbage. */

.syntax unified
.cpu cortex-m4
.thumb

.global _start
.global Reset_Handler

.section .isr_vector, "a", %progbits
.word _estack
.word Reset_Handler
.word Default_Handler /* NMI */
.word Default_Handler /* HardFault */
.word Default_Handler /* MemManage */
.word Default_Handler /* BusFault */
.word Default_Handler /* UsageFault */
.word 0
.word 0
.word 0
.word 0
.word Default_Handler /* SVCall */
.word Default_Handler /* DebugMonitor */
.word 0
.word Default_Handler /* PendSV */
.word Default_Handler /* SysTick */

.section .text
.thumb_func
Default_Handler:
    b Default_Handler

.thumb_func
Reset_Handler:
    ldr r0, =_estack
    mov sp, r0

    /* copy .data from FLASH to RAM */
    ldr r0, =_sdata
    ldr r1, =_edata
    ldr r2, =_etext
copy_data_loop:
    cmp r0, r1
    bge copy_data_done
    ldr r3, [r2]
    str r3, [r0]
    adds r0, r0, #4
    adds r2, r2, #4
    b copy_data_loop
copy_data_done:

    /* zero .bss */
    ldr r0, =_sbss
    ldr r1, =_ebss
    movs r2, #0
zero_bss_loop:
    cmp r0, r1
    bge zero_bss_done
    str r2, [r0]
    adds r0, r0, #4
    b zero_bss_loop
zero_bss_done:

    bl main
    b Default_Handler

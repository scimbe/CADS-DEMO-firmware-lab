#include <stdint.h>

/* STM32F429ZI (Nucleo-F429ZI) register addresses -- direct register access, no HAL/CMSIS vendor
 * headers, so this container never needs to vendor ST's SDK.
 *
 * RCC_AHB1ENR and the GPIOB base address are the same across the whole STM32F4 family (F401,
 * F411, F429, ...) -- ST's CMSIS device headers use identical AHB1PERIPH_BASE/RCC_BASE macros for
 * every F4 part, GPIO ports are spaced 0x400 apart (GPIOA=0x40020000, GPIOB=0x40020400, ...), and
 * RCC_AHB1ENR's GPIOx-enable bits are enumerated in the same port order on every F4 part. That's
 * well-established public convention, not something independently re-derived from RM0090 in this
 * session -- flagged to Maintainer cads zero (real F429ZI hardware) to flash-verify against
 * RM0090 directly, per this project's own "verify against the datasheet" standard.
 *
 * Board note: the Nucleo-F429ZI is a Nucleo-144 board, NOT the smaller Nucleo-64 family (like the
 * F401RE this example originally targeted) -- its onboard LEDs are LD1 (green, PB0), LD2 (blue,
 * PB7), LD3 (red, PB14), not PA5. Using LD1/PB0 here.
 */
#define RCC_AHB1ENR (*(volatile uint32_t *)0x40023830)
#define GPIOB_MODER (*(volatile uint32_t *)0x40020400)
#define GPIOB_ODR   (*(volatile uint32_t *)0x40020414)

#define GPIOBEN (1U << 1)
#define LED_PIN 0U /* PB0 = Nucleo-F429ZI's onboard LD1 (green) */

static void delay(volatile uint32_t count) {
    while (count--) {
        __asm__("nop");
    }
}

int main(void) {
    RCC_AHB1ENR |= GPIOBEN;

    GPIOB_MODER &= ~(3U << (LED_PIN * 2));
    GPIOB_MODER |= (1U << (LED_PIN * 2)); /* mode 01 = general-purpose output */

    for (;;) {
        GPIOB_ODR ^= (1U << LED_PIN);
        /* Neither this code nor the reset handler touches RCC_CFGR/PLL, so both F401 and F429
         * boot on the same 16MHz HSI default here -- same delay count gives the same blink rate. */
        delay(400000);
    }
}

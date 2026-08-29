#include <stdint.h>

/* STM32F401RE (Nucleo-F401RE) register addresses, RM0368 -- direct register access, no HAL/CMSIS
 * vendor headers, so this container never needs to vendor ST's SDK. */
#define RCC_AHB1ENR (*(volatile uint32_t *)0x40023830)
#define GPIOA_MODER (*(volatile uint32_t *)0x40020000)
#define GPIOA_ODR   (*(volatile uint32_t *)0x40020014)

#define GPIOAEN (1U << 0)
#define LED_PIN 5U /* PA5 = Nucleo-F401RE's onboard LD2 */

static void delay(volatile uint32_t count) {
    while (count--) {
        __asm__("nop");
    }
}

int main(void) {
    RCC_AHB1ENR |= GPIOAEN;

    GPIOA_MODER &= ~(3U << (LED_PIN * 2));
    GPIOA_MODER |= (1U << (LED_PIN * 2)); /* mode 01 = general-purpose output */

    for (;;) {
        GPIOA_ODR ^= (1U << LED_PIN);
        delay(400000);
    }
}

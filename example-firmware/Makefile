CC      := arm-none-eabi-gcc
OBJCOPY := arm-none-eabi-objcopy
CFLAGS  := -mcpu=cortex-m4 -mthumb -O0 -g -ffreestanding -nostdlib -Wall -Wextra
LDFLAGS := -T linker.ld -nostdlib

BUILD := build

.PHONY: all clean flash

all: $(BUILD)/firmware.elf $(BUILD)/firmware.bin $(BUILD)/firmware.hex

$(BUILD):
	mkdir -p $(BUILD)

$(BUILD)/firmware.elf: startup.s main.c linker.ld | $(BUILD)
	$(CC) $(CFLAGS) $(LDFLAGS) startup.s main.c -o $@

$(BUILD)/firmware.bin: $(BUILD)/firmware.elf
	$(OBJCOPY) -O binary $< $@

$(BUILD)/firmware.hex: $(BUILD)/firmware.elf
	$(OBJCOPY) -O ihex $< $@

flash: $(BUILD)/firmware.elf
	openocd -f openocd.cfg -c "program $(BUILD)/firmware.elf verify reset exit"

clean:
	rm -rf $(BUILD)

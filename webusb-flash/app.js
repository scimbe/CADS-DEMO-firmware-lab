// firmware-lab's browser-native WebUSB flash app -- Connect, pick a .bin, Flash.
//
// Built on the vendored, hardware-verified `webstlink` fork in ./vendor/webstlink-src (see that
// directory's own header comments + the "CADS:" comments in stm32fs.js/webstlink.js for exactly
// what was fixed and why -- upstream devanlai/webstlink, MIT).

import * as libstlink from "./vendor/webstlink-src/lib/package.js";
import WebStlink from "./vendor/webstlink-src/webstlink.js";
import Dbg from "./vendor/webstlink-src/lib/dbg.js";

const FLASH_VERBOSITY = 2; // info + warning + error, not full debug spam

const statusEl = document.getElementById("status");
const connectBtn = document.getElementById("connect");
const disconnectBtn = document.getElementById("disconnect");
const fileInput = document.getElementById("file");
const flashBtn = document.getElementById("flash");
const addrInput = document.getElementById("addr");
const logEl = document.getElementById("log");

const logger = new Dbg(FLASH_VERBOSITY, logEl);

let stlink = null;
let device = null;

function setConnected(connected) {
  statusEl.textContent = connected ? "Connected" : "Not connected";
  statusEl.className = "badge " + (connected ? "on" : "off");
  connectBtn.textContent = connected ? "Reconnect" : "Connect";
  disconnectBtn.disabled = !connected;
  fileInput.disabled = !connected;
  flashBtn.disabled = !connected || !fileInput.files.length;
}

fileInput.addEventListener("change", () => {
  flashBtn.disabled = !stlink || !fileInput.files.length;
});

connectBtn.addEventListener("click", async () => {
  if (!navigator.usb) {
    logger.error("WebUSB is not available in this browser (needs Chrome/Edge over https:// or localhost).");
    return;
  }
  try {
    device = await navigator.usb.requestDevice({ filters: libstlink.usb.filters });
    logger.clear();
    const next = new WebStlink(logger);
    await next.attach(device, logger);
    stlink = next;
    logger.info("Connected.");
    setConnected(true);
  } catch (err) {
    logger.error(String(err));
  }
});

disconnectBtn.addEventListener("click", async () => {
  if (stlink) {
    await stlink.detach();
    stlink = null;
    device = null;
  }
  setConnected(false);
});

flashBtn.addEventListener("click", async () => {
  if (!stlink || !fileInput.files.length) return;
  const file = fileInput.files[0];
  const addr = parseInt(addrInput.value, 16);
  if (Number.isNaN(addr)) {
    logger.error(`Invalid flash address: ${addrInput.value}`);
    return;
  }

  flashBtn.disabled = true;
  try {
    const buf = await file.arrayBuffer();
    logger.info(`Flashing ${file.name} (${buf.byteLength} bytes) to ${addrInput.value}...`);
    await stlink.flash(addr, buf);
    logger.info("Flash complete.");
  } catch (err) {
    logger.error(String(err));
  } finally {
    flashBtn.disabled = !fileInput.files.length;
  }
});

setConnected(false);

#!/usr/bin/env bash
# setup-host-macos.sh – stop macOS from mounting the ST-Link's mass-storage volume.
#
# Why this exists: the NUCLEO's ST-Link exposes an MBED drive called NOD_F429ZI. macOS mounts it
# on every enumeration and writes metadata to it unasked (.Spotlight-V100, .fseventsd, ._ files).
# The ST-Link interprets writes to that drive as firmware for 0x08000000. That has corrupted a
# real flash image (a cleared bit in the vector table's initial-SP word) and is one of the
# documented ways the adapter ends up unusable mid-session.
#
# Unmounting after the fact is a race. This closes it: an fstab entry with `noauto` means the
# volume is never mounted automatically, and a Spotlight exclusion means nothing indexes it if it
# ever is mounted by hand.
#
# Everything here is reversible with --undo, and nothing runs without showing you the change first.
set -euo pipefail

LABEL="${CADS_MSD_LABEL:-NOD_F429ZI}"
FSTAB=/etc/fstab
ENTRY="LABEL=${LABEL} none msdos rw,noauto"
MODE=install
ASSUME_YES=0

usage() {
  cat <<USAGE
Usage: $0 [--undo] [--yes]

  (no flags)  add the fstab entry and the Spotlight exclusion for ${LABEL}
  --undo      remove both again
  --yes       do not ask for confirmation

Needs administrator rights (sudo) to edit ${FSTAB}. Check the result with:
  diskutil list external          # the disk is still there
  ls /Volumes                     # ${LABEL} is no longer mounted
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --undo) MODE=undo ;;
    --yes|-y) ASSUME_YES=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; usage; exit 2 ;;
  esac
done

[ "$(uname -s)" = "Darwin" ] || { echo "This script is for macOS. On Linux use scripts/60-cads-stlink.rules." >&2; exit 1; }

confirm() {
  [ "$ASSUME_YES" = "1" ] && return 0
  printf '%s [y/N] ' "$1"
  read -r reply </dev/tty || return 1
  case "$reply" in [yY]*) return 0 ;; *) return 1 ;; esac
}

has_entry() { [ -f "$FSTAB" ] && grep -qF "LABEL=${LABEL} " "$FSTAB"; }

if [ "$MODE" = install ]; then
  echo "About to make two changes:"
  echo "  1. append to ${FSTAB}:  ${ENTRY}"
  echo "  2. add /Volumes/${LABEL} to the Spotlight exclusion list"
  echo
  if has_entry; then
    echo "1. already present in ${FSTAB} – nothing to do."
  else
    confirm "Apply change 1 (needs sudo)?" || { echo "aborted."; exit 1; }
    # vifs is the supported editor for /etc/fstab; EDITOR lets us script it without a terminal UI.
    printf '%s\n' "$ENTRY" | sudo tee -a "$FSTAB" >/dev/null
    echo "1. added."
  fi

  if mdutil -s / >/dev/null 2>&1; then
    if confirm "Apply change 2 (Spotlight exclusion)?"; then
      sudo mdutil -i off "/Volumes/${LABEL}" >/dev/null 2>&1 || true
      /usr/bin/defaults write /Library/Preferences/com.apple.SpotlightServer.plist Exclusions -array-add "/Volumes/${LABEL}" 2>/dev/null || true
      echo "2. done (takes effect on the next mount)."
    fi
  fi

  echo
  echo "Unmount it once now if it is currently mounted:"
  if [ -d "/Volumes/${LABEL}" ]; then
    diskutil unmountDisk "/Volumes/${LABEL}" || true
  else
    echo "  (not mounted)"
  fi
  echo "Done. Replug the board and confirm that /Volumes/${LABEL} does not come back."
else
  if has_entry; then
    confirm "Remove the ${LABEL} line from ${FSTAB} (needs sudo)?" || { echo "aborted."; exit 1; }
    sudo /usr/bin/sed -i '' "/LABEL=${LABEL} /d" "$FSTAB"
    echo "removed from ${FSTAB}."
  else
    echo "no ${LABEL} line in ${FSTAB} – nothing to undo."
  fi
  sudo mdutil -i on "/Volumes/${LABEL}" >/dev/null 2>&1 || true
  echo "Spotlight indexing restored (where applicable). macOS will mount ${LABEL} again."
fi

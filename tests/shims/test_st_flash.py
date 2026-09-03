import tempfile
import unittest
from pathlib import Path

from shim_testcase import ShimTestCase, free_closed_port

OFFLINE = "Board-Bridge nicht aktiv – Board im Browser verbinden (CaDS Board Panel)"


class StFlashTests(ShimTestCase):
    shim = "st-flash"

    def setUp(self) -> None:
        super().setUp()
        self.tmp = Path(tempfile.mkdtemp(prefix="cads-shim-"))
        self.firmware = self.tmp / "cads-zero.bin"
        self.firmware.write_bytes(bytes(range(256)) * 4)

    def posts(self):
        return [(r.method, r.path) for r in self.bridge.requests]

    def test_write_posts_binary_to_flash_endpoint(self):
        result = self.run_shim("write", str(self.firmware), "0x08000000")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Flash written and verified", result.stdout)
        self.assertEqual(self.posts(), [("POST", "/flash?addr=0x08000000")])
        req = self.bridge.requests[0]
        self.assertEqual(req.body, self.firmware.read_bytes())
        self.assertEqual(req.headers.get("content-type"), "application/octet-stream")

    def test_write_accepts_decimal_and_other_bank_offsets(self):
        result = self.run_shim("write", str(self.firmware), "0x08004000")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.posts(), [("POST", "/flash?addr=0x08004000")])

    def test_write_with_reset_flag_resets_afterwards(self):
        result = self.run_shim("--reset", "write", str(self.firmware), "0x08000000")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.posts(), [("POST", "/flash?addr=0x08000000"), ("POST", "/reset")])

    def test_serial_option_is_ignored(self):
        result = self.run_shim(
            "--serial", "066FFF565282494867161033", "--reset", "write", str(self.firmware), "0x08000000"
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.posts(), [("POST", "/flash?addr=0x08000000"), ("POST", "/reset")])

    def test_serial_equals_form_and_connect_under_reset_are_ignored(self):
        result = self.run_shim("--serial=abc", "--connect-under-reset", "reset")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.posts(), [("POST", "/reset")])

    def test_reset_command(self):
        result = self.run_shim("reset")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.posts(), [("POST", "/reset")])
        self.assertIn("reset", result.stdout.lower())

    def test_erase_is_refused_without_touching_the_bridge(self):
        result = self.run_shim("erase")
        self.assertEqual(result.returncode, 1)
        self.assertIn("not permitted by CaDS lab policy", result.stderr)
        self.assertEqual(self.bridge.requests, [])

    def test_write_outside_firmware_bank_is_refused_locally(self):
        for addr in ("0x08100000", "0x20000000", "0x07FFFFF0"):
            with self.subTest(addr=addr):
                result = self.run_shim("write", str(self.firmware), addr)
                self.assertEqual(result.returncode, 1)
                self.assertIn("SAFETY", result.stderr)
        self.assertEqual(self.bridge.requests, [])

    def test_write_that_would_run_past_the_bank_is_refused(self):
        big = self.tmp / "big.bin"
        big.write_bytes(b"\xff" * 4096)
        result = self.run_shim("write", str(big), "0x080FF000")  # 4 KiB at 4 KiB before the end: ok
        self.assertEqual(result.returncode, 0, result.stderr)
        result = self.run_shim("write", str(big), "0x080FF001")  # one byte too far
        self.assertEqual(result.returncode, 1)
        self.assertEqual(len(self.bridge.requests), 1)

    def test_missing_file(self):
        result = self.run_shim("write", str(self.tmp / "nope.bin"), "0x08000000")
        self.assertEqual(result.returncode, 1)
        self.assertIn("cannot read", result.stderr)
        self.assertEqual(self.bridge.requests, [])

    def test_bridge_offline_gives_the_german_hint(self):
        url = f"http://127.0.0.1:{free_closed_port()}"
        for args in (("write", str(self.firmware), "0x08000000"), ("reset",)):
            with self.subTest(args=args):
                result = self.run_shim(*args, bridge_url=url)
                self.assertEqual(result.returncode, 1)
                self.assertIn(OFFLINE, result.stderr)

    def test_bridge_http_error_is_reported(self):
        self.bridge.script.set("/flash", 409, b'{"ok":false,"error":"core is running; halt first"}')
        result = self.run_shim("write", str(self.firmware), "0x08000000")
        self.assertEqual(result.returncode, 1)
        self.assertIn("core is running; halt first", result.stderr)

    def test_bridge_ok_false_in_200_body_is_a_failure(self):
        self.bridge.script.set("/flash", 200, b'{"ok":false,"error":"verify mismatch at 0x08000010"}')
        result = self.run_shim("--reset", "write", str(self.firmware), "0x08000000")
        self.assertEqual(result.returncode, 1)
        self.assertIn("verify mismatch", result.stderr)
        self.assertEqual(self.posts(), [("POST", "/flash?addr=0x08000000")])  # no reset after failure

    def test_bridge_plain_text_error_body(self):
        self.bridge.script.set("/reset", 503, b"probe not connected", "text/plain")
        result = self.run_shim("reset")
        self.assertEqual(result.returncode, 1)
        self.assertIn("probe not connected", result.stderr)

    def test_ihex_format_is_rejected(self):
        result = self.run_shim("--format", "ihex", "write", str(self.firmware), "0x08000000")
        self.assertEqual(result.returncode, 1)
        self.assertIn("binary only", result.stderr)

    def test_version_and_help(self):
        self.assertEqual(self.run_shim("--version").returncode, 0)
        self.assertIn("st-flash", self.run_shim("--version").stdout)
        self.assertEqual(self.run_shim("--help").returncode, 0)
        self.assertEqual(self.run_shim().returncode, 1)

    def test_unknown_command_and_read(self):
        self.assertEqual(self.run_shim("read", "out.bin", "0x08000000", "1024").returncode, 1)
        self.assertEqual(self.run_shim("frobnicate").returncode, 1)
        self.assertEqual(self.bridge.requests, [])


if __name__ == "__main__":
    unittest.main()

import unittest

from mock_bridge import PROBE_TEXT
from shim_testcase import ShimTestCase, free_closed_port

OFFLINE = "Board-Bridge nicht aktiv – Board im Browser verbinden (CaDS Board Panel)"


class StInfoTests(ShimTestCase):
    shim = "st-info"

    def test_probe_prints_bridge_output_verbatim(self):
        result = self.run_shim("--probe")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, PROBE_TEXT)
        self.assertEqual([(r.method, r.path) for r in self.bridge.requests], [("GET", "/probe")])

    def test_field_flags_parse_probe_output(self):
        expected = {
            "--serial": "066FFF565282494867161033",
            "--chipid": "0x419",
            "--flash": "2097152",
            "--pagesize": "16384",
            "--sram": "196608",
            "--descr": "STM32F42x_F43x",
        }
        for flag, value in expected.items():
            with self.subTest(flag=flag):
                result = self.run_shim(flag)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout.strip(), value)

    def test_probe_offline_gives_the_german_hint(self):
        result = self.run_shim("--probe", bridge_url=f"http://127.0.0.1:{free_closed_port()}")
        self.assertEqual(result.returncode, 1)
        self.assertIn(OFFLINE, result.stderr)
        self.assertEqual(result.stdout, "")

    def test_bridge_error_is_reported(self):
        self.bridge.script.set("/probe", 503, b'{"ok":false,"error":"no probe connected"}')
        result = self.run_shim("--probe")
        self.assertEqual(result.returncode, 1)
        self.assertIn("no probe connected", result.stderr)

    def test_no_args_prints_usage_and_fails(self):
        result = self.run_shim()
        self.assertEqual(result.returncode, 1)
        self.assertIn("usage", result.stderr)
        self.assertEqual(self.bridge.requests, [])

    def test_version(self):
        result = self.run_shim("--version")
        self.assertEqual(result.returncode, 0)
        self.assertIn("st-info", result.stdout)

    def test_unknown_flag(self):
        result = self.run_shim("--bogus")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(self.bridge.requests, [])


if __name__ == "__main__":
    unittest.main()

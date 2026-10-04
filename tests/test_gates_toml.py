# trace: AUF-20260929-032
"""Validate .cads/gates.toml against the GateCommand field contract (DEC-0058 C)."""
import pathlib
import tomllib
import unittest

GATES_TOML = pathlib.Path(__file__).resolve().parent.parent / ".cads" / "gates.toml"

GATE_COMMAND_FIELDS = {
    "gate": str,
    "name": str,
    "argv": list,
    "timeout_s": int,
    "required": bool,
    "reports_as": str,
    "mutation": bool,
    "scope": str,
    "kinds": list,
}


class GatesTomlTests(unittest.TestCase):
    def setUp(self):
        with GATES_TOML.open("rb") as f:
            self.data = tomllib.load(f)

    def test_commands_array_present(self):
        self.assertIn("commands", self.data)
        self.assertIsInstance(self.data["commands"], list)
        self.assertGreater(len(self.data["commands"]), 0)

    def test_each_command_has_gatecommand_fields(self):
        for command in self.data["commands"]:
            for field, field_type in GATE_COMMAND_FIELDS.items():
                with self.subTest(command=command.get("name"), field=field):
                    self.assertIn(field, command)
                    self.assertIsInstance(command[field], field_type)

    def test_each_command_argv_is_non_empty_strings(self):
        for command in self.data["commands"]:
            with self.subTest(command=command.get("name")):
                self.assertGreater(len(command["argv"]), 0)
                for part in command["argv"]:
                    self.assertIsInstance(part, str)

    def test_bash_n_commands_cover_deploy_and_smoke_scripts(self):
        scopes = {command["scope"] for command in self.data["commands"]}
        self.assertIn("deploy/firmware-lab/deploy.sh", scopes)
        self.assertIn("deploy/firmware-lab/smoke.sh", scopes)
        for command in self.data["commands"]:
            if command["scope"] in {
                "deploy/firmware-lab/deploy.sh",
                "deploy/firmware-lab/smoke.sh",
            }:
                self.assertEqual(command["argv"][:2], ["bash", "-n"])


if __name__ == "__main__":
    unittest.main()

"""Offline process/source checks; never starts Docker or imports the fixture."""

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location(
    "keycloak_runner", Path(__file__).with_name("keycloak_runner.py")
)
assert spec and spec.loader
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class RunnerTests(unittest.TestCase):
    def test_selection_refuses_stale_dirty_and_shadowed_source_without_import(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)

            def git(*args):
                return subprocess.check_output(["git", "-C", str(root), *args], text=True).strip()

            git("init", "-q")
            git("config", "user.name", "fixture")
            git("config", "user.email", "fixture@invalid")
            git(
                "remote",
                "add",
                "origin",
                "https://github.com/stanimirivanov/perfeng-environment.git",
            )
            (root / "scripts").mkdir()
            source = root / "scripts/keycloak_qualification.py"
            source.write_text("raise AssertionError('must not import in preview')\n")
            git("add", ".")
            git("commit", "-qm", "fixture")
            pin = {
                "repository": git("remote", "get-url", "origin"),
                "commit": git("rev-parse", "HEAD"),
            }
            self.assertEqual(runner.preview(root, pin)["mode"], "offline-preview")
            with self.assertRaises(ValueError):
                runner.preview(root, {**pin, "commit": "0" * 40})
            source.write_text("changed")
            with self.assertRaises(ValueError):
                runner.preview(root, pin)
            git("checkout", "--", ".")
            (root / "scripts/foreign.py").write_text("foreign")
            with self.assertRaises(ValueError):
                runner.preview(root, pin)

    def test_message_is_only_private_candidate_fields(self):
        pair = SimpleNamespace(
            issuer="https://127.0.0.1:123/realms/perfeng-fixture",
            nonce="nonce",
            request_started_at_ms=123,
            id_token="TOKEN-CANARY",
            access_token="ACCESS-CANARY",
            expires_in=300,
            stage="unverified-code",
            refresh_token="never",
        )
        message = runner.message(SimpleNamespace(tls_ca_pem="public-ca", pair=pair))
        self.assertEqual(
            set(message), {"issuer", "ca", "nonce", "requestStartedAtMs", "candidates"}
        )
        self.assertEqual(
            set(message["candidates"]), {"stage", "idToken", "accessToken", "expiresIn"}
        )
        self.assertNotIn("never", json.dumps(message))

    def test_process_receipt_timeout_output_bounds_and_diagnostics(self):
        receipt = json.dumps(runner.PASSED)
        command = [
            sys.executable,
            "-I",
            "-c",
            "import sys; sys.stdin.buffer.read(); print(" + repr(receipt) + ")",
        ]
        self.assertEqual(runner.run_client({"secret": "TOKEN-CANARY"}, command), runner.PASSED)
        for program in [
            "import sys; print('TOKEN-CANARY',file=sys.stderr); sys.exit(1)",
            "print('x'*10000)",
            "import time; time.sleep(10)",
        ]:
            with self.subTest(program=program), self.assertRaises(ValueError) as caught:
                runner.run_client(
                    {"secret": "TOKEN-CANARY"}, [sys.executable, "-I", "-c", program], timeout=0.2
                )
            self.assertEqual(str(caught.exception), "Private qualifier refused")
            self.assertIsNone(caught.exception.__cause__)


if __name__ == "__main__":
    unittest.main()

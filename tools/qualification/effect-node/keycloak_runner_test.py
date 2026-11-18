"""Offline process/source checks; never starts Docker or imports the fixture."""

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "keycloak_runner", Path(__file__).with_name("keycloak_runner.py")
)
assert spec and spec.loader
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class RunnerTests(unittest.TestCase):
    def test_adopted_sources_and_root_lock_are_in_versioned_provenance(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for name in ["package.json", "pnpm-lock.yaml", "src/bff/login/identity/token-profile.ts", "src/bff/login/code-exchange.operation.ts", "tools/qualification/identity-jwt/candidate.ts", "tools/qualification/effect-node/keycloak_runner.py"]:
                file = root / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(name)
            original = runner.qualification_digest(root)
            for name in ["package.json", "pnpm-lock.yaml", "src/bff/login/identity/token-profile.ts", "src/bff/login/code-exchange.operation.ts"]:
                file = root / name
                old = file.read_text()
                file.write_text(old + "changed")
                self.assertNotEqual(runner.qualification_digest(root), original)
                file.write_text(old)
            self.assertEqual(runner.qualification_digest(root), original)
            (root / "src/bff/login/identity/token-profile.ts").unlink()
            (root / "src/bff/login/identity/token-profile.ts").symlink_to(root / "package.json")
            with self.assertRaises(ValueError):
                runner.qualification_digest(root)

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

    def test_private_session_keeps_one_child_and_checks_terminal_exit(self):
        program = "import sys,json; count=0\nfor line in sys.stdin: count+=1; print(json.dumps({'count':count}),flush=True)"
        with runner.PrivateSession(
            [sys.executable, "-I", "-c", program], total_timeout=2
        ) as session:
            for count in (1, 2, 3):
                session.write(json.dumps({"phase": count}).encode() + b"\n")
                self.assertEqual(session.reply(), {"count": count})
            session.close_input()
            session.finish()
        failed = "import sys; print('{\"count\":1}',flush=True); sys.stdin.read(); sys.exit(1)"
        with (
            self.assertRaises(ValueError),
            runner.PrivateSession([sys.executable, "-I", "-c", failed], total_timeout=1) as session,
        ):
            session.write(b'{"phase":1}\n')
            self.assertEqual(session.reply(), {"count": 1})
            session.close_input()
            session.finish()

    def test_rotation_messages_bind_public_phase_without_private_fields(self):
        for phase in ("initial", "overlap", "retired"):
            value = SimpleNamespace(
                tls_ca_pem="public-ca",
                phase=SimpleNamespace(
                    phase=phase,
                    issuer="https://127.0.0.1:123/realms/perfeng-fixture",
                    old_key_id="old",
                    new_key_id=None if phase == "initial" else "new",
                    token="NEVER",
                ),
            )
            result = runner.rotation_message(value)
            self.assertEqual(
                set(result),
                {
                    "phase",
                    "oldKeyId",
                    "newKeyId",
                    *({"issuer", "ca"} if phase == "initial" else set()),
                },
            )
            self.assertNotIn("NEVER", json.dumps(result))

    def test_isolated_preview_loads_only_the_literal_owned_helper(self):
        result = subprocess.run(
            [
                sys.executable,
                "-I",
                "-B",
                str(Path(__file__).with_name("keycloak_runner.py")),
                "--environment-source",
                "/missing-fixture-source",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stderr, "")
        self.assertEqual(json.loads(result.stdout), {"admission": "NOT_ADMITTED", "status": "FAIL"})

    def test_session_setup_failure_cannot_leave_a_child(self):
        with patch.object(runner._session.subprocess, "Popen") as start:
            for timeout in (0, -1, float("nan"), float("inf"), 61, True):
                with self.assertRaises(ValueError):
                    runner.PrivateSession([], total_timeout=timeout)
            start.assert_not_called()
        created = []
        original = subprocess.Popen

        def start(*args, **kwargs):
            value = original(*args, **kwargs)
            created.append(value)
            return value

        try:
            with (
                patch.object(runner._session.subprocess, "Popen", side_effect=start),
                patch.object(
                    runner._session.selectors,
                    "DefaultSelector",
                    side_effect=OSError("setup failure"),
                ),
            ):
                with self.assertRaises(ValueError):
                    runner.PrivateSession(
                        [sys.executable, "-I", "-c", "import time; time.sleep(10)"]
                    )
            self.assertIsNotNone(created[0].poll())
        finally:
            for value in created:
                if value.poll() is None:
                    value.kill()
                value.wait()


if __name__ == "__main__":
    unittest.main()

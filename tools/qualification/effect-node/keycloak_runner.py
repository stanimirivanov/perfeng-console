"""Opt-in pinned disposable-provider consumer; credentials cross only private stdin."""

from __future__ import annotations

import argparse
import hashlib
import importlib
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
# -I intentionally excludes the script directory; load only this literal trusted file.
_spec = importlib.util.spec_from_file_location("private_session", HERE / "private_session.py")
assert _spec and _spec.loader
_session = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_session)
PrivateSession = _session.PrivateSession
PIN = json.loads((HERE / "keycloak-fixture.json").read_text())
PASSED = {
    "profile": "perfeng-keycloak-code-pair-v1",
    "status": "PASS",
    "admission": "NOT_ADMITTED",
    "checks": ["fixed-origin-keys", "signed-human-code-pair", "expected-fixture-subject"],
}
CLOSURE = (
    "scripts/keycloak_qualification.py",
    "scripts/keycloak_human.py",
    "scripts/keycloak_rotation.py",
    "tests/qualification/keycloak/fixture.lock.json",
)


def git(source: Path, *args: str) -> str:
    """Read only source metadata; never import from a mutable checkout."""
    return subprocess.check_output(
        ["git", "-C", str(source), *args], text=True, stderr=subprocess.DEVNULL, timeout=10
    ).strip()


def preview(source: Path, pin: dict) -> dict:
    """Verify exact source selection without importing code or provisioning anything."""
    if (
        git(source, "remote", "get-url", "origin") != pin["repository"]
        or git(source, "rev-parse", "HEAD") != pin["commit"]
        or git(source, "status", "--porcelain", "--untracked-files=no")
        or git(source, "ls-files", "--others", "--exclude-standard", "--", "scripts")
    ):
        raise ValueError("Fixture source selection refused")
    return {
        "mode": "offline-preview",
        "environmentCommit": pin["commit"],
        "admission": "NOT_ADMITTED",
    }


def message(observation) -> dict:
    """Copy only the frozen observer contract; never forward an OAuth envelope."""
    pair = observation.pair
    if pair.stage != "unverified-code":
        raise ValueError("Fixture observation refused")
    return {
        "issuer": pair.issuer,
        "ca": observation.tls_ca_pem,
        "nonce": pair.nonce,
        "requestStartedAtMs": pair.request_started_at_ms,
        "candidates": {
            "stage": pair.stage,
            "idToken": pair.id_token,
            "accessToken": pair.access_token,
            "expiresIn": pair.expires_in,
        },
    }


def run_client(value: dict, command: list[str], timeout: float = 8) -> dict:
    """Preserve the one-shot private pair contract through the owned pipe session."""
    try:
        with PrivateSession(command, total_timeout=timeout) as client:
            client.write(json.dumps(value, ensure_ascii=False).encode())
            client.close_input()
            result = client.reply()
            client.finish()
            if result != PASSED:
                raise ValueError("refused")
            return dict(PASSED)
    except (ValueError, OSError, subprocess.SubprocessError, UnicodeError):
        raise ValueError("Private qualifier refused") from None


ROTATION_CHECKS = {
    "initial": ["initial-old-key"],
    "overlap": ["missing-key-refresh", "overlap-old-and-new"],
    "retired": ["fresh-old-key-retention", "expired-old-key-refusal", "new-key-survival"],
}


def rotation_message(observation):
    """Only public IDs cross the ongoing phase boundary; initial supplies fixed trust."""
    phase = observation.phase
    value = {"phase": phase.phase, "oldKeyId": phase.old_key_id, "newKeyId": phase.new_key_id}
    if phase.phase == "initial":
        value.update(issuer=phase.issuer, ca=observation.tls_ca_pem)
    return value


def execute(source: Path) -> dict:
    """Reuse exactly the pinned fixture under its locked interpreter and cleanup owner."""
    preview(source, PIN)
    if Path(sys.prefix).resolve() != (source / ".venv").resolve() or sys.version_info[:2] != (
        3,
        12,
    ):
        raise ValueError("Use the pinned environment uv interpreter")
    node = shutil.which("node")
    if (
        not node
        or subprocess.check_output([node, "--version"], env={}, timeout=3).strip() != b"v26.13.0"
    ):
        raise ValueError("Pinned Node runtime required")
    if any(name == "scripts" or name.startswith("scripts.") for name in sys.modules):
        raise ValueError("Preloaded fixture module refused")
    console = HERE.parents[2]
    console_commit = git(console, "rev-parse", "HEAD")
    paths = ("tools/qualification/effect-node", "tools/qualification/identity-jwt")
    if git(console, "status", "--porcelain", "--untracked-files=normal", "--", *paths):
        raise ValueError("Commit qualification sources before executing")
    seen = []
    phases = []
    rotation_client = None
    trust = None
    with tempfile.TemporaryDirectory(prefix="perfeng-pinned-keycloak-") as temporary:
        exported = Path(temporary)
        for relative in CLOSURE:
            target = exported / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(
                subprocess.check_output(
                    ["git", "-C", str(source), "show", PIN["commit"] + ":" + relative], timeout=10
                )
            )
        # A regular package closes the exported namespace against unrelated roots.
        (exported / "scripts/__init__.py").write_text("")
        sys.dont_write_bytecode = True
        sys.path.insert(0, str(exported))
        try:
            fixture = importlib.import_module("scripts.keycloak_qualification")
            if fixture.human.HUMAN != PIN["subject"]:
                raise ValueError("Fixture expectation differs from reviewed subject")

            def observe(value):
                seen.append(run_client(message(value), [node, str(HERE / "code-pair-cli.ts")]))

            def observe_phase(value):
                nonlocal rotation_client, trust
                phase = value.phase.phase
                if len(phases) >= 3 or phase != list(ROTATION_CHECKS)[len(phases)]:
                    raise ValueError("Unexpected provider phase")
                current_trust = (value.phase.issuer, value.tls_ca_pem)
                if rotation_client is None:
                    trust = current_trust
                    rotation_client = PrivateSession(
                        [node, str(HERE / "cache-rotation-cli.ts")], total_timeout=60
                    )
                elif current_trust != trust:
                    raise ValueError("Provider trust changed")
                rotation_client.write(json.dumps(rotation_message(value)).encode() + b"\n")
                expected = {
                    "profile": "perfeng-key-cache-rotation-v1",
                    "phase": phase,
                    "status": "PASS",
                    "admission": "NOT_ADMITTED",
                    "checks": ROTATION_CHECKS[phase],
                }
                if phase == "retired":
                    expected["clockAdvancesMs"] = [1001, 300001]
                if rotation_client.reply() != expected:
                    raise ValueError("Cache phase did not qualify")
                phases.append(phase)

            provider = fixture.execute(observe_code_pair=observe, observe_key_phase=observe_phase)
            if phases != list(ROTATION_CHECKS) or rotation_client is None:
                raise ValueError("Incomplete cache qualification")
            rotation_client.close_input()
            rotation_client.finish()
            if len(seen) != 1 or provider["admission"] != "NOT_ADMITTED":
                raise ValueError("Missing independent observation")
            if git(console, "rev-parse", "HEAD") != console_commit or git(
                console, "status", "--porcelain", "--untracked-files=normal", "--", *paths
            ):
                raise ValueError("Qualification sources changed during execution")
            digest = hashlib.sha256(b"perfeng-keycloak-qualification-v1\0")
            for root in (HERE, HERE.parent / "identity-jwt"):
                for file in sorted(root.iterdir()):
                    if not file.is_file() or file.suffix not in (".ts", ".py", ".json", ".yaml"):
                        continue
                    path = file.relative_to(HERE.parent).as_posix().encode()
                    content = file.read_bytes()
                    digest.update(len(path).to_bytes(8, "big"))
                    digest.update(path)
                    digest.update(len(content).to_bytes(8, "big"))
                    digest.update(content)
            return {
                "mode": "executed",
                "consoleCommit": console_commit,
                "environmentCommit": PIN["commit"],
                "consoleQualificationDigestFormat": "sha256-length-framed-v1",
                "consoleQualificationSha256": digest.hexdigest(),
                "provider": provider,
                "console": PASSED,
                "cacheRotation": {
                    "status": "PASS",
                    "phases": phases,
                    "clockAdvancesMs": [1001, 300001],
                },
                "admission": "NOT_ADMITTED",
            }
        finally:
            if rotation_client is not None:
                rotation_client.close()
            sys.path.remove(str(exported))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--environment-source", type=Path, default=HERE.parents[3] / "perfeng-environment"
    )
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    try:
        result = (
            execute(args.environment_source.resolve())
            if args.execute
            else preview(args.environment_source.resolve(), PIN)
        )
        print(json.dumps(result, sort_keys=True))
        return 0
    except Exception:
        # Sole command boundary: failures may carry candidates; emit no diagnostics.
        print('{"admission":"NOT_ADMITTED","status":"FAIL"}')
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

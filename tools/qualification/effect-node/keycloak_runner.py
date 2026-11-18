"""Opt-in pinned disposable-provider consumer; credentials cross only private stdin."""

from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import os
import selectors
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
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
    """Bound both pipe directions and child lifetime; never expose child diagnostics."""
    process = None
    try:
        payload = json.dumps(value, ensure_ascii=False).encode()
        if len(payload) > 65536:
            raise ValueError("oversized")
        process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env={"PATH": os.environ.get("PATH", "")},
        )
        assert process.stdin and process.stdout and process.stderr
        output = {process.stdout: bytearray(), process.stderr: bytearray()}
        pending = memoryview(payload)
        deadline = time.monotonic() + timeout
        with selectors.DefaultSelector() as selector:
            for stream in (process.stdin, process.stdout, process.stderr):
                os.set_blocking(stream.fileno(), False)
                selector.register(
                    stream,
                    selectors.EVENT_WRITE if stream is process.stdin else selectors.EVENT_READ,
                )
            while selector.get_map():
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise ValueError("deadline")
                for key, _mask in selector.select(remaining):
                    stream = key.fileobj
                    if stream is process.stdin:
                        count = os.write(stream.fileno(), pending[:16384])
                        pending = pending[count:]
                        if not pending:
                            selector.unregister(stream)
                            stream.close()
                    else:
                        data = os.read(stream.fileno(), 4096)
                        if not data:
                            selector.unregister(stream)
                        else:
                            output[stream].extend(data)
                            if sum(map(len, output.values())) > 4096:
                                raise ValueError("output limit")
        status = process.wait(timeout=max(0.01, deadline - time.monotonic()))
        if status != 0 or output[process.stderr] or json.loads(output[process.stdout]) != PASSED:
            raise ValueError("refused")
        return dict(PASSED)
    except (ValueError, OSError, subprocess.SubprocessError, UnicodeError):
        raise ValueError("Private qualifier refused") from None
    finally:
        if process is not None:
            if process.poll() is None:
                process.kill()
            process.wait(timeout=2)
            for stream in (process.stdin, process.stdout, process.stderr):
                if stream:
                    stream.close()


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

            provider = fixture.execute(observe_code_pair=observe)
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
                "admission": "NOT_ADMITTED",
            }
        finally:
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

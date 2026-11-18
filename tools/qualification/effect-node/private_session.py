"""Bounded owned JSON-reply process pipes, shared by qualification consumers only."""

from __future__ import annotations

import json
import math
import os
import selectors
import subprocess
import time


def refused():
    raise ValueError("Private qualifier refused")


class PrivateSession:
    """Own one child; bounds apply across its entire lifetime, never per reset."""

    def __init__(self, command: list[str], total_timeout: float = 8):
        if (
            type(total_timeout) not in (int, float)
            or not math.isfinite(total_timeout)
            or not 0 < total_timeout <= 60
        ):
            refused()
        self.process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env={"PATH": os.environ.get("PATH", "")},
        )
        try:
            assert self.process.stdin and self.process.stdout and self.process.stderr
            self.selector = selectors.DefaultSelector()
            self.until = time.monotonic() + total_timeout
            self.operation_until = self.until
            self.sent = self.received = 0
            self.buffer = bytearray()
            self.pending = memoryview(b"")
            self.awaiting = self.input_closed = self.stdout_closed = False
            for stream in (self.process.stdin, self.process.stdout, self.process.stderr):
                os.set_blocking(stream.fileno(), False)
            self.selector.register(self.process.stdout, selectors.EVENT_READ)
            self.selector.register(self.process.stderr, selectors.EVENT_READ)
        except BaseException as error:
            self.close()
            if isinstance(error, Exception):
                raise ValueError("Private qualifier refused") from None
            raise

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.close()

    def _remaining(self):
        remaining = min(self.until, self.operation_until) - time.monotonic()
        if remaining <= 0:
            refused()
        return remaining

    def _step(self):
        for key, _mask in self.selector.select(self._remaining()):
            stream = key.fileobj
            if stream is self.process.stdin:
                count = os.write(stream.fileno(), self.pending[:16384])
                self.pending = self.pending[count:]
                if not self.pending:
                    self.selector.unregister(stream)
            else:
                data = os.read(stream.fileno(), min(4096, 4097 - self.received))
                if not data:
                    self.selector.unregister(stream)
                    if stream is self.process.stdout:
                        self.stdout_closed = True
                else:
                    self.received += len(data)
                    if self.received > 4096 or stream is self.process.stderr:
                        refused()
                    self.buffer.extend(data)

    def write(self, payload: bytes):
        """Write a bounded complete request; its reply shares this operation deadline."""
        try:
            if self.input_closed or self.awaiting or not payload:
                refused()
            self.sent += len(payload)
            if self.sent > 65536:
                refused()
            self.operation_until = min(self.until, time.monotonic() + 8)
            self.pending = memoryview(payload)
            self.selector.register(self.process.stdin, selectors.EVENT_WRITE)
            while self.pending:
                self._step()
            self.awaiting = True
        except (OSError, ValueError):
            raise ValueError("Private qualifier refused") from None

    def reply(self):
        """Accept one JSON reply and reject additional output already buffered with it."""
        try:
            if not self.awaiting:
                refused()
            while b"\n" not in self.buffer and not self.stdout_closed:
                self._step()
            if b"\n" in self.buffer:
                line, _, tail = self.buffer.partition(b"\n")
                if tail.strip():
                    refused()
            elif self.input_closed and self.stdout_closed:
                line = self.buffer
            else:
                refused()
            self.buffer.clear()
            self.awaiting = False
            return json.loads(line)
        except (OSError, ValueError, UnicodeError):
            raise ValueError("Private qualifier refused") from None

    def close_input(self):
        if not self.input_closed:
            self.process.stdin.close()
            self.input_closed = True

    def finish(self):
        """Require clean EOF/exit after all ACKs; partial success is not a receipt."""
        try:
            if not self.input_closed or self.awaiting:
                refused()
            self.operation_until = min(self.until, time.monotonic() + 8)
            while self.selector.get_map():
                self._step()
                if self.buffer.strip():
                    refused()
            if self.process.wait(timeout=self._remaining()) != 0:
                refused()
        except (OSError, ValueError, subprocess.SubprocessError):
            raise ValueError("Private qualifier refused") from None

    def close(self):
        selector = getattr(self, "selector", None)
        if selector is not None:
            selector.close()
        try:
            if self.process.poll() is None:
                self.process.kill()
            self.process.wait(timeout=2)
        finally:
            for stream in (self.process.stdin, self.process.stdout, self.process.stderr):
                if stream:
                    stream.close()

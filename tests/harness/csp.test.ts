import { test } from "node:test";
import assert from "node:assert/strict";
import { renderConsoleHtml } from "../../src/bff/csp.ts";

test("HTML binds unpredictable nonces to Angular and CSP and forbids cached reuse", () => {
  const template = '<html><app-root></app-root></html>';
  const first = renderConsoleHtml(template);
  const second = renderConsoleHtml(template);
  assert.notEqual(first.html, second.html);
  const nonce = first.html.match(/ngCspNonce="([^"]+)"/)?.[1];
  assert.ok(nonce && nonce.length >= 32);
  assert.ok(first.headers["Content-Security-Policy"].includes("'nonce-" + nonce + "'"));
  assert.equal(first.headers["Cache-Control"], "no-store");
  assert.doesNotMatch(first.headers["Content-Security-Policy"], /unsafe-inline|unsafe-eval/);
  assert.throws(() => renderConsoleHtml("<html></html>"));
});

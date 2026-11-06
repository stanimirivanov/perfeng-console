import { randomBytes } from "node:crypto";

// Angular's nonce contract: https://angular.dev/best-practices/security#content-security-policy
export function renderConsoleHtml(template: string) {
  if (template.split("<app-root").length !== 2 || !template.includes("<app-root>"))
    throw new Error("Expected one unconfigured Angular root.");
  const nonce = randomBytes(32).toString("base64");
  return {
    html: template.replace("<app-root>", '<app-root ngCspNonce="' + nonce + '">'),
    headers: {
      "Content-Security-Policy": [
        "default-src 'none'", "script-src 'self'",
        "style-src 'self' 'nonce-" + nonce + "'",
        "connect-src 'self'", "img-src 'self'", "font-src 'self'",
        "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'",
      ].join("; "),
      "Cache-Control": "no-store",
    },
  };
}

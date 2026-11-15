/** Candidates are private credentials, not verified claims, sessions or grants. */
export interface UnverifiedCodeTokens {
  stage: 'unverified-code';
  accessToken: string;
  idToken: string;
  expiresIn: number;
  refreshToken?: string;
}
export interface UnverifiedDelegatedTokens {
  stage: 'unverified-delegated';
  accessToken: string;
  expiresIn: number;
}

const invalid = () => ({ ok: false as const, reason: 'invalid_response' as const });
const candidate = (value: unknown): value is string => typeof value === 'string' && value.length <= 16_384 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
const duration = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 300;

interface Envelope extends Record<string, unknown> { access_token: string; expires_in: number }

function envelope(text: unknown): Envelope | undefined {
  if (typeof text !== 'string' || !text || text.length > 65_536 || Buffer.byteLength(text, 'utf8') > 65_536) return;
  try {
    // Native JSON parsing owns grammar. Only this deliberately flat token profile
    // is admitted; this is not a replacement general-purpose JSON parser.
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    const record = parsed as Record<string, unknown>;
    if (Object.keys(record).length > 32 || Object.entries(record).some(([key, value]) => key.length > 128 || !key.isWellFormed() ||
      !(typeof value === 'string' ? value.length <= 16_384 && value.isWellFormed() : typeof value === 'number' && Number.isFinite(value)))) return;
    // JSON.parse discards duplicate keys. In a syntax-checked flat object, a
    // complete string token followed by ':' is a member name, never a value.
    // Decode escapes before comparing so access_token and its aliases collide.
    const names = new Set<string>();
    for (const match of text.matchAll(/"(?:\\.|[^"\\])*"/gu)) {
      let end = match.index + match[0].length;
      while (/[\t\r\n ]/.test(text[end] ?? '') && end < text.length) end++;
      if (text[end] !== ':') continue;
      const name: string = JSON.parse(match[0]);
      if (names.has(name)) return;
      names.add(name);
    }
    if (['error', 'error_description', 'error_uri'].some(key => Object.hasOwn(record, key)) ||
        typeof record.token_type !== 'string' || record.token_type.toLowerCase() !== 'bearer' ||
        !duration(record.expires_in) || !candidate(record.access_token)) return;
    if (record.scope !== undefined && (typeof record.scope !== 'string' || !/^[\x21\x23-\x5b\x5d-\x7e]+(?: [\x21\x23-\x5b\x5d-\x7e]+)*$/.test(record.scope) || record.scope.split(' ').includes('offline_access'))) return;
    if (record.refresh_expires_in !== undefined && (typeof record.refresh_expires_in !== 'number' || !Number.isSafeInteger(record.refresh_expires_in) || record.refresh_expires_in < 0)) return;
    return { ...record, access_token: record.access_token, expires_in: record.expires_in };
  } catch { return; }
}

/** Decode only a code-response envelope; JWT signatures/claims remain unverified. */
export function decodeCodeTokens(body: unknown): { ok: true; candidates: UnverifiedCodeTokens } | ReturnType<typeof invalid> {
  const value = envelope(body);
  if (!value || !candidate(value.id_token) || Object.hasOwn(value, 'issued_token_type') ||
      (value.refresh_token !== undefined && !candidate(value.refresh_token))) return invalid();
  return { ok: true, candidates: { stage: 'unverified-code', accessToken: value.access_token,
    idToken: value.id_token, expiresIn: value.expires_in,
    ...(value.refresh_token === undefined ? {} : { refreshToken: value.refresh_token }) } };
}

/** Decode only the access-token exchange profile; never retain exchanged refresh/ID tokens. */
export function decodeDelegatedTokens(body: unknown): { ok: true; candidates: UnverifiedDelegatedTokens } | ReturnType<typeof invalid> {
  const value = envelope(body);
  if (!value || value.issued_token_type !== 'urn:ietf:params:oauth:token-type:access_token' ||
      Object.hasOwn(value, 'refresh_token') || Object.hasOwn(value, 'id_token') ||
      (value.refresh_expires_in !== undefined && value.refresh_expires_in !== 0)) return invalid();
  return { ok: true, candidates: { stage: 'unverified-delegated', accessToken: value.access_token, expiresIn: value.expires_in } };
}

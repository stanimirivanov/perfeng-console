// Allocation/work bounds for untrusted credential-bearing responses. These are
// the reviewed PR52e profile limits, not inferred provider capacities.
const MAX_BODY_BYTES = 65_536;
const MAX_JSON_MEMBERS = 32;
const MAX_MEMBER_NAME_CHARACTERS = 128;
const MAX_VALUE_CHARACTERS = 16_384;
// ADR 0046's conservative five-minute pilot bound; metadata never renews a JWT.
const MAX_EXPIRES_IN_SECONDS = 300;

export type TokenEnvelope = Readonly<Record<string, unknown>> & {
  readonly access_token: string;
  readonly expires_in: number;
};

/** Keycloak's admitted compact-JWT shape, not a generic OAuth token or signature
 * check. Keep the bound here too so this predicate is safe without an envelope.
 */
export const isJwtShapedToken = (value: unknown): value is string => typeof value === 'string' && value.length <= MAX_VALUE_CHARACTERS && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
const isValidExpiresIn = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= MAX_EXPIRES_IN_SECONDS;

/** Requires native syntax validation and a flat object first. Only then can a
 * complete JSON string token followed by ':' be identified as a member name.
 * Decode escapes before comparing; quoted key-like values are not members.
 */
function hasDuplicateJsonMemberNames(text: string): boolean {
  const names = new Set<string>();
  for (const match of text.matchAll(/"(?:\\.|[^"\\])*"/gu)) {
    const start = match.index;
    if (start === undefined) return true; // An unavailable position is ambiguous: refuse.
    let end = start + match[0].length;
    while (end < text.length && /[\t\r\n ]/.test(text.charAt(end))) end++;
    if (text.charAt(end) !== ':') continue;
    const name: string = JSON.parse(match[0]);
    if (names.has(name)) return true;
    names.add(name);
  }
  return false;
}

/** Validate the common private envelope. Unknown fields remain untrusted;
 * phase decoders project only known candidates and grant no identity/authority.
 */
export function decodeTokenEnvelope(text: unknown): TokenEnvelope | undefined {
  if (typeof text !== 'string' || !text || text.length > MAX_BODY_BYTES || Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return;
  try {
    // Native JSON parsing owns grammar. This profile deliberately permits only
    // flat string/number fields, not a replacement general-purpose JSON parser.
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    const record = parsed as Record<string, unknown>;
    if (Object.keys(record).length > MAX_JSON_MEMBERS || Object.entries(record).some(([key, value]) => key.length > MAX_MEMBER_NAME_CHARACTERS || !key.isWellFormed() ||
      !(typeof value === 'string' ? value.length <= MAX_VALUE_CHARACTERS && value.isWellFormed() : typeof value === 'number' && Number.isFinite(value)))) return;
    if (hasDuplicateJsonMemberNames(text)) return;
    if (['error', 'error_description', 'error_uri'].some(key => Object.hasOwn(record, key)) ||
        typeof record.token_type !== 'string' || record.token_type.toLowerCase() !== 'bearer' ||
        !isValidExpiresIn(record.expires_in) || !isJwtShapedToken(record.access_token)) return;
    // Offline credentials are outside the pilot; scope never supplies grants.
    if (record.scope !== undefined && (typeof record.scope !== 'string' || !/^[\x21\x23-\x5b\x5d-\x7e]+(?: [\x21\x23-\x5b\x5d-\x7e]+)*$/.test(record.scope) || record.scope.split(' ').includes('offline_access'))) return;
    if (record.refresh_expires_in !== undefined && (typeof record.refresh_expires_in !== 'number' || !Number.isSafeInteger(record.refresh_expires_in) || record.refresh_expires_in < 0)) return;
    return { ...record, access_token: record.access_token, expires_in: record.expires_in };
  } catch { return; }
}

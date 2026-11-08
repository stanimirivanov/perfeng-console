import { createRunTransport } from '#perfeng/bff';
import { readFile } from 'node:fs/promises';
import { startConsole } from './console-server.ts';

const [, , certificate, privateKey, portArgument = '4310'] = process.argv;
if (!certificate || !privateKey) throw new Error('Usage: node tools/serve-console.ts CERT.pem KEY.pem [port]');
const port = Number(portArgument);
if (!/^\d+$/.test(portArgument) || !Number.isInteger(port) || port > 65535) throw new Error('Invalid loopback port');
const [cert, key] = await Promise.all([readFile(certificate), readFile(privateKey)]);
const { PERFENG_UPSTREAM_ORIGIN: upstream, PERFENG_UPSTREAM_TOKEN_FILE: tokenFile,
  PERFENG_UPSTREAM_CA_FILE: caFile } = process.env;
if ((upstream || tokenFile || caFile) && !(upstream && tokenFile && caFile)) {
  throw new Error('Configure all three upstream settings');
}
const runs = upstream && tokenFile && caFile ? createRunTransport({ origin: upstream, tokenFile, caFile }) : undefined;
const { origin, code } = await startConsole({ cert, key, port, ...(runs ? { runs } : {}) });
console.error('Console URL', origin);
// Deliver the one-use code only to the operator terminal.
console.error('Pairing code', code);

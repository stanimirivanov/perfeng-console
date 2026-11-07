import { readFile } from 'node:fs/promises';
import { startConsole } from './console-server.ts';

const [, , certificate, privateKey, portArgument = '4310'] = process.argv;
if (!certificate || !privateKey) throw new Error('Usage: node tools/serve-console.ts CERT.pem KEY.pem [port]');
const port = Number(portArgument);
if (!/^\d+$/.test(portArgument) || !Number.isInteger(port) || port > 65535) throw new Error('Invalid loopback port');
const [cert, key] = await Promise.all([readFile(certificate), readFile(privateKey)]);
const { origin, code } = await startConsole({ cert, key, port });
console.error('Console URL', origin);
// Deliver the one-use code only to the operator terminal.
console.error('Pairing code', code);

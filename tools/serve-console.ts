import { readFile } from 'node:fs/promises';
import { startConsole } from './console-server.ts';

const [, , certificate, privateKey] = process.argv;
if (!certificate || !privateKey) throw new Error('Usage: node tools/serve-console.ts CERT.pem KEY.pem');
const [cert, key] = await Promise.all([readFile(certificate), readFile(privateKey)]);
const { origin, code } = await startConsole({ cert, key, port: 4310 });
console.error('Console URL', origin);
// Deliver the one-use code only to the operator terminal.
console.error('Pairing code', code);

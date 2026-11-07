import { closeSync, constants, fstatSync, openSync, readSync } from 'node:fs';
import { resolve } from 'node:path';

export interface UpstreamConfig {
  origin: string;
  tokenFile: string;
  caFile: string;
  deadlineMs?: number;
  maxResponseBytes?: number;
}

const directoryFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
const fileFlags = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;

function invalidConfig(): never {
  throw new Error('Invalid upstream configuration');
}

/** Walk the Linux path by descriptor so replacing an ancestor cannot redirect a read. */
function readProtectedFile(path: string, limit: number): string {
  const uid = process.geteuid?.();
  if (process.platform !== 'linux' || uid === undefined || path !== resolve(path) || !path.startsWith('/')) {
    return invalidConfig();
  }
  const parts = path.slice(1).split('/');
  const leaf = parts.pop();
  if (!leaf) return invalidConfig();

  let directory = openSync('/', directoryFlags);
  try {
    for (const part of [...parts, undefined]) {
      const stat = fstatSync(directory);
      if ((stat.uid !== 0 && stat.uid !== uid) || (stat.mode & 0o022) !== 0) return invalidConfig();
      if (part === undefined) break;
      const next = openSync('/proc/self/fd/' + directory + '/' + part, directoryFlags);
      closeSync(directory);
      directory = next;
    }
    const file = openSync('/proc/self/fd/' + directory + '/' + leaf, fileFlags);
    try {
      const stat = fstatSync(file);
      if (!stat.isFile() || stat.uid !== uid || stat.nlink !== 1 ||
          (stat.mode & 0o077) !== 0 || stat.size === 0 || stat.size > limit) {
        return invalidConfig();
      }
      const bytes = Buffer.alloc(limit + 1);
      let count = 0;
      while (count < bytes.length) {
        const read = readSync(file, bytes, count, bytes.length - count, null);
        if (read === 0) break;
        count += read;
      }
      if (count === 0 || count > limit) return invalidConfig();
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, count));
    } finally {
      closeSync(file);
    }
  } finally {
    closeSync(directory);
  }
}

export function loadUpstreamConfig(config: UpstreamConfig) {
  try {
    const origin = new URL(config.origin);
    if (origin.protocol !== 'https:' || (config.origin !== origin.origin && config.origin !== origin.origin + '/')) {
      return invalidConfig();
    }
    const deadlineMs = config.deadlineMs ?? 3000;
    const maxResponseBytes = config.maxResponseBytes ?? 1024 * 1024;
    if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 3000 ||
        !Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1 || maxResponseBytes > 1024 * 1024) {
      return invalidConfig();
    }
    const token = readProtectedFile(config.tokenFile, 4096).replace(/\r?\n$/, '');
    if (!/^[A-Za-z0-9._~+/-]+=*$/.test(token)) return invalidConfig();
    const ca = readProtectedFile(config.caFile, 64 * 1024);
    return { origin: origin.origin, token, ca, deadlineMs, maxResponseBytes };
  } catch {
    return invalidConfig();
  }
}

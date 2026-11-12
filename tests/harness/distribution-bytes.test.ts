import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkDistribution } from '#perfeng/harness/assets';

const markers = ['PERFENG_SECRET_CANARY', 'BEGIN PRIVATE KEY', 'BEGIN RSA PRIVATE KEY',
  'BEGIN EC PRIVATE KEY', 'BEGIN OPENSSH PRIVATE KEY', 'Design fixture only', 'node:child_process',
  ...[...'pousr'].map(family => 'gh' + family + '_' + 'A'.repeat(30))];
const encodings = (text: string) => [Buffer.from(text), Buffer.from(text, 'utf16le'), Buffer.from(text, 'utf16le').swap16()];

test('all existing marker families are rejected in arbitrary binary and UTF-16 data at either alignment', () => {
  const root = mkdtempSync(join(tmpdir(), 'distribution-bytes-'));
  try {
    mkdirSync(join(root, 'nested'));
    const file = join(root, 'nested/payload.unknown');
    for (const marker of markers) for (const [index, encoded] of encodings(marker).entries()) {
      for (const prefix of [Buffer.from([0xff, 0, 0xc0]), Buffer.from([0x80, 0xfe])]) {
        for (const bom of [Buffer.alloc(0), index === 2 ? Buffer.from([0xfe, 0xff]) : Buffer.from([0xff, 0xfe])]) {
          writeFileSync(file, Buffer.concat([prefix, bom, encoded, Buffer.from([0, 0xff])]));
          assert.throws(() => checkDistribution(root), error => {
            const text = String(error);
            assert.match(text, /payload.unknown:1 \[distribution\].*Forbidden secret.*make build/);
            assert.equal(text.includes(marker), false, 'Matched contents stay out of diagnostics');
            return true;
          });
        }
      }
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('benign binary files, empty files and token prefixes below the existing threshold remain allowed', () => {
  const root = mkdtempSync(join(tmpdir(), 'distribution-benign-'));
  try {
    writeFileSync(join(root, 'all-bytes.bin'), Buffer.from(Array.from({ length: 256 }, (_, i) => i)));
    writeFileSync(join(root, 'empty'), Buffer.alloc(0));
    for (const family of 'pousr') for (const encoded of encodings('gh' + family + '_' + 'A'.repeat(29))) {
      writeFileSync(join(root, 'short-token.dat'), encoded);
      checkDistribution(root);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('late-file and read-boundary markers cannot escape the scan', () => {
  const root = mkdtempSync(join(tmpdir(), 'distribution-boundaries-'));
  try {
    for (const offset of [65536 - 1, 65536 - 33, 65536 - 67, 131072 + 5, 262144 + 3]) {
      for (const encoded of encodings('ghp_' + 'A'.repeat(30))) {
        writeFileSync(join(root, 'asset.bin'), Buffer.concat([Buffer.alloc(offset, 0x80), encoded, Buffer.from([0xff])]));
        assert.throws(() => checkDistribution(root), /Forbidden secret/);
      }
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('distribution links are rejected at root and nested file/directory positions', () => {
  const area = mkdtempSync(join(tmpdir(), 'distribution-links-'));
  const root = join(area, 'real');
  try {
    mkdirSync(root); writeFileSync(join(root, 'safe.bin'), Buffer.from([0xff]));
    for (const target of [root, join(area, 'missing')]) {
      const link = join(area, 'root-link'); symlinkSync(target, link, 'dir');
      assert.throws(() => checkDistribution(link), /\[distribution\].*symlinks/);
      rmSync(link);
    }
    for (const target of [join(root, 'safe.bin'), root]) {
      const link = join(root, 'nested-link'); symlinkSync(target, link);
      assert.throws(() => checkDistribution(root), /\[distribution\].*symlinks/);
      rmSync(link);
    }
  } finally { rmSync(area, { recursive: true, force: true }); }
});

test('a non-regular distribution entry is refused before reading its contents', async () => {
  const root = mkdtempSync(join(tmpdir(), 'distribution-special-'));
  const server = createServer();
  try {
    server.listen(join(root, 'socket')); await once(server, 'listening');
    assert.throws(() => checkDistribution(root), /\[distribution\].*regular file/);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    rmSync(root, { recursive: true, force: true });
  }
});

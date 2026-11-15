import { readFileSync } from 'node:fs';
import { startConsole } from '#perfeng/server';

let failClock = false;
const local = await startConsole({
  cert: readFileSync(process.argv[2]!), key: readFileSync(process.argv[3]!), port: 0,
  now: () => { if (failClock) throw new Error('private-clock-canary'); return 0; },
  runs: {
    getRun: async () => { throw new Error('private-reader-canary'); },
    listArtifacts: async () => { throw new Error('private-artifact-canary'); },
  },
});
// Faults target HTTP response lifetime without adding production injection APIs.
local.server.prependListener('request', (req, res) => {
  if (req.url === '/') {
    const writeHead = res.writeHead;
    res.writeHead = function () {
      res.writeHead = writeHead;
      throw new Error('private-render-response-canary');
    };
  }
  if (req.url === '/fault-partial') {
    res.writeHead(200); res.write('started');
    throwAfterEnd();
  }
  function throwAfterEnd() {
    res.end = () => { throw new Error('private-response-canary'); };
  }
  if (req.url === '/fault-ended') { res.end(); throwAfterEnd(); }
});
process.on('message', message => {
  if (message === 'fail-clock') { failClock = true; process.send?.('clock-ready'); }
  if (message === 'restore-clock') { failClock = false; process.send?.('clock-ready'); }
});
process.send?.({ origin: local.origin, code: local.code });

import { createServer } from 'node:http';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createRunTransport } from './candidate.ts';
import type { UpstreamConfig } from '../../../src/bff/config.ts';

/** Qualification-only request scope bridge; not a production session/auth server. */
export async function startFixtureBff(config: UpstreamConfig, runId: string) {
  const transport = createRunTransport(config);
  const controllers = new Set<AbortController>();
  const pending = new Set<Promise<void>>();
  const server = createServer((_request, response) => {
    const controller = new AbortController(); controllers.add(controller);
    // Response close observes client disconnect; request close can precede response work.
    response.once('close', () => controller.abort());
    const task = transport.getRun(runId, controller.signal).then(result => {
      if (!response.destroyed) response.end(JSON.stringify(result));
    }).finally(() => { controllers.delete(controller); pending.delete(task); });
    pending.add(task);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected loopback listener');
  let stopping: Promise<number> | undefined;
  return {
    url: 'http://127.0.0.1:' + address.port,
    stop() {
      stopping ??= (async () => {
        const closed = new Promise<void>(resolve => server.close(() => resolve()));
        for (const controller of controllers) controller.abort();
        await Promise.all(pending);
        server.closeAllConnections(); await closed;
        return pending.size;
      })();
      return stopping;
    },
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server = await startFixtureBff(JSON.parse(process.argv[2]!), process.argv[3]!);
  process.once('SIGTERM', () => { void server.stop().then(() => process.disconnect?.()); });
  process.send?.(server.url);
}

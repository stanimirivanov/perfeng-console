import { defineConfig } from 'orval';

export default defineConfig({
  repro: {
    input: './openapi.json',
    output: { client: 'fetch', target: './generated/repro/client.ts' },
  },
});

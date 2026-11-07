import { defineConfig } from 'orval';

const vendor = '../../../vendor/perfeng-contracts';
const bundles = {
  run: 'openapi.json',
  native: 'api/native-worker/v2/openapi.json',
  integration: 'api/performance-integration/v1/openapi.json',
};

export default defineConfig(Object.fromEntries(
  Object.entries(bundles).map(([family, spec]) => [family, {
    input: `${vendor}/${spec}`,
    output: {
      client: 'fetch',
      mode: 'tags-split',
      target: `./generated/${family}/client.ts`,
      schemas: `./generated/${family}/models`,
      headers: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: true,
          forceSuccessResponse: false,
          httpClientInjection: 'factory',
        },
      },
    },
  }]),
));

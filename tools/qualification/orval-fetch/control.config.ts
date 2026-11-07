import { readFileSync } from 'node:fs';
import { defineConfig } from 'orval';

const document = JSON.parse(readFileSync('./openapi.json', 'utf8'));
const schemas = document.components.schemas;
schemas.Error = schemas.Error.$defs.ErrorDetail;

export default defineConfig({
  control: {
    input: { target: document },
    output: { client: 'fetch', target: './generated/control/client.ts' },
  },
});

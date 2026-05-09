import { defineConfig } from 'orval';

export default defineConfig({
  gymApi: {
    input: {
      // Run `npm run api:gen` with backend running on port 9000
      target: 'http://localhost:9000/api/docs/swagger.json',
    },
    output: {
      mode: 'tags-split',           // one file per Swagger tag → src/api/generated/
      target: './src/api/generated',
      schemas: './src/api/generated/schemas',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          // Wraps our configured axios instance (auth token + silent refresh)
          path: './src/lib/orval-mutator.ts',
          name: 'orvalMutator',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
      },
    },
  },
});

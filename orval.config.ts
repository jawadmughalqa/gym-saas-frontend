import { defineConfig } from 'orval';

/**
 * Orval configuration for GymPro frontend API client generation.
 *
 * Usage:
 *   npm run api:gen          — regenerate from running backend (localhost:9000)
 *   npm run api:gen:file     — regenerate from local swagger.json snapshot
 *
 * Output:
 *   src/api/generated/       — one file per Swagger tag (tags-split mode)
 *   src/api/generated/schemas/ — all TypeScript types/interfaces
 *
 * Auth:
 *   Every request goes through orval-mutator.ts which attaches the Bearer
 *   token from our Zustand auth store automatically.
 *
 * Mutation vs Query classification:
 *   By default Orval marks all GET/HEAD/OPTIONS as queries, everything else
 *   as mutations. This is correct for our REST API.
 */
export default defineConfig({
  gymApi: {
    input: {
      // Run `npm run api:gen` with backend running on port 9000
      target: 'http://localhost:9000/api/docs/swagger.json',

      // Treat all validation warnings as non-fatal so a minor schema issue
      // does not block the entire generation run.
      validation: false,
    },
    output: {
      // one file per Swagger tag → src/api/generated/<tag>.ts
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/api/generated/schemas',

      client: 'react-query',
      httpClient: 'axios',

      // Keep generated files clean and deterministic across machines.
      prettier: true,

      // Overwrite existing files on each run so stale hooks are removed.
      override: {
        mutator: {
          // Our configured axios instance (auth header + silent-refresh queue).
          path: './src/lib/orval-mutator.ts',
          name: 'orvalMutator',
        },

        query: {
          // Generate useQuery hooks for GET endpoints.
          useQuery: true,
          // Generate useMutation hooks for POST/PUT/PATCH/DELETE endpoints.
          useMutation: true,
          // Pass AbortSignal so TanStack Query can cancel in-flight requests.
          signal: true,
          // useInfiniteQuery is not used in this project.
          useInfinite: false,
          // Use v5 query options (matches @tanstack/react-query v5)
          version: 5,
        },

        // Map OpenAPI operationId to a predictable camelCase function name.
        // Orval's default is already good but this makes it explicit.
        operationId: true,

        // When the API returns a union type via `oneOf`/`anyOf`, preserve it
        // rather than collapsing to `unknown`.
        useNamedParameters: false,
      },
    },
  },
});

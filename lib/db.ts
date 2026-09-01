import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | null = null;

function connect(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL is not set. Add it in Vercel > Settings > Environment Variables, ' +
          'or in .env for local development.',
      );
    }
    client = neon(url);
  }
  return client;
}

/**
 * Connects on first use rather than on import. Next.js loads every route module
 * during the build, so an eager connection would make the build fail whenever
 * the variable is absent — including on a fresh clone.
 *
 * Values in sql`...` are always parameterised, so it is injection-safe.
 * Never build a query by concatenating strings.
 */
export const sql = new Proxy(function () {} as unknown as NeonQueryFunction<false, false>, {
  apply: (_t, _this, args: [TemplateStringsArray, ...unknown[]]) =>
    (connect() as (...a: unknown[]) => unknown)(...args),
  get: (_t, prop: string) => (connect() as unknown as Record<string, unknown>)[prop],
});

/** Run work in fixed-size chunks, for batch inserts. */
export async function batch<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}

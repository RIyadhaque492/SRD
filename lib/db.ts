import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it in Vercel > Settings > Environment Variables.');
}

// Tagged-template client. Values are always parameterised, so `sql`...`` is
// injection-safe; never build a query by string concatenation.
export const sql = neon(process.env.DATABASE_URL);

/** Run many statements against one connection, for batch inserts. */
export async function batch<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}

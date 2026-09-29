// Vercel otherwise reports a successful deployment even when every DB request fails.
if (process.env.VERCEL === '1') {
  for (const name of ['DATABASE_URL', 'JWT_SECRET']) {
    if (!process.env[name]?.trim()) throw new Error(`Set a nonempty ${name} in Vercel before deploying.`);
  }
  let database;
  try { database = new URL(process.env.DATABASE_URL); } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string.');
  }
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname || database.pathname.length < 2) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  }
}

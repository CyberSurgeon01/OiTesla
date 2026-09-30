export function requireTestDatabase() {
  const database = new URL(process.env.DATABASE_URL || 'http://missing');
  if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/oitesla_api_test') {
    throw new Error('Integration tests require a local database named oitesla_api_test');
  }
}

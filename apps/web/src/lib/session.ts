export type StoredUser = {
  id: number;
  role: 'PASSENGER' | 'DRIVER';
  name?: string;
  email?: string;
};

export function readStoredUser(): StoredUser | null {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user && Number.isInteger(user.id) && ['PASSENGER', 'DRIVER'].includes(user.role)) return user;
  } catch {
    // A stale or damaged browser session should return to login, not crash React.
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return null;
}

/** Title-case a stored name so lowercase or shouty seed data still renders properly. */
export function displayName(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'Passenger';
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
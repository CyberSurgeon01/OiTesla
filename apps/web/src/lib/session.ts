export function readStoredUser() {
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

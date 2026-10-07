const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
export async function getHealth({ signal } = {}) {
  const response = await fetch(`${baseUrl}/api/health`, { signal });
  if (!response.ok) throw new Error(`Health request failed (${response.status}).`);
  return response.json();
}
export { baseUrl };

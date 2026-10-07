import { baseUrl } from './client';
import { getFirebaseServices } from '../firebase/config';

export async function authenticatedRequest(path, options = {}, { binary = false } = {}) {
  const user = getFirebaseServices()?.auth.currentUser;
  if (!user) throw new Error('Please log in to continue.');
  const token = await user.getIdToken();
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
      signal: options.signal || AbortSignal.timeout(30000),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Unable to complete the request (${response.status}). Please try again.`);
  }
  return binary ? response.blob() : response.json();
}

import { baseUrl } from '../../../services/api/client';
import { getFirebaseServices } from '../../../services/firebase/config';

const root = '/api/staff/resources-shelters';

// Staff sign-in is not built yet; a token is sent when a Firebase user exists so role claims work once it is.
async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = {};
  const user = getFirebaseServices()?.auth.currentUser;
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(`${baseUrl}${root}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal || AbortSignal.timeout(30000),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Unable to complete the request (${response.status}). Please try again.`);
    error.status = response.status;
    error.fields = data.errors;
    throw error;
  }
  return data;
}

const query = district => (district && district !== 'All' ? `?district=${encodeURIComponent(district)}` : '');

export const getOverview = (district, options) => request(`/overview${query(district)}`, options);
export const getAlerts = options => request('/alerts', options);
export const listShelters = (district, options) => request(`/shelters${query(district)}`, options);
export const getShelter = (id, options) => request(`/shelters/${encodeURIComponent(id)}`, options);
export const createShelter = body => request('/shelters', { method: 'POST', body });
export const updateShelter = (id, body) => request(`/shelters/${encodeURIComponent(id)}`, { method: 'PUT', body });
export const updateOccupancy = (id, occupied, expectedOccupancy) =>
  request(`/shelters/${encodeURIComponent(id)}/occupancy`, { method: 'PATCH', body: { occupied, expectedOccupancy } });
export const listResources = options => request('/resources', options);
export const createResource = body => request('/resources', { method: 'POST', body });
export const updateResource = (id, body) => request(`/resources/${encodeURIComponent(id)}`, { method: 'PUT', body });
export const listDistributions = (district, options) => request(`/distributions${query(district)}`, options);
export const allocateResources = body => request('/distributions', { method: 'POST', body });
export const updateDistributionStatus = (id, status) =>
  request(`/distributions/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } });

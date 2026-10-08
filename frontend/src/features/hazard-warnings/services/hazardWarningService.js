import { authenticatedRequest } from '../../../services/api/authenticatedClient';

const path = '/api/staff/warnings';

export function getHazardWarnings(filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined));
  return authenticatedRequest(`${path}?${params.toString()}`);
}

export function getHazardWarning(id) {
  return authenticatedRequest(`${path}/${encodeURIComponent(id)}`);
}

export function createHazardWarning(data) {
  return authenticatedRequest(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function escalateHazardWarning(id) {
  return authenticatedRequest(`${path}/${encodeURIComponent(id)}/escalate`, { method: 'POST' });
}

export function cancelHazardWarning(id) {
  return authenticatedRequest(`${path}/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
}

export function updateHazardWarning(id, data) {
  return authenticatedRequest(`${path}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

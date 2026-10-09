import { getFirebaseServices } from './firebase';
import { Platform } from 'react-native';

const baseUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8080').replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  const user = getFirebaseServices()?.auth.currentUser;
  if (!user) throw new Error('Please log in to continue.');
  const token = await user.getIdToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.message || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function getPublicProfile() {
  return apiRequest('/api/public/profile');
}

export async function getMyReports() {
  return apiRequest('/api/public/hazard-reports/my');
}

export async function getReport(id) {
  return apiRequest(`/api/public/hazard-reports/${encodeURIComponent(id)}`);
}

export async function submitHazardReport(data) {
  const body = new FormData();
  const reportJson = JSON.stringify({
    hazardType: data.hazardType,
    description: data.description.trim(),
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    dateTime: new Date(data.dateTime).toISOString(),
    clientRequestId: data.clientRequestId,
  });
  if (Platform.OS === 'web')
    body.append('report', new Blob([reportJson], { type: 'application/json' }), 'report.json');
  else
    body.append('report', { string: reportJson, type: 'application/json', name: 'report.json' });
  if (data.photo) {
    const type = data.photo.mimeType || 'image/jpeg';
    if (Platform.OS === 'web') {
      const photoResponse = await fetch(data.photo.uri);
      const blob = await photoResponse.blob();
      if (blob.size > 2 * 1024 * 1024)
        throw new Error('Photo is still larger than 2 MB. Choose a smaller image.');
      body.append('photo', new File([blob], 'hazard-photo.jpg', { type }));
    } else {
      body.append('photo', { uri: data.photo.uri, type, name: 'hazard-photo.jpg' });
    }
  }
  const user = getFirebaseServices()?.auth.currentUser;
  const token = await user.getIdToken();
  const response = await fetch(`${baseUrl}/api/public/hazard-reports`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || 'Your report could not be submitted.');
  }
  return response.json();
}

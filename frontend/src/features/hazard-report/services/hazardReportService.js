import { authenticatedRequest } from '../../../services/api/authenticatedClient';
import { isPublicRole } from '../../public-auth/services/validation';
import { validatePhoto, validateReport } from '../utils/reportValidation';
const path = '/api/public/hazard-reports';
function requireReporter(user) {
  if (!user?.id || !isPublicRole(user.role))
    throw new Error('Please log in with a citizen or community volunteer account.');
}
export async function submitHazardReport(data, user) {
  requireReporter(user);
  if (Object.keys(validateReport(data)).length)
    throw new Error('Complete the hazard details and location before submitting.');
  if (data.photo && validatePhoto(data.photo))
    throw new Error(validatePhoto(data.photo));
  const body = new FormData();
  body.append(
    'report',
    new Blob(
      [JSON.stringify(
        {
          hazardType: data.hazardType,
          description: data.description.trim(),
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          dateTime: new Date(data.dateTime).toISOString(),
          clientRequestId: data.clientRequestId,
        }
      )],
      { type: 'application/json' }
    )
  );
  if (data.photo)
    body.append('photo', data.photo);
  return authenticatedRequest(path, { method: 'POST', body });
}
export async function getMyReports(user) {
  requireReporter(user);
  return authenticatedRequest(`${path}/my`);
}
export async function getHazardReport(id, user) {
  requireReporter(user);
  return authenticatedRequest(`${path}/${encodeURIComponent(id)}`);
}

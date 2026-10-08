import { authenticatedRequest } from '../../../services/api/authenticatedClient';

const path = '/api/staff/hazard-reports';
export const getStaffHazardReports = () => authenticatedRequest(path);
export const getStaffHazardReport = id => authenticatedRequest(`${path}/${encodeURIComponent(id)}`);
export const verifyStaffHazardReport = id => authenticatedRequest(`${path}/${encodeURIComponent(id)}/verify`, { method: 'POST' });
export const rejectStaffHazardReport = (id, reason) => authenticatedRequest(`${path}/${encodeURIComponent(id)}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: reason.trim() }) });
export const getStaffHazardReportPhoto = id => authenticatedRequest(`${path}/${encodeURIComponent(id)}/photo`, {}, { binary: true });

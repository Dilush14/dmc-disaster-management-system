import { authenticatedRequest } from '../../../services/api/authenticatedClient';

async function getLiveData(path) {
  return { data: await authenticatedRequest(path), source: 'backend', notice: '' };
}

export const monitoringService = {
  getMonitoringSummary: () => getLiveData('/api/staff/monitoring'),
  getDistrictResponse: district => getLiveData(`/api/staff/monitoring/${encodeURIComponent(district)}`),
  getRealtimeMonitoringData: district => getLiveData(`/api/staff/monitoring/${encodeURIComponent(district)}/realtime`),
  getShelterMonitoring: district => getLiveData(`/api/staff/monitoring/${encodeURIComponent(district)}/resources`),
};

export default monitoringService;

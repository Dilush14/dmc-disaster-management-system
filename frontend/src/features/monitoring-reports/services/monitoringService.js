import { authenticatedRequest } from '../../../services/api/authenticatedClient';
import {
  getMonitoringSummary,
  getDistrictResponse,
  getRealtimeMonitoringData,
  getShelterMonitoring,
} from '../utils/monitoringReports.js';

async function getWithDemoFallback(path, demoFactory) {
  try {
    return { data: await authenticatedRequest(path), source: 'backend', notice: '' };
  } catch (error) {
    if (error.status === 401 || error.status === 403) throw error;
    if (![undefined, 404, 503].includes(error.status)) throw error;
    return {
      data: demoFactory(),
      source: 'demo',
      notice: 'Backend data is currently unavailable; clearly marked demo data is shown.',
    };
  }
}

export const monitoringService = {
  getMonitoringSummary: () => getWithDemoFallback('/api/staff/monitoring', getMonitoringSummary),
  getDistrictResponse: district => getWithDemoFallback(
    `/api/staff/monitoring/${encodeURIComponent(district)}`,
    () => getDistrictResponse(district),
  ),
  getRealtimeMonitoringData: district => getWithDemoFallback(
    `/api/staff/monitoring/${encodeURIComponent(district)}/realtime`,
    () => getRealtimeMonitoringData(district),
  ),
  getShelterMonitoring: district => getWithDemoFallback(
    `/api/staff/monitoring/${encodeURIComponent(district)}/resources`,
    () => getShelterMonitoring(district),
  ),
};

export default monitoringService;

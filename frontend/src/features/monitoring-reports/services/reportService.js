import { authenticatedRequest } from '../../../services/api/authenticatedClient';

export const reportService = {
  previewReport: config => authenticatedRequest('/api/staff/reports/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  }),
  generateReport: config => authenticatedRequest('/api/staff/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  }),
  getGeneratedReports: () => authenticatedRequest('/api/staff/reports'),
  getReportById: id => authenticatedRequest(`/api/staff/reports/${encodeURIComponent(id)}`),
};

export default reportService;

import { authenticatedRequest } from '../../../services/api/authenticatedClient';
import { generateReport, getGeneratedReports, getReportById } from '../utils/monitoringReports.js';

export const reportService = {
  generateReport: config => authenticatedRequest('/api/staff/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  }),
  getGeneratedReports: () => authenticatedRequest('/api/staff/reports'),
  getReportById: id => authenticatedRequest(`/api/staff/reports/${encodeURIComponent(id)}`),
  createPreview: generateReport,
  getDemoReports: getGeneratedReports,
  getDemoReportById: getReportById,
};

export default reportService;

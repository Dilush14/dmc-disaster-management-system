import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getMonitoringSummary,
  getDistrictResponse,
  getRealtimeMonitoringData,
  getShelterMonitoring,
  generateReport,
  getGeneratedReports,
  createReportConfig,
} from './monitoringReports.js';

test('getMonitoringSummary returns operational KPIs', () => {
  const summary = getMonitoringSummary();

  assert.ok(summary.activeWarnings >= 0);
  assert.ok(summary.verifiedReports >= 0);
  assert.ok(summary.activeShelters >= 0);
  assert.ok(summary.deployedTeams >= 0);
});

test('district response includes district details and key metrics', () => {
  const response = getDistrictResponse('Colombo');

  assert.equal(response.district, 'Colombo');
  assert.ok(response.summary);
  assert.ok(response.incidents.length > 0);
  assert.ok(response.statistics);
});

test('realtime monitoring exposes map layers and active items', () => {
  const data = getRealtimeMonitoringData('Colombo');

  assert.equal(data.district, 'Colombo');
  assert.ok(Array.isArray(data.layers));
  assert.ok(Array.isArray(data.activeItems));
});

test('shelter monitoring includes occupancy and status overview', () => {
  const monitoring = getShelterMonitoring('Colombo');

  assert.ok(monitoring.totalShelters >= 0);
  assert.ok(monitoring.activeShelters >= 0);
  assert.ok(Array.isArray(monitoring.shelters));
});

test('generateReport returns a properly structured report for configured content', () => {
  const report = generateReport({
    reportType: 'Incident Summary Report',
    district: 'Colombo',
    dateFrom: '2026-09-10',
    dateTo: '2026-09-20',
    selectedSections: ['Executive Summary', 'Alert Timeline', 'Shelter Occupancy', 'Resource Distribution'],
    includeCharts: true,
    includeMaps: true,
  });

  assert.equal(report.reportType, 'Incident Summary Report');
  assert.equal(report.district, 'Colombo');
  assert.ok(report.sections.length >= 4);
  assert.ok(report.alertTimeline.length > 0);
});

test('generated reports list includes recent records and history metadata', () => {
  const reports = getGeneratedReports();

  assert.ok(Array.isArray(reports));
  assert.ok(reports.length > 0);
  assert.ok(reports[0].reportName);
});

test('report config factory creates defaults and selected sections', () => {
  const config = createReportConfig();

  assert.equal(config.reportType, 'Incident Summary Report');
  assert.equal(config.district, 'All Districts');
  assert.ok(Array.isArray(config.selectedSections));
});

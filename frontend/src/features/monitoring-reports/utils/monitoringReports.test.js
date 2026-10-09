import test from 'node:test';
import assert from 'node:assert/strict';

import { createReportConfig, reportSectionOptions } from './monitoringReports.js';

test('report config defaults to a current date range and real operational sections', () => {
  const config = createReportConfig();
  const today = new Date().toISOString().slice(0, 10);

  assert.equal(config.reportType, 'Incident Summary Report');
  assert.equal(config.district, 'All Districts');
  assert.equal(config.dateTo, today);
  assert.ok(Array.isArray(config.selectedSections));
  assert.deepEqual(config.selectedSections, reportSectionOptions);
});

test('report config applies caller values without sharing mutable section arrays', () => {
  const selectedSections = ['Shelter Occupancy'];
  const config = createReportConfig({ dateFrom: '2026-09-01', dateTo: '2026-09-30', selectedSections });

  assert.equal(config.dateFrom, '2026-09-01');
  assert.deepEqual(config.selectedSections, selectedSections);
  assert.notEqual(config.selectedSections, selectedSections);
});

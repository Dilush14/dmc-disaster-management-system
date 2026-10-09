export const reportSectionOptions = [
  'Hazard Warnings',
  'Verified Hazard Reports',
  'Citizens Reached',
  'Shelter Occupancy',
  'Resource Distribution',
];

export function createReportConfig(overrides = {}) {
  const today = new Date();
  const dateTo = today.toISOString().slice(0, 10);
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  const dateFrom = start.toISOString().slice(0, 10);
  const defaults = {
    reportType: 'Incident Summary Report',
    district: 'All Districts',
    dateFrom,
    dateTo,
    selectedSections: [...reportSectionOptions],
    includeCharts: true,
    includeMaps: true,
    includeRawData: false,
    includeAppendix: false,
    reportFormat: 'PDF',
  };

  return {
    ...defaults,
    ...overrides,
    selectedSections: overrides.selectedSections ? [...overrides.selectedSections] : [...defaults.selectedSections],
  };
}

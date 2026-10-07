import {
  monitoringSummary,
  districtResponses,
  realtimeMonitoringData,
  shelterMonitoringData,
  generatedReports,
  reportDefaults,
  alertTimeline,
  citizensReached,
  shelterOccupancyHistory,
  resourceDistributionByDistrict,
} from '../data/monitoringMockData.js';

export function createReportConfig(overrides = {}) {
  return {
    ...reportDefaults,
    ...overrides,
    selectedSections: overrides.selectedSections ? [...overrides.selectedSections] : [...reportDefaults.selectedSections],
  };
}

export function getMonitoringSummary() {
  return { ...monitoringSummary };
}

export function getDistrictResponse(district = 'Colombo') {
  const response = districtResponses[district] || districtResponses.Colombo;
  return {
    ...response,
    summary: { ...response.summary },
    statistics: { ...response.statistics },
    incidents: response.incidents.map(incident => ({ ...incident })),
    warningHistory: response.warningHistory.map(item => ({ ...item })),
  };
}

export function getRealtimeMonitoringData(district = 'Colombo') {
  const data = realtimeMonitoringData[district] || realtimeMonitoringData.Colombo;
  return {
    district: data.district,
    layers: [...data.layers],
    activeItems: data.activeItems.map(item => ({ ...item })),
  };
}

export function getShelterMonitoring(district = 'Colombo') {
  const data = shelterMonitoringData[district] || shelterMonitoringData.Colombo;
  return {
    district: data.district,
    totalShelters: data.totalShelters,
    activeShelters: data.activeShelters,
    totalCapacity: data.totalCapacity,
    currentOccupancy: data.currentOccupancy,
    shelters: data.shelters.map(shelter => ({ ...shelter })),
    statusBreakdown: data.statusBreakdown.map(item => ({ ...item })),
  };
}

export function getGeneratedReports() {
  return generatedReports.map(report => ({ ...report }));
}

export function getReportById(id) {
  return getGeneratedReports().find(report => report.id === id) || null;
}

export function generateReport(config = {}) {
  const reportConfig = createReportConfig(config);
  const sectionSet = reportConfig.selectedSections.length > 0 ? reportConfig.selectedSections : reportDefaults.selectedSections;

  const report = {
    id: `RPT-${Date.now()}`,
    reportType: reportConfig.reportType,
    district: reportConfig.district,
    period: `${reportConfig.dateFrom} to ${reportConfig.dateTo}`,
    generatedOn: new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    generatedBy: 'DMC Officer',
    sections: sectionSet,
    alertTimeline: alertTimeline.map(item => ({ ...item })),
    citizensReached: citizensReached.map(item => ({ ...item })),
    shelterOccupancy: shelterOccupancyHistory.map(item => ({ ...item })),
    resourceDistribution: resourceDistributionByDistrict.map(item => ({ ...item })),
    includeCharts: reportConfig.includeCharts,
    includeMaps: reportConfig.includeMaps,
    includeRawData: reportConfig.includeRawData,
    includeAppendix: reportConfig.includeAppendix,
    reportFormat: reportConfig.reportFormat,
  };

  return report;
}

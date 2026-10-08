export const districts = ['Colombo', 'Gampaha', 'Kandy', 'Matara', 'Kurunegala', 'Jaffna'];

export const monitoringSummary = {
  activeWarnings: 12,
  verifiedReports: 28,
  activeShelters: 8,
  deployedTeams: 14,
  affectedPopulation: 246500,
  lastUpdated: '2026-09-20 10:45 AM',
  recentActivity: [
    { id: 1, type: 'Warning issued', district: 'Colombo', detail: 'Flood warning escalated for Colombo South', time: '10:45 AM' },
    { id: 2, type: 'Verified report', district: 'Kandy', detail: 'Landslide report validated by field team', time: '09:52 AM' },
    { id: 3, type: 'Shelter activated', district: 'Matara', detail: 'Temporary shelter opened with 220 occupants', time: '08:20 AM' },
    { id: 4, type: 'Team deployed', district: 'Gampaha', detail: 'Rescue team deployed to drainage overflow site', time: '07:36 AM' },
    { id: 5, type: 'Resource allocated', district: 'Jaffna', detail: 'Water packs dispatched to relief points', time: '06:58 AM' },
  ],
  hazardsByType: [
    { type: 'Flood', count: 12 },
    { type: 'Heavy Rainfall', count: 8 },
    { type: 'Landslide', count: 5 },
    { type: 'Strong Winds', count: 3 },
  ],
  reportsByStatus: [
    { status: 'Verified', count: 28 },
    { status: 'Pending', count: 9 },
    { status: 'Rejected', count: 2 },
  ],
};

export const districtResponses = {
  Colombo: {
    district: 'Colombo',
    summary: {
      activeWarnings: 8,
      verifiedReports: 17,
      activeShelters: 3,
      affectedPopulation: 124500,
      deployedTeams: 6,
    },
    incidents: [
      { type: 'Flood', location: 'Wellawatte', severity: 'High', status: 'Monitoring', reportedOn: '2026-09-20' },
      { type: 'Heavy Rainfall', location: 'Kolonnawa', severity: 'Moderate', status: 'Active', reportedOn: '2026-09-19' },
      { type: 'Landslide', location: 'Nugegoda', severity: 'High', status: 'Critical', reportedOn: '2026-09-18' },
      { type: 'Strong Winds', location: 'Borella', severity: 'Moderate', status: 'Stable', reportedOn: '2026-09-17' },
    ],
    statistics: {
      gramaNiladhariDivisions: 18,
      displacedPeople: 3200,
      damagedHouses: 274,
      roadClosures: 6,
      powerInterruptions: 12,
      schoolsClosed: 4,
    },
    warningHistory: [
      { title: 'Flood advisory', status: 'Active', date: '2026-09-20' },
      { title: 'Heavy rain watch', status: 'Monitoring', date: '2026-09-18' },
      { title: 'Landslide warning', status: 'Resolved', date: '2026-09-15' },
    ],
    resourceSummary: {
      totalResources: 42,
      available: 31,
      dispatched: 9,
      critical: 2,
    },
  },
  Kandy: {
    district: 'Kandy',
    summary: {
      activeWarnings: 3,
      verifiedReports: 8,
      activeShelters: 2,
      affectedPopulation: 45300,
      deployedTeams: 4,
    },
    incidents: [
      { type: 'Landslide', location: 'Peradeniya', severity: 'High', status: 'Active', reportedOn: '2026-09-17' },
      { type: 'Strong Winds', location: 'Akurana', severity: 'Moderate', status: 'Monitoring', reportedOn: '2026-09-16' },
    ],
    statistics: {
      gramaNiladhariDivisions: 9,
      displacedPeople: 1200,
      damagedHouses: 86,
      roadClosures: 2,
      powerInterruptions: 3,
      schoolsClosed: 1,
    },
    warningHistory: [
      { title: 'Landslide alert', status: 'Active', date: '2026-09-17' },
      { title: 'Rain advisory', status: 'Monitoring', date: '2026-09-12' },
    ],
    resourceSummary: {
      totalResources: 24,
      available: 17,
      dispatched: 6,
      critical: 1,
    },
  },
  Gampaha: {
    district: 'Gampaha',
    summary: {
      activeWarnings: 5,
      verifiedReports: 10,
      activeShelters: 3,
      affectedPopulation: 67200,
      deployedTeams: 5,
    },
    incidents: [
      { type: 'Flood', location: 'Ja-Ela', severity: 'Moderate', status: 'Active', reportedOn: '2026-09-18' },
      { type: 'Heavy Rainfall', location: 'Ragama', severity: 'Moderate', status: 'Monitoring', reportedOn: '2026-09-20' },
    ],
    statistics: {
      gramaNiladhariDivisions: 12,
      displacedPeople: 1800,
      damagedHouses: 124,
      roadClosures: 4,
      powerInterruptions: 5,
      schoolsClosed: 2,
    },
    warningHistory: [
      { title: 'Flood warning', status: 'Active', date: '2026-09-20' },
      { title: 'Drainage alert', status: 'Monitoring', date: '2026-09-16' },
    ],
    resourceSummary: {
      totalResources: 28,
      available: 22,
      dispatched: 5,
      critical: 1,
    },
  },
};

export const realtimeMonitoringData = {
  Colombo: {
    district: 'Colombo',
    layers: [
      'Hazard Warnings',
      'Hazard Reports',
      'Shelters',
      'Deployed Teams',
      'Road Status',
      'Weather Radar',
      'River Levels',
      'District Boundaries',
    ],
    activeItems: [
      { id: 1, type: 'Warning', label: 'Flood Warning', location: 'Wellawatte', severity: 'High', time: '10:45 AM' },
      { id: 2, type: 'Report', label: 'Flooding report', location: 'Colombo Fort', severity: 'Moderate', time: '09:30 AM' },
      { id: 3, type: 'Shelter', label: 'Maharagama Shelter', location: 'Maharagama', severity: 'Stable', time: '08:15 AM' },
      { id: 4, type: 'Team', label: 'Rescue Team 4', location: 'Kolonnawa', severity: 'Deployed', time: '07:50 AM' },
    ],
  },
  Kandy: {
    district: 'Kandy',
    layers: ['Hazard Warnings', 'Hazard Reports', 'Shelters', 'Deployed Teams'],
    activeItems: [
      { id: 1, type: 'Warning', label: 'Landslide Warning', location: 'Peradeniya', severity: 'High', time: '09:10 AM' },
      { id: 2, type: 'Shelter', label: 'Kandy East Shelter', location: 'Kandy East', severity: 'Active', time: '08:00 AM' },
    ],
  },
};

export const shelterMonitoringData = {
  Colombo: {
    district: 'Colombo',
    totalShelters: 25,
    activeShelters: 12,
    totalCapacity: 8540,
    currentOccupancy: 5230,
    shelters: [
      { name: 'Colombo Central School', district: 'Colombo', capacity: 1000, occupied: 680, status: 'Active' },
      { name: 'Gampaha Community Hall', district: 'Gampaha', capacity: 800, occupied: 520, status: 'Active' },
      { name: 'Kandy Civic Centre', district: 'Kandy', capacity: 600, occupied: 420, status: 'Full' },
      { name: 'Matara Town Hall', district: 'Matara', capacity: 1200, occupied: 300, status: 'Inactive' },
    ],
    statusBreakdown: [
      { status: 'Active', count: 12 },
      { status: 'Full', count: 5 },
      { status: 'Inactive', count: 8 },
    ],
  },
};

export const reportSectionOptions = [
  'Executive Summary',
  'Hazard Warnings',
  'Verified Hazard Reports',
  'Citizens Reached',
  'Shelter Occupancy',
  'Resource Distribution',
  'Response Teams',
  'Infrastructure Impact',
  'Maps & Visualizations',
  'Recommendations',
];

export const generatedReports = [
  { id: 'RPT-2026-001', reportName: 'Disaster Response Report', type: 'Incident Summary Report', period: '10 Sep 2026 - 16 Sep 2026', generatedOn: '16 Sep 2026', district: 'All Districts', status: 'Ready' },
  { id: 'RPT-2026-002', reportName: 'Colombo District Report', type: 'District-Wide Report', period: '01 Sep 2026 - 15 Sep 2026', generatedOn: '15 Sep 2026', district: 'Colombo', status: 'Ready' },
  { id: 'RPT-2026-003', reportName: 'Shelter Status Report', type: 'Resource & Shelter Report', period: '05 Sep 2026 - 12 Sep 2026', generatedOn: '12 Sep 2026', district: 'Kandy', status: 'Ready' },
];

export const reportDefaults = {
  reportType: 'Incident Summary Report',
  district: 'All Districts',
  dateFrom: '2026-09-10',
  dateTo: '2026-09-20',
  selectedSections: [
    'Executive Summary',
    'Hazard Warnings',
    'Verified Hazard Reports',
    'Citizens Reached',
    'Shelter Occupancy',
    'Resource Distribution',
  ],
  includeCharts: true,
  includeMaps: true,
  includeRawData: false,
  includeAppendix: false,
  reportFormat: 'PDF',
};

export const alertTimeline = [
  { title: 'Warning created', date: '2026-09-10', type: 'Warning' },
  { title: 'Warning updated', date: '2026-09-12', type: 'Warning' },
  { title: 'Warning escalated', date: '2026-09-15', type: 'Alert' },
  { title: 'Relief dispatched', date: '2026-09-18', type: 'Resource' },
  { title: 'Warning cancelled', date: '2026-09-20', type: 'Closure' },
];

export const shelterOccupancyHistory = [
  { period: 'Week 1', occupancy: 48 },
  { period: 'Week 2', occupancy: 54 },
  { period: 'Week 3', occupancy: 62 },
  { period: 'Week 4', occupancy: 58 },
];

export const resourceDistributionByDistrict = [
  { district: 'Colombo', resource: 'Water packs', quantity: 1200, destination: 'Wellawatte', organization: 'DMC', time: '2026-09-19 10:30' },
  { district: 'Kandy', resource: 'Food rations', quantity: 980, destination: 'Peradeniya', organization: 'Red Cross', time: '2026-09-18 14:20' },
  { district: 'Gampaha', resource: 'Medical kits', quantity: 240, destination: 'Ragama', organization: 'Health Department', time: '2026-09-20 07:00' },
];

export const citizensReached = [
  { label: 'Food Assistance', value: 21400 },
  { label: 'Water Supply', value: 18300 },
  { label: 'Medical Care', value: 9600 },
  { label: 'Shelter Support', value: 12600 },
];

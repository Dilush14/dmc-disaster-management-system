export const warningTypes = [
  { name: 'Flood', icon: '≋', color: 'blue' },
  { name: 'Heavy Rainfall', icon: '☁', color: 'slate' },
  { name: 'Landslide', icon: '▲', color: 'amber' },
  { name: 'Strong Winds', icon: '≋', color: 'teal' },
  { name: 'Other', icon: '•••', color: 'slate' },
];

export const affectedDistricts = ['Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya'];

export const warnings = [
  { id: 'HW-2026-015', type: 'Flood', area: 'Colombo District', severity: 'Severe', status: 'Active', validUntil: '16 Sep 2026, 09:00 AM', issuedOn: '15 Sep 2026, 10:00 AM', title: 'Heavy rainfall and flooding expected', message: 'Heavy rainfall is expected in Colombo District. There is a high risk of flooding in low-lying areas. Please take necessary precautions and follow official updates.', recipients: '125,340' },
  { id: 'HW-2026-014', type: 'Heavy Rainfall', area: 'Gampaha District', severity: 'Medium', status: 'Active', validUntil: '16 Sep 2026, 09:00 AM', issuedOn: '15 Sep 2026, 08:30 AM', title: 'Heavy rainfall expected', message: 'Heavy rainfall is expected across the affected areas. Residents are advised to remain alert and follow official guidance.', recipients: '98,560' },
  { id: 'HW-2026-013', type: 'Landslide', area: 'Kandy District', severity: 'High', status: 'Expired', validUntil: '15 Sep 2026, 06:00 PM', issuedOn: '15 Sep 2026, 06:00 AM', title: 'Landslide risk in affected areas', message: 'Residents in vulnerable slopes are advised to stay alert and avoid unnecessary travel.', recipients: '76,230' },
];

export const districtCoordinates = {
  Colombo: [6.9271, 79.8612],
  Gampaha: [7.0873, 80.0144],
  Kalutara: [6.5854, 79.9607],
  Kandy: [7.2906, 80.6337],
  Matale: [7.4675, 80.6234],
  'Nuwara Eliya': [6.9497, 80.7891],
};

export function warningPosition(warning) {
  const area = warning.area || warning.affectedAreas?.[0] || '';
  const district = Object.keys(districtCoordinates).find(name => area.toLowerCase().includes(name.toLowerCase()));
  return district ? districtCoordinates[district] : null;
}

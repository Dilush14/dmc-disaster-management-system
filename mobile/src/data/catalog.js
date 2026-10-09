export const hazards = [
  ['FLOOD', 'Flood', 'Water covering roads, homes, or public areas'],
  ['LANDSLIDE', 'Landslide', 'Rock, soil, or debris moving down a slope'],
  ['ROAD_BLOCKAGE', 'Road blockage', 'A blocked or unsafe road'],
  ['FALLEN_TREE', 'Fallen tree', 'A fallen tree creating a hazard'],
  ['FIRE', 'Fire', 'An active fire or fire damage'],
  ['BUILDING_DAMAGE', 'Building damage', 'Unsafe or damaged structures'],
  ['OTHER', 'Other', 'Another hazard requiring attention'],
];

export const hazardLabel = value => hazards.find(item => item[0] === value)?.[1] || 'Other';
export const statusLabel = value => ({ PENDING_VERIFICATION: 'Pending verification', VERIFIED: 'Verified', REJECTED: 'Rejected', SUSPICIOUS: 'Suspicious' }[value] || value || 'Unknown');

import { Waves, Mountain, Construction, TreePine, Flame, Building2, Ellipsis } from 'lucide-react';
export const hazards = [
  { value: 'FLOOD', label: 'Flood', icon: Waves, tone: 'blue' },
  { value: 'LANDSLIDE', label: 'Landslide', icon: Mountain, tone: 'brown' },
  { value: 'ROAD_BLOCKAGE', label: 'Road Blockage', icon: Construction, tone: 'slate' },
  { value: 'FALLEN_TREE', label: 'Fallen Tree', icon: TreePine, tone: 'green' },
  { value: 'FIRE', label: 'Fire', icon: Flame, tone: 'red' },
  { value: 'BUILDING_DAMAGE', label: 'Building Damage', icon: Building2, tone: 'blue' },
  { value: 'OTHER', label: 'Other', icon: Ellipsis, tone: 'slate' },
];
export const hazardLabel = value => hazards.find(hazard => hazard.value === value)?.label || 'Other';
export const statuses = {
  PENDING_VERIFICATION: { label: 'Pending', tone: 'pending' },
  VERIFIED: { label: 'Verified', tone: 'verified' },
  REJECTED: { label: 'Rejected', tone: 'rejected' },
  SUSPICIOUS: { label: 'Suspicious', tone: 'suspicious' },
};

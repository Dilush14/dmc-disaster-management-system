export default function HazardTypeCard({ hazard, selected, onSelect }) {
  const Icon = hazard.icon;
  return <label className={`hazard-type-card ${selected ? 'selected' : ''}`}><input type="radio" name="hazardType" value={hazard.value} checked={selected} onChange={() => onSelect(hazard.value)}/><Icon size={33} className={`tone-${hazard.tone}`}/><span>{hazard.label}</span></label>;
}

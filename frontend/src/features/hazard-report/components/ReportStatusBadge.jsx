import { statuses } from '../data/catalog';
export default function ReportStatusBadge({ status }) {
  const item = statuses[status] || { label: 'Unknown', tone: 'unknown' };
  return <span className={`report-status ${item.tone}`}>{item.label}</span>;
}

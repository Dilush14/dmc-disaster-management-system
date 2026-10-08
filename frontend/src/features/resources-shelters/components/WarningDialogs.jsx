import { AlertOctagon, AlertTriangle } from 'lucide-react';
import { Modal, PrimaryButton, SecondaryButton } from './ui';

function Details({ rows }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-xl bg-slate-50 p-3 text-sm">
      {rows.map(([label, value, strong]) => (
        <div key={label} className="contents">
          <dt className="text-slate-500">{label}:</dt>
          <dd className={strong ? 'font-bold text-rose-600' : 'font-semibold text-slate-800'}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Suggestions({ items }) {
  return (
    <div className="mt-4 text-sm">
      <div className="font-semibold text-slate-800">Suggested Actions:</div>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">{items.map(item => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

/** Wireframe 9: the expected number of people exceeds the shelter's available space. */
export function CapacityWarningDialog({ warning, onClose, onViewAlternatives }) {
  return (
    <Modal
      title="Insufficient Shelter Capacity"
      tone="amber"
      icon={<AlertTriangle size={28} />}
      onClose={onClose}
      footer={<><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><PrimaryButton onClick={onViewAlternatives}>View Alternative Shelters</PrimaryButton></>}
    >
      <p className="mb-3 text-sm text-slate-600">The selected shelter does not have enough available capacity for the expected number of people.</p>
      <Details rows={[
        ['Shelter', warning.shelter],
        ['Total Capacity', warning.capacity.toLocaleString()],
        ['Current Occupied', `${warning.occupied.toLocaleString()} (${warning.rate}%)`],
        ['Available Capacity', warning.available.toLocaleString()],
        ['Expected People', warning.expected.toLocaleString()],
      ]} />
      <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
        The expected number of people exceeds the available capacity by {warning.shortfall.toLocaleString()} people.
      </div>
      <Suggestions items={['Select an alternative shelter', 'Consider opening an additional shelter', 'Reduce the number of people or split across multiple shelters']} />
    </Modal>
  );
}

/** Wireframe 10: a requested quantity exceeds available stock. */
export function StockWarningDialog({ warning, onClose, onAdjust }) {
  return (
    <Modal
      title="Insufficient Resource Stock"
      tone="red"
      icon={<AlertOctagon size={28} />}
      onClose={onClose}
      footer={<><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><PrimaryButton onClick={onAdjust}>Adjust Quantity</PrimaryButton></>}
    >
      <p className="mb-3 text-sm text-slate-600">The selected resource does not have enough available quantity.</p>
      <Details rows={[
        ['Resource', warning.resource],
        ['Requested Quantity', warning.requested.toLocaleString()],
        ['Available Quantity', warning.available.toLocaleString()],
        ['Shortage', warning.shortage.toLocaleString(), true],
      ]} />
      <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
        The requested quantity exceeds the available stock by {warning.shortage.toLocaleString()} units.
      </div>
      <Suggestions items={['Reduce the allocation quantity', 'Check other available resources', 'Request additional supplies', 'Contact partner organizations']} />
    </Modal>
  );
}

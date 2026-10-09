import { useState } from 'react';
import { DISTRICTS, FACILITIES, RESOURCE_CATEGORIES, SHELTER_TYPES, validateResourceForm, validateShelterForm } from '../utils/resourcesShelters';
import { createResource, createShelter, updateResource, updateShelter } from '../services/resourcesSheltersService';
import { ErrorBanner, Field, inputClass, Modal, PrimaryButton, SecondaryButton } from './ui';

function useSubmit(onSaved) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [serverErrors, setServerErrors] = useState({});
  const submit = async action => {
    setSaving(true);
    setError('');
    try {
      onSaved(await action());
    } catch (failure) {
      setError(failure.message);
      setServerErrors(failure.fields || {});
    } finally {
      setSaving(false);
    }
  };
  return { saving, error, serverErrors, submit };
}

export function ShelterFormDialog({ shelter, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: shelter?.name || '',
    district: shelter?.district || '',
    address: shelter?.address || '',
    shelterType: shelter?.shelterType || '',
    managingOrganization: shelter?.managingOrganization || 'DMC',
    contactPerson: shelter?.contactPerson || '',
    contactNumber: shelter?.contactNumber || '',
    capacity: shelter?.capacity ?? '',
    active: shelter?.active ?? true,
    facilities: shelter?.facilities || [],
  }));
  const [errors, setErrors] = useState({});
  const { saving, error, serverErrors, submit } = useSubmit(onSaved);
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  const toggleFacility = facility => setForm(current => ({
    ...current,
    facilities: current.facilities.includes(facility) ? current.facilities.filter(item => item !== facility) : [...current.facilities, facility],
  }));
  const save = () => {
    const found = validateShelterForm({ ...form, occupied: shelter?.occupied });
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = { ...form, capacity: Number(form.capacity) };
    submit(() => (shelter ? updateShelter(shelter.id, body) : createShelter(body)));
  };
  const fieldError = key => errors[key] || serverErrors[key];

  return (
    <Modal
      title={shelter ? 'Edit Shelter' : 'Register New Shelter'}
      onClose={onClose}
      footer={<><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><PrimaryButton disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save Shelter'}</PrimaryButton></>}
    >
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Shelter Name" required error={fieldError('name')}><input className={inputClass} value={form.name} onChange={set('name')} /></Field></div>
        <Field label="District" required error={fieldError('district')}>
          <select className={inputClass} value={form.district} onChange={set('district')}><option value="">Select district</option>{DISTRICTS.map(item => <option key={item}>{item}</option>)}</select>
        </Field>
        <Field label="Shelter Type" required error={fieldError('shelterType')}>
          <select className={inputClass} value={form.shelterType} onChange={set('shelterType')}><option value="">Select type</option>{SHELTER_TYPES.map(item => <option key={item}>{item}</option>)}</select>
        </Field>
        <div className="sm:col-span-2"><Field label="Address" required error={fieldError('address')}><input className={inputClass} value={form.address} onChange={set('address')} /></Field></div>
        <Field label="Capacity" required error={fieldError('capacity')}><input type="number" min="1" className={inputClass} value={form.capacity} onChange={set('capacity')} /></Field>
        <Field label="Managing Organization" error={fieldError('managingOrganization')}><input className={inputClass} value={form.managingOrganization} onChange={set('managingOrganization')} /></Field>
        <Field label="Contact Person" error={fieldError('contactPerson')}><input className={inputClass} value={form.contactPerson} onChange={set('contactPerson')} /></Field>
        <Field label="Contact Number" error={fieldError('contactNumber')}><input className={inputClass} value={form.contactNumber} onChange={set('contactNumber')} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
          <input type="checkbox" checked={form.active} onChange={event => setForm(current => ({ ...current, active: event.target.checked }))} />
          Shelter is active and can receive evacuees
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1 text-sm font-semibold text-slate-700">Facilities Available</legend>
          <div className="grid grid-cols-2 gap-1 text-sm text-slate-700">
            {FACILITIES.map(facility => (
              <label key={facility} className="flex items-center gap-2"><input type="checkbox" checked={form.facilities.includes(facility)} onChange={() => toggleFacility(facility)} />{facility}</label>
            ))}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}

export function ResourceFormDialog({ resource, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: resource?.name || '',
    category: resource?.category || '',
    unit: resource?.unit || '',
    totalQuantity: resource?.totalQuantity ?? '',
    available: resource?.available ?? '',
    lowStockThreshold: resource?.lowStockThreshold ?? '',
  }));
  const [errors, setErrors] = useState({});
  const { saving, error, serverErrors, submit } = useSubmit(onSaved);
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  const save = () => {
    const found = validateResourceForm(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = { ...form, totalQuantity: Number(form.totalQuantity), available: Number(form.available), lowStockThreshold: Number(form.lowStockThreshold) };
    submit(() => (resource ? updateResource(resource.id, body) : createResource(body)));
  };
  const fieldError = key => errors[key] || serverErrors[key];

  return (
    <Modal
      title={resource ? 'Update Resource Stock' : 'Add Resource'}
      onClose={onClose}
      footer={<><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><PrimaryButton disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save Resource'}</PrimaryButton></>}
    >
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Item Name" required error={fieldError('name')}><input className={inputClass} value={form.name} onChange={set('name')} /></Field></div>
        <Field label="Category" required error={fieldError('category')}>
          <select className={inputClass} value={form.category} onChange={set('category')}><option value="">Select category</option>{RESOURCE_CATEGORIES.map(item => <option key={item}>{item}</option>)}</select>
        </Field>
        <Field label="Unit" required error={fieldError('unit')}><input className={inputClass} placeholder="Pack, Kit, Piece…" value={form.unit} onChange={set('unit')} /></Field>
        <Field label="Total Quantity" required error={fieldError('totalQuantity')}><input type="number" min="0" className={inputClass} value={form.totalQuantity} onChange={set('totalQuantity')} /></Field>
        <Field label="Available" required error={fieldError('available')}><input type="number" min="0" className={inputClass} value={form.available} onChange={set('available')} /></Field>
        <Field label="Low Stock Threshold" required error={fieldError('lowStockThreshold')}><input type="number" min="0" className={inputClass} value={form.lowStockThreshold} onChange={set('lowStockThreshold')} /></Field>
      </div>
    </Modal>
  );
}

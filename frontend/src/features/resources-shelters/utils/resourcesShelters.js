export const RESOURCE_CATEGORIES = ['Food & Water', 'Medical Supplies', 'Relief Items', 'Equipment'];
export const TRANSPORT_METHODS = ['DMC Vehicle', 'Military Transport', 'Partner Vehicle', 'Boat', 'Air Lift'];
export const SHELTER_TYPES = ['School', 'Community Hall', 'Sports Complex', 'Religious Site', 'Other'];
export const FACILITIES = ['Sleeping Area', 'Toilets', 'Clean Water', 'Electricity', 'Food Distribution', 'Medical Room', 'Disabled Access', 'Kitchen', 'Security', 'Internet'];
export const DISTRICTS = ['Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'];

export function availableSpace(shelter) {
  return Math.max(0, Number(shelter.capacity || 0) - Number(shelter.occupied || 0));
}

export function occupancyRate(occupied, capacity) {
  return capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
}

/** Map legend bands used on the dashboard: >90 critical, 70-90 high, 40-70 medium, <40 low. */
export function occupancyBand(rate) {
  if (rate > 90) return 'critical';
  if (rate >= 70) return 'high';
  if (rate >= 40) return 'medium';
  return 'low';
}

/** Returns null when the shelter can take the expected people, otherwise the details for the warning dialog. */
export function checkShelterCapacity(shelter, expectedPeople) {
  const available = availableSpace(shelter);
  const expected = Number(expectedPeople || 0);
  if (expected <= available) return null;
  return {
    shelter: shelter.name,
    capacity: shelter.capacity,
    occupied: shelter.occupied,
    rate: occupancyRate(shelter.occupied, shelter.capacity),
    available,
    expected,
    shortfall: expected - available,
  };
}

/** Returns the first selected item whose requested quantity exceeds stock, for the stock warning dialog. */
export function checkStock(selection, resources) {
  for (const [resourceId, quantity] of Object.entries(selection)) {
    const resource = resources.find(item => item.id === resourceId);
    if (!resource) continue;
    if (Number(quantity) > Number(resource.available)) {
      return { resourceId, resource: resource.name, requested: Number(quantity), available: Number(resource.available), shortage: Number(quantity) - Number(resource.available) };
    }
  }
  return null;
}

export function validateResourceSelection(selection) {
  const entries = Object.entries(selection);
  if (!entries.length) return 'Select at least one resource to allocate.';
  for (const [, quantity] of entries) {
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) return 'Allocation quantities must be whole numbers greater than zero.';
  }
  return '';
}

export function validateOccupancy(value, shelter) {
  if (value === '' || value === null || value === undefined) return 'Current occupied is required.';
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return 'Enter a whole number of 0 or more.';
  if (shelter && !shelter.active) return 'This shelter is inactive.';
  return '';
}

export function validateAllocationDetails(details, today = new Date().toISOString().slice(0, 10)) {
  const errors = {};
  if (!details.distributionDate) errors.distributionDate = 'Distribution date is required.';
  else if (details.distributionDate < today) errors.distributionDate = 'Distribution date cannot be in the past.';
  if (!TRANSPORT_METHODS.includes(details.transportMethod)) errors.transportMethod = 'Select a transport method.';
  if ((details.notes || '').length > 300) errors.notes = 'Notes must be 300 characters or fewer.';
  if (details.expectedPeople !== '' && details.expectedPeople !== undefined) {
    const people = Number(details.expectedPeople);
    if (!Number.isInteger(people) || people < 0) errors.expectedPeople = 'Enter a whole number of 0 or more.';
  }
  return errors;
}

export function validateShelterForm(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Shelter name is required.';
  if (!DISTRICTS.includes(form.district)) errors.district = 'Select a district.';
  if (!form.address?.trim()) errors.address = 'Address is required.';
  if (!form.shelterType) errors.shelterType = 'Select a shelter type.';
  const capacity = Number(form.capacity);
  if (!Number.isInteger(capacity) || capacity < 1) errors.capacity = 'Capacity must be a whole number above zero.';
  else if (form.occupied !== undefined && capacity < Number(form.occupied)) errors.capacity = `Capacity cannot be lower than current occupancy (${form.occupied}).`;
  if (form.contactNumber && !/^[0-9 +()-]{7,20}$/.test(form.contactNumber)) errors.contactNumber = 'Enter a valid phone number.';
  return errors;
}

export function validateResourceForm(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Item name is required.';
  if (!RESOURCE_CATEGORIES.includes(form.category)) errors.category = 'Select a category.';
  if (!form.unit?.trim()) errors.unit = 'Unit is required.';
  for (const key of ['totalQuantity', 'available', 'lowStockThreshold']) {
    const value = Number(form[key]);
    if (form[key] === '' || !Number.isInteger(value) || value < 0) errors[key] = 'Enter a whole number of 0 or more.';
  }
  if (!errors.available && !errors.totalQuantity && Number(form.available) > Number(form.totalQuantity)) errors.available = 'Available cannot exceed total quantity.';
  return errors;
}

export function filterShelters(shelters, { query = '', district = 'All', status = 'All' } = {}) {
  const text = query.trim().toLowerCase();
  return shelters.filter(shelter =>
    (!text || shelter.name.toLowerCase().includes(text) || shelter.district.toLowerCase().includes(text))
    && (district === 'All' || shelter.district === district)
    && (status === 'All' || shelter.status === status));
}

export function filterResources(resources, { query = '', category = 'All', status = 'All' } = {}) {
  const text = query.trim().toLowerCase();
  return resources.filter(resource =>
    (!text || resource.name.toLowerCase().includes(text))
    && (category === 'All' || resource.category === category)
    && (status === 'All' || resource.status === status));
}

export function filterDistributions(rows, { query = '', resource = 'All', district = 'All', from = '', to = '' } = {}) {
  const text = query.trim().toLowerCase();
  return rows.filter(row =>
    (!text || row.shelterName.toLowerCase().includes(text) || row.items.some(item => item.name.toLowerCase().includes(text)))
    && (resource === 'All' || row.items.some(item => item.name === resource))
    && (district === 'All' || row.district === district)
    && (!from || row.distributionDate >= from)
    && (!to || row.distributionDate <= to));
}

export function paginate(rows, page, pageSize = 8) {
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), page: current, pages, start: rows.length ? start + 1 : 0, end: Math.min(start + pageSize, rows.length), total: rows.length };
}

export function countBy(rows, key) {
  return rows.reduce((counts, row) => ({ ...counts, [row[key]]: (counts[row[key]] || 0) + 1 }), {});
}

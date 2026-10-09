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

const HAZARD_LABELS = { FLOOD: 'Flood', LANDSLIDE: 'Landslide', CYCLONE: 'Cyclone', DROUGHT: 'Drought', TSUNAMI: 'Tsunami' };

export function describeResponse(response) {
  const type = String(response?.hazardType || '');
  const hazard = HAZARD_LABELS[type] || (type ? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ') : 'Unknown hazard');
  const list = Array.isArray(response?.affectedAreas) ? response.affectedAreas.filter(Boolean) : [];
  const areas = list.length <= 1 ? list[0] || 'Not specified' : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
  return { hazard, areas };
}

export const TEAM_AGENCIES = ['DMC', 'Sri Lanka Army', 'Navy', 'Police', 'Fire Service', 'Red Cross', 'NGO'];
export const TEAM_CAPABILITIES = ['Boat Rescue', 'First Aid', 'Evacuation', 'Heavy Lifting'];
export const TEAM_STATUSES = ['AVAILABLE', 'ASSIGNED', 'DISPATCHED', 'RESPONDING', 'UNAVAILABLE', 'COMM_FAILURE'];
const ON_ASSIGNMENT = ['ASSIGNED', 'DISPATCHED', 'RESPONDING'];

/** Availability is managed by dispatch while a team is on an assignment, so manual toggling is blocked (mirrors the backend 409). */
export function canChangeAvailability(team) {
  return !ON_ASSIGNMENT.includes(team?.status) && !team?.currentAssignmentId;
}

export function validateTeamForm(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Team name is required.';
  else if (form.name.trim().length > 120) errors.name = 'Team name must be 120 characters or fewer.';
  if (!TEAM_AGENCIES.includes(form.agency)) errors.agency = 'Select an agency.';
  if (!DISTRICTS.includes(form.district)) errors.district = 'Select a district.';
  const members = Number(form.memberCount);
  if (form.memberCount === '' || !Number.isInteger(members) || members < 1 || members > 500) errors.memberCount = 'Members must be a whole number from 1 to 500.';
  if (!form.leader?.trim()) errors.leader = 'Team leader is required.';
  if (!/^[0-9 +()-]{7,20}$/.test(form.contactNumber || '')) errors.contactNumber = 'Enter a valid phone number.';
  if (!form.capabilities?.length) errors.capabilities = 'Select at least one capability.';
  return errors;
}

export function filterTeams(teams, { query = '', district = 'All', agency = 'All', status = 'All' } = {}) {
  const text = query.trim().toLowerCase();
  return teams.filter(team =>
    (!text || team.name.toLowerCase().includes(text) || team.leader.toLowerCase().includes(text) || team.id.toLowerCase().includes(text))
    && (district === 'All' || team.district === district)
    && (agency === 'All' || team.agency === agency)
    && (status === 'All' || team.status === status));
}

export const ASSIGNMENT_STATUSES = ['ASSIGNED', 'DISPATCHED', 'RESPONDING', 'COMPLETED', 'CANCELLED', 'COMM_FAILURE'];

/** Step 1 of the assign-team wizard: an active shelter and a whole number of evacuees (min 1). */
export function validateAssignmentShelter(shelter, expectedEvacuees) {
  const errors = {};
  if (!shelter) errors.shelterId = 'Select a destination shelter.';
  else if (shelter.status === 'Inactive') errors.shelterId = 'This shelter is inactive. Choose another shelter.';
  const expected = Number(expectedEvacuees);
  if (expectedEvacuees === '' || expectedEvacuees === undefined || !Number.isInteger(expected) || expected < 1) errors.expectedEvacuees = 'Expected evacuees must be a whole number of 1 or more.';
  return errors;
}

/** Step 2: only teams currently AVAILABLE can be assigned. */
export function validateAssignmentTeam(team) {
  if (!team) return 'Select a rescue team.';
  if (team.status !== 'AVAILABLE') return 'This team is not available. Choose another team.';
  return '';
}

/** Step 3: pickup location required (max 200), notes optional (max 300). */
export function validateAssignmentDetails(details) {
  const errors = {};
  const pickup = (details.pickupLocation || '').trim();
  if (!pickup) errors.pickupLocation = 'Pickup location is required.';
  else if (pickup.length > 200) errors.pickupLocation = 'Pickup location must be 200 characters or fewer.';
  if ((details.notes || '').length > 300) errors.notes = 'Notes must be 300 characters or fewer.';
  return errors;
}

/** Classifies a 409 from POST /team-assignments so the wizard can return to the right step. */
export function assignmentConflictKind(error) {
  if (error?.status !== 409) return null;
  const message = String(error.message || '').toLowerCase();
  if (message.includes('capacity')) return 'capacity';
  if (message.includes('stock')) return 'stock';
  if (message.includes('support team') || message.includes('already supporting')) return 'support';
  if (message.includes('team')) return 'team';
  return null;
}

export function canCancelAssignment(assignment) {
  return assignment?.status === 'ASSIGNED';
}

/** Only assigned teams are dispatched here; a team lost to a communication failure is re-dispatched from the failure panel. */
export function canDispatchAssignment(assignment) {
  return assignment?.status === 'ASSIGNED';
}

export function canMarkResponding(assignment) {
  return assignment?.status === 'DISPATCHED';
}

export function filterAssignments(rows, { query = '', status = 'All', district = 'All' } = {}) {
  const text = query.trim().toLowerCase();
  return rows.filter(row =>
    (!text || [row.id, row.teamName, row.shelterName, row.pickupLocation].some(value => String(value || '').toLowerCase().includes(text)))
    && (status === 'All' || row.status === status)
    && (district === 'All' || row.district === district));
}

/** Arrival can be recorded once a team is on its way (dispatched) or already on the ground (responding). */
export function canRecordArrival(assignment) {
  return ['DISPATCHED', 'RESPONDING'].includes(assignment?.status);
}

export function validateArrival(value) {
  if (value === '' || value === null || value === undefined) return 'Enter the number of evacuees delivered.';
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return 'Evacuees delivered must be a whole number of 0 or more.';
  return '';
}

/** Shelter occupancy before and after an arrival, e.g. 380 → 430 occupied and 120 → 70 available. */
export function previewArrival(shelter, delivered) {
  const capacity = Number(shelter.capacity || 0);
  const occupied = Number(shelter.occupied || 0);
  const after = occupied + Number(delivered || 0);
  return {
    before: { occupied, available: availableSpace(shelter) },
    after: { occupied: after, available: Math.max(0, capacity - after) },
    exceedsCapacity: after > capacity,
    overBy: Math.max(0, after - capacity),
  };
}

/** '1 person', '5 people'. */
export function peopleLabel(count) {
  const n = Number(count);
  return `${n.toLocaleString()} ${n === 1 ? 'person' : 'people'}`;
}

export const MAX_SUPPORT_TEAMS = 5;

/** Available teams that can join as support: never the primary team or teams already supporting. */
export function supportTeamOptions(teams, primaryTeamId, excludeIds = []) {
  return (teams || []).filter(team => team.status === 'AVAILABLE' && team.id !== primaryTeamId && !excludeIds.includes(team.id));
}

/** Adds or removes a support team, keeping at most `limit` selected. */
export function toggleSupportTeam(ids, id, limit = MAX_SUPPORT_TEAMS) {
  if (ids.includes(id)) return ids.filter(item => item !== id);
  return ids.length >= limit ? ids : [...ids, id];
}

/** { resourceId: quantity } → [{ resourceId, quantity }], skipping blank quantities. */
export function supportResourcePayload(selection) {
  return Object.entries(selection || {})
    .filter(([, quantity]) => quantity !== '' && quantity !== null && quantity !== undefined)
    .map(([resourceId, quantity]) => ({ resourceId, quantity: Number(quantity) }));
}

/** Support resources are optional, but any quantity entered must be a whole number of 1 or more. */
export function validateSupportResources(selection) {
  for (const { quantity } of supportResourcePayload(selection)) {
    if (!Number.isInteger(quantity) || quantity < 1) return 'Resource quantities must be whole numbers greater than zero.';
  }
  return '';
}

/** Add Support needs at least one team or resource. */
export function validateSupportRequest(teamIds, selection) {
  const problem = validateSupportResources(selection);
  if (problem) return problem;
  if (!teamIds.length && !supportResourcePayload(selection).length) return 'Choose at least one support team or resource.';
  return '';
}

/** Support can be added until the team starts responding on the ground. */
export function canAddSupport(assignment) {
  return ['ASSIGNED', 'DISPATCHED'].includes(assignment?.status);
}

/** A communication failure can be reported while a team is out on the ground. */
export function canReportCommFailure(assignment) {
  return ['DISPATCHED', 'RESPONDING'].includes(assignment?.status);
}

/** Escalate, re-dispatch and reassign are only offered while the failure is unresolved. */
export function hasCommFailure(assignment) {
  return assignment?.status === 'COMM_FAILURE';
}

/** Teams that can take over an assignment: available and not already on it. */
export function reassignTeamOptions(teams, assignment) {
  const onAssignment = [assignment?.teamId, ...(assignment?.supportTeamIds || [])];
  return (teams || []).filter(team => team.status === 'AVAILABLE' && !onAssignment.includes(team.id));
}

export function validateEscalationNote(note) {
  const value = (note || '').trim();
  if (!value) return 'Describe why this failure is being escalated.';
  if (value.length > 500) return 'Keep the note to 500 characters or fewer.';
  return '';
}

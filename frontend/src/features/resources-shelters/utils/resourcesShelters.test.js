import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  availableSpace, canChangeAvailability, checkShelterCapacity, filterTeams, validateTeamForm, describeResponse, checkStock, filterShelters, occupancyBand, occupancyRate, paginate,
  validateAllocationDetails, validateOccupancy, validateResourceForm, validateResourceSelection, validateShelterForm,
} from './resourcesShelters.js';

test('available space follows the use case scenario', () => {
  assert.equal(availableSpace({ capacity: 500, occupied: 380 }), 120);
  assert.equal(availableSpace({ capacity: 500, occupied: 430 }), 70);
  assert.equal(availableSpace({ capacity: 500, occupied: 520 }), 0);
});

test('occupancy rate and legend bands', () => {
  assert.equal(occupancyRate(780, 1000), 78);
  assert.equal(occupancyRate(5, 0), 0);
  assert.equal(occupancyBand(97), 'critical');
  assert.equal(occupancyBand(78), 'high');
  assert.equal(occupancyBand(50), 'medium');
  assert.equal(occupancyBand(10), 'low');
});

test('capacity check reports the shortfall', () => {
  const warning = checkShelterCapacity({ name: 'Kalutara Vidyalaya', capacity: 600, occupied: 580 }, 150);
  assert.equal(warning.available, 20);
  assert.equal(warning.shortfall, 130);
  assert.equal(checkShelterCapacity({ name: 'X', capacity: 600, occupied: 580 }, 20), null);
});

test('stock check finds the first over-allocated resource', () => {
  const resources = [{ id: 'RS-1', name: 'Food Packs', available: 12450 }, { id: 'RS-3', name: 'Medical Kits', available: 580 }];
  assert.equal(checkStock({ 'RS-1': 500 }, resources), null);
  assert.deepEqual(checkStock({ 'RS-1': 500, 'RS-3': 1000 }, resources), { resourceId: 'RS-3', resource: 'Medical Kits', requested: 1000, available: 580, shortage: 420 });
});

test('selection and occupancy validation', () => {
  assert.match(validateResourceSelection({}), /at least one/);
  assert.match(validateResourceSelection({ a: 0 }), /greater than zero/);
  assert.equal(validateResourceSelection({ a: 3 }), '');
  assert.match(validateOccupancy('', {}), /required/);
  assert.match(validateOccupancy('-1', { active: true }), /0 or more/);
  assert.match(validateOccupancy('10', { active: false }), /inactive/);
  assert.equal(validateOccupancy('430', { active: true }), '');
});

test('allocation details validation', () => {
  const errors = validateAllocationDetails({ distributionDate: '2026-01-01', transportMethod: '', notes: '', expectedPeople: '' }, '2026-09-15');
  assert.ok(errors.distributionDate);
  assert.ok(errors.transportMethod);
  assert.deepEqual(validateAllocationDetails({ distributionDate: '2026-09-15', transportMethod: 'DMC Vehicle', notes: '', expectedPeople: '20' }, '2026-09-15'), {});
});

test('shelter and resource forms', () => {
  assert.ok(validateShelterForm({ name: 'A', district: 'Colombo', address: 'x', shelterType: 'School', capacity: '100', occupied: 200 }).capacity);
  assert.deepEqual(validateShelterForm({ name: 'A', district: 'Colombo', address: 'x', shelterType: 'School', capacity: '100' }), {});
  assert.ok(validateResourceForm({ name: 'Tents', category: 'Equipment', unit: 'Unit', totalQuantity: '5', available: '9', lowStockThreshold: '1' }).available);
});

test('filtering and pagination', () => {
  const shelters = [{ name: 'Colombo Central School', district: 'Colombo', status: 'Active' }, { name: 'Kalutara Vidyalaya', district: 'Kalutara', status: 'Full' }];
  assert.equal(filterShelters(shelters, { status: 'Full' }).length, 1);
  assert.equal(filterShelters(shelters, { query: 'colombo' }).length, 1);
  const page = paginate(Array.from({ length: 20 }, (_, i) => i), 3, 8);
  assert.deepEqual(page.rows, [16, 17, 18, 19]);
  assert.equal(page.pages, 3);
  assert.equal(paginate([], 4).page, 1);
});

test('active response banner text', () => {
  assert.deepEqual(describeResponse({ hazardType: 'FLOOD', affectedAreas: ['Kelani River Basin', 'Kolonnawa'] }),
    { hazard: 'Flood', areas: 'Kelani River Basin and Kolonnawa' });
  assert.deepEqual(describeResponse({ hazardType: 'HIGH_WIND', affectedAreas: [] }), { hazard: 'High wind', areas: 'Not specified' });
});

const teams = [
  { id: 'RT-001', name: 'DMC Colombo Rapid Response', leader: 'Mr. S. Rajapaksha', agency: 'DMC', district: 'Colombo', status: 'AVAILABLE' },
  { id: 'RT-002', name: 'Navy Boat Rescue Unit 4', leader: 'Lt. K. Senanayake', agency: 'Navy', district: 'Colombo', status: 'AVAILABLE' },
  { id: 'RT-004', name: 'Red Cross First Aid Team', leader: 'Ms. H. Mendis', agency: 'Red Cross', district: 'Colombo', status: 'DISPATCHED' },
  { id: 'RT-005', name: 'Army Engineering Squad 2', leader: 'Capt. R. Abeysekara', agency: 'Sri Lanka Army', district: 'Gampaha', status: 'AVAILABLE' },
];

test('rescue teams filter by search, district, agency and status', () => {
  assert.equal(filterTeams(teams, { district: 'Colombo', status: 'AVAILABLE' }).length, 2);
  assert.deepEqual(filterTeams(teams, { agency: 'Navy' }).map(team => team.id), ['RT-002']);
  assert.deepEqual(filterTeams(teams, { query: 'mendis' }).map(team => team.id), ['RT-004']);
  assert.equal(filterTeams(teams).length, 4);
});

test('team form validation', () => {
  const valid = { name: 'Galle Navy Rescue', agency: 'Navy', district: 'Galle', memberCount: '6', leader: 'Lt. A. Perera', contactNumber: '077 123 0000', capabilities: ['Boat Rescue'] };
  assert.deepEqual(validateTeamForm(valid), {});
  const errors = validateTeamForm({ name: ' ', agency: 'Pirates', district: 'Atlantis', memberCount: '0', leader: '', contactNumber: 'abc', capabilities: [] });
  assert.deepEqual(Object.keys(errors).sort(), ['agency', 'capabilities', 'contactNumber', 'district', 'leader', 'memberCount', 'name']);
  assert.ok(validateTeamForm({ ...valid, memberCount: '2.5' }).memberCount);
});

test('availability cannot change while a team is on assignment', () => {
  assert.equal(canChangeAvailability({ status: 'AVAILABLE' }), true);
  assert.equal(canChangeAvailability({ status: 'COMM_FAILURE' }), true);
  for (const status of ['ASSIGNED', 'DISPATCHED', 'RESPONDING']) assert.equal(canChangeAvailability({ status }), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canReportCommFailure, hasCommFailure, reassignTeamOptions, validateEscalationNote, assignmentConflictKind, canAddSupport, supportResourcePayload, supportTeamOptions, toggleSupportTeam, validateSupportRequest, validateSupportResources, availableSpace, canCancelAssignment, canRecordArrival, previewArrival, validateArrival, canDispatchAssignment, canMarkResponding, canChangeAvailability, filterAssignments, validateAssignmentDetails, validateAssignmentShelter, validateAssignmentTeam, checkShelterCapacity, filterTeams, validateTeamForm, describeResponse, checkStock, filterShelters, occupancyBand, occupancyRate, paginate, peopleLabel,
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
  assert.equal(canChangeAvailability({ status: 'COMM_FAILURE', currentAssignmentId: 'TA-1' }), false);
  for (const status of ['ASSIGNED', 'DISPATCHED', 'RESPONDING']) assert.equal(canChangeAvailability({ status }), false);
});

test('assign team wizard validates shelter, team and details', () => {
  const shelter = { id: 'SH-009', name: 'Kolonnawa', capacity: 500, occupied: 380, status: 'Active' };
  assert.deepEqual(validateAssignmentShelter(shelter, '50'), {});
  assert.ok(validateAssignmentShelter(null, '50').shelterId);
  assert.ok(validateAssignmentShelter({ ...shelter, status: 'Inactive' }, '5').shelterId);
  assert.ok(validateAssignmentShelter(shelter, '0').expectedEvacuees);
  assert.ok(validateAssignmentShelter(shelter, '').expectedEvacuees);
  assert.ok(validateAssignmentShelter(shelter, '2.5').expectedEvacuees);
  assert.equal(checkShelterCapacity(shelter, 121).shortfall, 1);
  assert.equal(validateAssignmentTeam({ status: 'AVAILABLE' }), '');
  assert.ok(validateAssignmentTeam({ status: 'DISPATCHED' }));
  assert.ok(validateAssignmentTeam(null));
  assert.deepEqual(validateAssignmentDetails({ pickupLocation: 'Kolonnawa junction', notes: '' }), {});
  assert.ok(validateAssignmentDetails({ pickupLocation: '  ', notes: '' }).pickupLocation);
  assert.ok(validateAssignmentDetails({ pickupLocation: 'x'.repeat(201), notes: '' }).pickupLocation);
  assert.ok(validateAssignmentDetails({ pickupLocation: 'A', notes: 'x'.repeat(301) }).notes);
});

test('assignment conflicts and cancellation rules', () => {
  assert.equal(assignmentConflictKind({ status: 409, message: 'Insufficient capacity: X can take 20 more people' }), 'capacity');
  assert.equal(assignmentConflictKind({ status: 409, message: 'Team is no longer available: X is assigned.' }), 'team');
  assert.equal(assignmentConflictKind({ status: 503, message: 'Unable to access' }), null);
  assert.equal(canCancelAssignment({ status: 'ASSIGNED' }), true);
  assert.equal(canCancelAssignment({ status: 'DISPATCHED' }), false);
  const rows = [
    { id: 'TA-1', teamName: 'Navy Boat', shelterName: 'Kolonnawa', district: 'Colombo', status: 'ASSIGNED', pickupLocation: 'Junction' },
    { id: 'TA-2', teamName: 'Army', shelterName: 'Gampaha Hall', district: 'Gampaha', status: 'CANCELLED', pickupLocation: 'Town' },
  ];
  assert.deepEqual(filterAssignments(rows, { query: 'navy' }).map(row => row.id), ['TA-1']);
  assert.deepEqual(filterAssignments(rows, { status: 'CANCELLED' }).map(row => row.id), ['TA-2']);
  assert.deepEqual(filterAssignments(rows, { district: 'Colombo' }).map(row => row.id), ['TA-1']);
});

test('dispatch is allowed from assigned only, responding only after dispatch', () => {
  assert.equal(canDispatchAssignment({ status: 'ASSIGNED' }), true);
  assert.equal(canDispatchAssignment({ status: 'COMM_FAILURE' }), false);
  assert.equal(canDispatchAssignment({ status: 'DISPATCHED' }), false);
  assert.equal(canDispatchAssignment(null), false);
  assert.equal(canMarkResponding({ status: 'DISPATCHED' }), true);
  assert.equal(canMarkResponding({ status: 'ASSIGNED' }), false);
  assert.equal(canMarkResponding({ status: 'RESPONDING' }), false);
});

test('arrival preview, validation and allowed statuses', () => {
  // Use case scenario: capacity 500, occupancy 380; 50 evacuees arrive.
  const shelter = { capacity: 500, occupied: 380 };
  assert.deepEqual(previewArrival(shelter, 50), {
    before: { occupied: 380, available: 120 },
    after: { occupied: 430, available: 70 },
    exceedsCapacity: false,
    overBy: 0,
  });
  assert.equal(previewArrival(shelter, 120).exceedsCapacity, false);
  assert.equal(previewArrival(shelter, 121).exceedsCapacity, true);
  assert.equal(previewArrival(shelter, 121).after.available, 0);
  assert.equal(previewArrival(shelter, 121).overBy, 1);
  assert.equal(validateArrival('50'), '');
  assert.equal(validateArrival('0'), '');
  assert.notEqual(validateArrival(''), '');
  assert.notEqual(validateArrival('-1'), '');
  assert.notEqual(validateArrival('2.5'), '');
  assert.equal(canRecordArrival({ status: 'DISPATCHED' }), true);
  assert.equal(canRecordArrival({ status: 'RESPONDING' }), true);
  assert.equal(canRecordArrival({ status: 'ASSIGNED' }), false);
  assert.equal(canRecordArrival({ status: 'COMPLETED' }), false);
});

test('people label uses singular for one person', () => {
  assert.equal(peopleLabel(1), '1 person');
  assert.equal(peopleLabel(0), '0 people');
  assert.equal(peopleLabel(1300), '1,300 people');
});

test('support teams exclude the primary, busy and already-supporting teams', () => {
  const teams = [
    { id: 'RT-1', status: 'AVAILABLE' }, { id: 'RT-2', status: 'AVAILABLE' }, { id: 'RT-3', status: 'DISPATCHED' }, { id: 'RT-4', status: 'AVAILABLE' },
  ];
  assert.deepEqual(supportTeamOptions(teams, 'RT-1', ['RT-4']).map(team => team.id), ['RT-2']);
  assert.deepEqual(toggleSupportTeam(['RT-2'], 'RT-4'), ['RT-2', 'RT-4']);
  assert.deepEqual(toggleSupportTeam(['RT-2', 'RT-4'], 'RT-2'), ['RT-4']);
  assert.deepEqual(toggleSupportTeam(['a', 'b', 'c', 'd', 'e'], 'f'), ['a', 'b', 'c', 'd', 'e']);
});

test('support resources are optional but must be whole quantities', () => {
  assert.deepEqual(supportResourcePayload({ 'RS-1': '20', 'RS-2': '' }), [{ resourceId: 'RS-1', quantity: 20 }]);
  assert.equal(validateSupportResources({}), '');
  assert.match(validateSupportResources({ 'RS-1': '0' }), /whole numbers/);
  assert.match(validateSupportResources({ 'RS-1': '1.5' }), /whole numbers/);
  assert.match(validateSupportRequest([], {}), /at least one/);
  assert.equal(validateSupportRequest(['RT-2'], {}), '');
  assert.equal(validateSupportRequest([], { 'RS-1': '5' }), '');
});

test('support can be added until the team is responding and conflicts are classified', () => {
  assert.equal(canAddSupport({ status: 'ASSIGNED' }), true);
  assert.equal(canAddSupport({ status: 'DISPATCHED' }), true);
  assert.equal(canAddSupport({ status: 'RESPONDING' }), false);
  assert.equal(assignmentConflictKind({ status: 409, message: 'Insufficient stock for Medical Kits: requested 900, available 580.' }), 'stock');
  assert.equal(assignmentConflictKind({ status: 409, message: 'Support team is no longer available: X is assigned.' }), 'support');
});

test('communication failure actions follow the assignment status', () => {
  for (const status of ['DISPATCHED', 'RESPONDING']) assert.equal(canReportCommFailure({ status }), true);
  for (const status of ['ASSIGNED', 'COMM_FAILURE', 'COMPLETED']) assert.equal(canReportCommFailure({ status }), false);
  assert.equal(hasCommFailure({ status: 'COMM_FAILURE' }), true);
  assert.equal(hasCommFailure({ status: 'DISPATCHED' }), false);
  assert.equal(hasCommFailure(null), false);
});

test('reassign offers only available teams not already on the assignment', () => {
  const teams = [
    { id: 'RT-1', status: 'COMM_FAILURE' },
    { id: 'RT-2', status: 'AVAILABLE' },
    { id: 'RT-3', status: 'AVAILABLE' },
    { id: 'RT-4', status: 'UNAVAILABLE' },
  ];
  assert.deepEqual(reassignTeamOptions(teams, { teamId: 'RT-1', supportTeamIds: ['RT-3'] }).map(team => team.id), ['RT-2']);
  assert.deepEqual(reassignTeamOptions(null, null), []);
});

test('escalation needs a note of at most 500 characters', () => {
  assert.notEqual(validateEscalationNote('  '), '');
  assert.notEqual(validateEscalationNote('x'.repeat(501)), '');
  assert.equal(validateEscalationNote('No radio contact'), '');
});

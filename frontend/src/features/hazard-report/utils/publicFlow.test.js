import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePublicLogin, validatePublicSignup, isPublicRole } from '../../public-auth/services/validation.js';
import { createEmptyReport, localDateTime, mergeReportData, validatePhoto, validateReport } from './reportValidation.js';
test('public login rejects missing and invalid credentials', () => {
  assert.equal(Object.keys(validatePublicLogin({})).length, 2);
  assert.ok(validatePublicLogin({ email: 'bad@', password: 'x' }).email);
  assert.deepEqual(validatePublicLogin({ email: 'person@example.com', password: 'anything' }), {});
});
test('public signup only accepts public roles and matching passwords', () => {
  const values = { name: 'Citizen', email: 'citizen@example.com', phone: '0771234567', password: 'example', confirm: 'example', role: 'CITIZEN' };
  assert.deepEqual(validatePublicSignup(values), {});
  assert.ok(validatePublicSignup({ ...values, role: 'ADMIN' }).role);
  assert.ok(validatePublicSignup({ ...values, confirm: 'different' }).confirm);
  assert.ok(validatePublicSignup({ ...values, phone: '' }).phone);
  assert.equal(isPublicRole('DMC_OFFICER'), false);
  assert.equal(isPublicRole('COMMUNITY_VOLUNTEER'), true);
});
test('report data updates preserve prior steps and resets produce fresh drafts', () => {
  const initial = createEmptyReport();
  const selected = mergeReportData(initial, { hazardType: 'FLOOD' });
  const details = mergeReportData(selected, { description: 'Road underwater', latitude: '6.92', longitude: '79.86' });
  assert.equal(details.hazardType, 'FLOOD');
  assert.equal(initial.hazardType, '');
  assert.deepEqual(validateReport(details), {});
  assert.notEqual(createEmptyReport().clientRequestId, initial.clientRequestId);
});
test('report requires location and description, accepts zero coordinates, rejects future time', () => {
  const data = { hazardType: 'FLOOD', description: 'Water', latitude: 0, longitude: 0, dateTime: localDateTime() };
  assert.deepEqual(validateReport(data), {});
  assert.ok(validateReport({ ...data, latitude: '' }).latitude);
  assert.ok(validateReport({ ...data, longitude: 181 }).longitude);
  assert.ok(validateReport({ ...data, description: ' ' }).description);
  assert.ok(validateReport({ ...data, dateTime: '2099-01-01T12:00' }).dateTime);
});
test('photo validation rejects unsupported types and oversized files', () => {
  assert.equal(validatePhoto({ type: 'image/png', size: 1024 }), '');
  assert.ok(validatePhoto({ type: 'text/html', size: 1024 }));
  assert.ok(validatePhoto({ type: 'image/jpeg', size: 3 * 1024 * 1024 }));
});

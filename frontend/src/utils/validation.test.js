import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLogin, validateSignup } from './validation.js';
test(
  'login requires identity and password',
  () => {
    assert.equal(Object.keys(validateLogin({ identity: ' ', password: '' })).length, 2);
    assert.deepEqual(validateLogin({ identity: 'citizen@example.com', password: 'example' }), {});
    assert.ok(validateLogin({ identity: 'citizen', password: 'example' }).identity);
  }
);
test(
  'registration validates email and matching passwords',
  () => {
    assert.equal(Object.keys(validateSignup({})).length, 6);
    const valid = {
      name: 'DMC Officer',
      role: 'DMC Officer',
      email: 'citizen@example.com',
      phone: '0771234567',
      password: 'example',
      confirm: 'example'
    };
    assert.deepEqual(validateSignup(valid), {});
    assert.ok(validateSignup({ ...valid, email: 'bad@' }).email);
    assert.ok(validateSignup({ ...valid, confirm: 'different' }).confirm);
    assert.ok(validateSignup({ ...valid, role: 'Citizen' }).role);
    assert.ok(validateSignup({ ...valid, role: 'Community Disaster Volunteer' }).role);
    assert.ok(validateSignup({ ...valid, phone: '' }).phone);
    assert.ok(validateSignup({ ...valid, password: '123', confirm: '123' }).password);
    assert.deepEqual(validateSignup({ ...valid, role: 'District Officer' }), {});
    assert.deepEqual(validateSignup({ ...valid, role: 'Response Team Member' }), {});
  }
);

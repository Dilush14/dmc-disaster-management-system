import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLogin, validateSignup } from './validation.js';
test(
  'login requires identity and password',
  () => {
    assert.equal(Object.keys(validateLogin({ identity: ' ', password: '' })).length, 2);
    assert.deepEqual(validateLogin({ identity: 'citizen', password: 'example' }), {});
  }
);
test(
  'registration validates email and matching passwords',
  () => {
    assert.equal(Object.keys(validateSignup({})).length, 5);
    const valid = {
      name: 'Citizen',
      role: 'Citizen',
      email: 'citizen@example.com',
      password: 'example',
      confirm: 'example'
    };
    assert.deepEqual(validateSignup(valid), {});
    assert.ok(validateSignup({ ...valid, email: 'bad@' }).email);
    assert.ok(validateSignup({ ...valid, confirm: 'different' }).confirm);
  }
);

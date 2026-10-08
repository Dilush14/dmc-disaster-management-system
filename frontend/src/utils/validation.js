import { validatePublicLogin } from '../features/public-auth/services/validation.js';

export const registrationRoles = {
  'DMC Officer': 'DMC_OFFICER',
  'District Officer': 'DISTRICT_OFFICER',
  'Response Team Member': 'RESPONSE_TEAM_MEMBER',
};

export function validateLogin(values) {
  const { email, ...errors } = validatePublicLogin({ ...values, email: values.identity });
  return email ? { identity: email, ...errors } : errors;
}
export function validateSignup(values) {
  const errors = validatePublicLogin(values);
  if (!values.name?.trim()) errors.name = 'Enter your full name.';
  if (!/^[+\d\s()-]{7,20}$/.test(values.phone?.trim() || '')) errors.phone = 'Enter a valid phone number.';
  if (!Object.hasOwn(registrationRoles, values.role || '')) errors.role = 'Select a staff role.';
  if (values.password && values.password.length < 6) errors.password = 'Use at least 6 characters.';
  if (!values.confirm || values.confirm !== values.password) errors.confirm = 'Passwords must match.';
  return errors;
}

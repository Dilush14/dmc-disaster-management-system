export function validateLogin(values) {
  const errors = {};
  if (!values.identity?.trim()) errors.identity = 'Enter your email or username.';
  if (!values.password) errors.password = 'Enter your password.';
  return errors;
}
export function validateSignup(values) {
  const errors = {};
  if (!values.name?.trim()) errors.name = 'Enter your full name.';
  if (!values.role) errors.role = 'Select a role.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email || '')) errors.email = 'Enter a valid email address.';
  if (!values.password) errors.password = 'Create a password.';
  if (!values.confirm || values.confirm !== values.password) errors.confirm = 'Passwords must match.';
  return errors;
}

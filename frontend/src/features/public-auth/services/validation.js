export const PUBLIC_ROLES = ['CITIZEN', 'COMMUNITY_VOLUNTEER'];
export const isPublicRole = role => PUBLIC_ROLES.includes(role);
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
export function validatePublicLogin(values) {
  return {
    ...(!validEmail(values.email?.trim()) && { email: 'Enter a valid email address.' }),
    ...(!values.password && { password: 'Enter your password.' }),
  };
}
export function validatePublicSignup(values) {
  return {
    ...validatePublicLogin(values),
    ...(!values.name?.trim() && { name: 'Enter your full name.' }),
    ...(!/^[+\d\s()-]{7,20}$/.test(values.phone?.trim() || '') && { phone: 'Enter a valid phone number.' }),
    ...(values.password && values.password.length < 6 && { password: 'Use at least 6 characters.' }),
    ...(!values.confirm || values.confirm !== values.password ? { confirm: 'Passwords must match.' } : {}),
    ...(!isPublicRole(values.role) && { role: 'Choose Citizen or Community Volunteer.' }),
  };
}

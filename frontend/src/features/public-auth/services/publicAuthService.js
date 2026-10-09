import { browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword,
  onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword,
  signOut, updateProfile } from 'firebase/auth';
import { getFirebaseServices, isFirebaseConfigured } from '../../../services/firebase/config';
import { authenticatedRequest } from '../../../services/api/authenticatedClient';
import { validatePublicLogin, validatePublicSignup } from './validation';

export const authConfigured = isFirebaseConfigured;
export function getPublicWarnings() {
  return authenticatedRequest('/api/public/warnings');
}
function authClient() {
  const services = getFirebaseServices();
  if (!services)
    throw new Error('Sign-in is not available yet. Please contact the administrator to configure authentication.');
  return services.auth;
}
async function publicIdentity() {
  const profile = await authenticatedRequest('/api/public/profile');
  return { ...profile, name: profile.name || profile.email?.split('@')[0] || 'Citizen' };
}
export function observePublicAuth(callback, onError) {
  if (!authConfigured) {
    callback(null);
    return () => {};
  }
  let active = true;
  let sequence = 0;
  const unsubscribe = onAuthStateChanged(
    authClient(),
    async user => {
      const request = ++sequence;
      try {
        const identity = user ? await publicIdentity() : null;
        if (active && request === sequence)
          callback(identity);
      }
      catch (error) {
        if (active && request === sequence)
          onError(error);
      }
    },
    onError
  );
  return () => {
    active = false;
    unsubscribe();
  };
}
export async function savePublicProfile(values) {
  await authenticatedRequest(
    '/api/public/profile',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name.trim(), phone: values.phone.trim(), role: values.role }),
    }
  );
  return publicIdentity();
}
export async function authenticatePublic(values, signup = false) {
  const errors = signup ? validatePublicSignup(values) : validatePublicLogin(values);
  if (Object.keys(errors).length)
    throw new Error('Please check your details.');
  const auth = authClient();
  await setPersistence(auth, values.remember ? browserLocalPersistence : browserSessionPersistence);
  if (signup) {
    const credential = await createUserWithEmailAndPassword(auth, values.email.trim(), values.password);
    try {
      await updateProfile(credential.user, { displayName: values.name.trim() });
      await sendEmailVerification(credential.user);
      return await savePublicProfile(values);
    }
    catch {
      throw new Error('Your account was created, but the profile could not be saved. Log in again and complete your profile.');
    }
  }
  await signInWithEmailAndPassword(auth, values.email.trim(), values.password);
  return publicIdentity();
}
export async function logoutPublic() {
  if (authConfigured)
    await signOut(authClient());
}
export async function requestPasswordReset(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || ''))
    throw new Error('Enter your email above to reset your password.');
  await sendPasswordResetEmail(authClient(), email.trim());
  return 'If an account exists for this address, you will receive reset instructions.';
}
export function publicAuthError(error) {
  if (error.code === 'auth/invalid-credential')
    return 'Email or password is incorrect. Please try again.';
  if (error.code === 'auth/email-already-in-use')
    return 'An account already exists for this email. Please log in.';
  if (error.code === 'auth/too-many-requests')
    return 'Too many attempts. Please try again later.';
  if (error.code === 'auth/network-request-failed')
    return 'Unable to connect. Check your connection and try again.';
  if (error.code)
    return 'Authentication is unavailable. Please try again later.';
  return error.message || 'Unable to continue. Please try again.';
}

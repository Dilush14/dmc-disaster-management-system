import {
  browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword,
  onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut, updateProfile,
} from 'firebase/auth';
import { getFirebaseServices, isFirebaseConfigured } from './config';
import { authenticatedRequest } from '../api/authenticatedClient';
import { registrationRoles, validateLogin, validateSignup } from '../../utils/validation';

export const isStaffRole = role => Object.values(registrationRoles).includes(role);

function authClient() {
  const services = getFirebaseServices();
  if (!services) throw new Error('Sign-in is not available yet. Please configure Firebase authentication.');
  return services.auth;
}

async function staffIdentity() {
  const identity = await authenticatedRequest('/api/staff/profile');
  if (!isStaffRole(identity.role)) throw new Error('A DMC Officer, District Officer or Response Team Member account is required.');
  return identity;
}

export async function loginStaff(values) {
  if (Object.keys(validateLogin(values)).length) throw new Error('Please check your details.');
  const auth = authClient();
  await setPersistence(auth, values.remember ? browserLocalPersistence : browserSessionPersistence);
  await signInWithEmailAndPassword(auth, values.identity.trim(), values.password);
  return staffIdentity();
}

export async function registerStaff(values) {
  if (Object.keys(validateSignup(values)).length) throw new Error('Please check your details.');
  const auth = authClient();
  await setPersistence(auth, browserSessionPersistence);
  const credential = await createUserWithEmailAndPassword(auth, values.email.trim(), values.password);
  try {
    await updateProfile(credential.user, { displayName: values.name.trim() });
    await authenticatedRequest('/api/staff/registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name.trim(),
        phone: values.phone.trim(),
        requestedRole: registrationRoles[values.role],
      }),
    });
    return await staffIdentity();
  } catch {
    throw new Error('Your account was created, but staff setup could not be completed. Try signing in again; if it fails, contact your administrator.');
  }
}

export function observeStaffAuth(onIdentity, onError) {
  if (!isFirebaseConfigured) {
    onIdentity(null);
    return () => {};
  }
  let active = true;
  let sequence = 0;
  const unsubscribe = onAuthStateChanged(authClient(), async user => {
    const request = ++sequence;
    try {
      const identity = user ? await staffIdentity() : null;
      if (active && sequence === request) onIdentity(identity);
    } catch (error) {
      if (active && sequence === request) onError(error);
    }
  }, onError);
  return () => {
    active = false;
    unsubscribe();
  };
}

export async function logoutStaff() {
  if (isFirebaseConfigured) await signOut(authClient());
}

import { createContext, useContext, useEffect, useState } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { getFirebaseServices, firebaseConfigured } from '../services/firebase';
import { apiRequest, getPublicProfile } from '../services/api';

const allowedRoles = ['CITIZEN', 'COMMUNITY_VOLUNTEER'];
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      setError('Configure the mobile Firebase values in mobile/.env before signing in.');
      return undefined;
    }
    return onAuthStateChanged(getFirebaseServices().auth, async firebaseUser => {
      try {
        setUser(firebaseUser ? await getPublicProfile() : null);
      } catch (failure) {
        setUser(null);
        setError(failure.message);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  async function login(email, password) {
    setError('');
    await signInWithEmailAndPassword(getFirebaseServices().auth, email.trim(), password);
    const profile = await getPublicProfile();
    if (!allowedRoles.includes(profile.role)) {
      await signOut(getFirebaseServices().auth);
      throw new Error('This mobile app is only for citizens and community volunteers.');
    }
    setUser(profile);
  }

  async function signup(values) {
    if (!allowedRoles.includes(values.role)) throw new Error('Choose Citizen or Community Volunteer.');
    const credential = await createUserWithEmailAndPassword(getFirebaseServices().auth, values.email.trim(), values.password);
    await updateProfile(credential.user, { displayName: values.name.trim() });
    const profile = await apiRequest('/api/public/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name.trim(), phone: values.phone.trim(), role: values.role }),
    });
    setUser(profile);
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(getFirebaseServices().auth, email.trim());
  }

  async function logout() {
    try {
      await signOut(getFirebaseServices().auth);
    } catch (failure) {
      setError(failure.message || 'Remote sign-out failed; local session was cleared.');
    } finally {
      setUser(null);
    }
  }

  return <AuthContext.Provider value={{ user, loading, error, login, signup, resetPassword, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

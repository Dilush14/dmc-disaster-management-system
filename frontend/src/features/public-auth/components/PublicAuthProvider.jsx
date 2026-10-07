import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authenticatePublic, logoutPublic, observePublicAuth, publicAuthError, savePublicProfile } from '../services/publicAuthService';
const PublicAuthContext = createContext(null);
export function PublicAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const operation = useRef(false);
  useEffect(() => observePublicAuth(identity => {
    if (!operation.current) { setUser(identity); setLoading(false); setError(''); }
  }, failure => {
    if (!operation.current) { setUser(null); setLoading(false); setError(publicAuthError(failure)); }
  }), []);
  async function login(values, signup) {
    operation.current = true; setError('');
    try { const identity = await authenticatePublic(values, signup); setUser(identity); return identity; }
    finally { operation.current = false; setLoading(false); }
  }
  async function saveProfile(values) { const identity = await savePublicProfile(values); setUser(identity); }
  async function logout() { await logoutPublic(); setUser(null); }
  return <PublicAuthContext.Provider value={{ user, loading, login, logout, saveProfile, error }}>{children}</PublicAuthContext.Provider>;
}
export const usePublicAuth = () => useContext(PublicAuthContext);

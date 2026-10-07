import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Phone, UserRound } from 'lucide-react';
import { MobileHeader, MobilePrimaryButton } from '../components/MobileUI';
import { usePublicAuth } from '../../public-auth/components/PublicAuthProvider';
export default function PublicUtilityPage({ kind }) {
  const { user, logout, saveProfile } = usePublicAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const profile = kind === 'profile';
  const contact = kind === 'contacts';
  const Icon = profile ? UserRound : contact ? Phone : Info;
  async function exit() {
    try { await logout(); navigate('/public/login', { replace: true }); }
    catch { setError('Unable to log out. Please try again.'); }
  }
  async function completeProfile(event) {
    event.preventDefault(); setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try { await saveProfile(values); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="mobile-page">
    <MobileHeader title={profile ? 'Your Profile' : contact ? 'Emergency Contacts' : 'Disaster Information'}/>
    <section className="utility-card"><Icon size={36}/>
      {profile ? <>
        <h2>{user.name}</h2><p>{user.email}</p>
        <p>{user.role === 'COMMUNITY_VOLUNTEER' ? 'Community Volunteer' : 'Citizen'}</p>
        {user.phone ? <p>{user.phone}</p> : <form onSubmit={completeProfile}>
          <p className="mobile-hint">Complete your contact details.</p>
          <div className="mobile-field"><label htmlFor="profile-name">Full Name</label><input id="profile-name" name="name" required maxLength={120} defaultValue={user.name}/></div>
          <div className="mobile-field"><label htmlFor="profile-phone">Phone Number</label><input id="profile-phone" name="phone" type="tel" required minLength={7} maxLength={20}/></div>
          <div className="mobile-field"><label htmlFor="profile-role">Account Type</label><select id="profile-role" name="role" defaultValue="CITIZEN"><option value="CITIZEN">Citizen</option><option value="COMMUNITY_VOLUNTEER">Community Volunteer</option></select></div>
          <MobilePrimaryButton disabled={busy}>{busy ? 'Saving...' : 'Save Profile'}</MobilePrimaryButton>
        </form>}
        <MobilePrimaryButton onClick={exit}>Log out</MobilePrimaryButton>
      </> : <>
        <h2>{contact ? 'Official contact directory' : 'Stay informed'}</h2>
        <p>{contact ? 'Use the official DMC contact directory for current emergency contact information.' : 'Read current warnings and disaster guidance on the official DMC website.'}</p>
        <a className="mobile-secondary" href="https://www.dmc.gov.lk/" target="_blank" rel="noreferrer">Visit the official DMC website</a>
      </>}
      {error && <p role="alert" className="mobile-error">{error}</p>}
    </section>
  </div>;
}

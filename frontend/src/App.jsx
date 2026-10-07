import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import InfoDialog from './components/common/InfoDialog';
import WelcomePage from './pages/public/WelcomePage';
import AuthPage from './pages/auth/AuthPage';
const PublicRoutes = lazy(() => import('./routes/PublicRoutes'));
function StaffPortal() {
  const [topic, setTopic] = useState('');
  return <div className="portal">
    <a href="#main" className="skip-link">Skip to content</a>
    <Navbar onInfo={setTopic}/>
    <Routes>
      <Route path="/" element={<WelcomePage onInfo={setTopic}/>}/>
      <Route path="/auth" element={<AuthPage onInfo={setTopic}/>}/>
      <Route
        path="*"
        element={<main id="main" className="not-found">
          <h1>Page not found</h1>
          <Link to="/">Return home</Link>
        </main>}
      />
    </Routes>
    <Footer onInfo={setTopic}/>
    <InfoDialog topic={topic} onClose={() => setTopic('')}/>
  </div>;
}
export default function App() {
  return <Suspense fallback={<p role="status" className="app-loading">Loading DMC…</p>}>
    <Routes>
      <Route path="/public/*" element={<PublicRoutes/>}/>
      <Route path="*" element={<StaffPortal/>}/>
    </Routes>
  </Suspense>;
}

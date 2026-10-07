import { useEffect } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { PublicAuthProvider, usePublicAuth } from '../features/public-auth/components/PublicAuthProvider';
import { isPublicRole } from '../features/public-auth/services/validation';
import { HazardReportProvider } from '../features/hazard-report/context/HazardReportContext';
import BottomNavigation from '../features/hazard-report/components/BottomNavigation';
import PublicLoginPage from '../features/public-auth/pages/PublicLoginPage';
import PublicSignupPage from '../features/public-auth/pages/PublicSignupPage';
import PublicWelcomePage from '../features/hazard-report/pages/PublicWelcomePage';
import PublicHomePage from '../features/hazard-report/pages/PublicHomePage';
import SelectHazardTypePage from '../features/hazard-report/pages/SelectHazardTypePage';
import HazardDetailsPage from '../features/hazard-report/pages/HazardDetailsPage';
import AddPhotoPage from '../features/hazard-report/pages/AddPhotoPage';
import ReviewHazardReportPage from '../features/hazard-report/pages/ReviewHazardReportPage';
import ReportSuccessPage from '../features/hazard-report/pages/ReportSuccessPage';
import MyReportsPage from '../features/hazard-report/pages/MyReportsPage';
import ReportDetailPage from '../features/hazard-report/pages/ReportDetailPage';
import PublicUtilityPage from '../features/hazard-report/pages/PublicUtilityPage';
import '../features/hazard-report/public.css';

function RequirePublicRole() {
  const { user, loading, logout } = usePublicAuth();
  const location = useLocation();
  if (loading) return <p className="mobile-page" role="status">Loading your session…</p>;
  if (!user) return <Navigate to="/public/login" replace state={{ from: location.pathname }}/>;
  if (!isPublicRole(user.role)) return <div className="mobile-page"><h1>Public account required</h1><p>Please use a citizen or community volunteer account.</p><button className="mobile-primary" onClick={logout}>Use another account</button></div>;
  return <Outlet/>;
}
function PublicLayout() {
  const { user } = usePublicAuth();
  const { pathname } = useLocation();
  const showNav = ['/public/home', '/public/my-reports', '/public/info', '/public/profile', '/public/contacts'].some(path => pathname === path || pathname.startsWith(`${path}/`));
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return <div className="public-app"><a href="#public-main" className="skip-link">Skip to content</a><div className="mobile-shell"><main id="public-main" className={showNav ? 'with-bottom-nav' : ''}><HazardReportProvider key={user?.id || 'guest'}><Routes><Route index element={<PublicWelcomePage/>}/><Route path="login" element={<PublicLoginPage/>}/><Route path="signup" element={<PublicSignupPage/>}/><Route element={<RequirePublicRole/>}><Route path="home" element={<PublicHomePage/>}/><Route path="report-hazard" element={<SelectHazardTypePage/>}/><Route path="report-hazard/details" element={<HazardDetailsPage/>}/><Route path="report-hazard/photo" element={<AddPhotoPage/>}/><Route path="report-hazard/review" element={<ReviewHazardReportPage/>}/><Route path="report-hazard/success" element={<ReportSuccessPage/>}/><Route path="my-reports" element={<MyReportsPage/>}/><Route path="my-reports/:id" element={<ReportDetailPage/>}/><Route path="info" element={<PublicUtilityPage kind="info"/>}/><Route path="contacts" element={<PublicUtilityPage kind="contacts"/>}/><Route path="profile" element={<PublicUtilityPage kind="profile"/>}/></Route><Route path="*" element={<div className="mobile-page"><h1>Page not found</h1><Link to="/public">Back to welcome</Link></div>}/></Routes></HazardReportProvider></main>{showNav && user && isPublicRole(user.role) && <BottomNavigation/>}</div></div>;
}
export default function PublicRoutes() { return <PublicAuthProvider><PublicLayout/></PublicAuthProvider>; }

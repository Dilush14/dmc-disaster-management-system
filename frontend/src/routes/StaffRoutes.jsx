import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { isStaffRole, observeStaffAuth, logoutStaff } from '../services/firebase/staffAuthService';
import { registrationRoles } from '../utils/validation';
import { Activity, AlertTriangle, BarChart3, Bell, FileText, House, LayoutDashboard, MapPinned, Search, Settings, Users } from 'lucide-react';
import MonitoringDashboardPage from '../features/monitoring-reports/pages/MonitoringDashboardPage';
import DistrictResponseOverviewPage from '../features/monitoring-reports/pages/DistrictResponseOverviewPage';
import RealtimeMonitoringPage from '../features/monitoring-reports/pages/RealtimeMonitoringPage';
import ResourcesSheltersMonitoringPage from '../features/monitoring-reports/pages/ResourcesSheltersMonitoringPage';
import GenerateReportPage from '../features/monitoring-reports/pages/GenerateReportPage';
import ConfigureReportPage from '../features/monitoring-reports/pages/ConfigureReportPage';
import ReportPreviewPage from '../features/monitoring-reports/pages/ReportPreviewPage';
import ReportGenerationPage from '../features/monitoring-reports/pages/ReportGenerationPage';
import ReportDetailsPage from '../features/monitoring-reports/pages/ReportDetailsPage';
import GeneratedReportsPage from '../features/monitoring-reports/pages/GeneratedReportsPage';
import { ReportGenerationProvider } from '../features/monitoring-reports/context/ReportGenerationContext';
import HazardWarningsPage from '../features/hazard-warnings/pages/HazardWarningsPage';
import CreateHazardWarningPage from '../features/hazard-warnings/pages/CreateHazardWarningPage';
import WarningDetailsPage from '../features/hazard-warnings/pages/WarningDetailsPage';
import WarningSuccessPage from '../features/hazard-warnings/pages/WarningSuccessPage';
import StaffHazardReportsPage from '../features/staff-hazard-reports/pages/StaffHazardReportsPage';
import StaffHazardReportDetailsPage from '../features/staff-hazard-reports/pages/StaffHazardReportDetailsPage';
import StaffHazardReportsMapPage from '../features/staff-hazard-reports/pages/StaffHazardReportsMapPage';

const navItems = [
  { to: '/staff/monitoring', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/staff/warnings', label: 'Hazard Warnings', icon: AlertTriangle },
  { to: '/staff/hazard-reports', label: 'Hazard Reports', icon: FileText },
  { to: '/staff/monitoring/Colombo', label: 'District Overview', icon: MapPinned },
  { to: '/staff/monitoring/Colombo/realtime', label: 'Real-Time Monitoring', icon: Activity },
  { to: '/staff/monitoring/Colombo/resources', label: 'Resources & Shelters', icon: House },
  { to: '/staff/reports/generate', label: 'Generate Reports', icon: FileText },
  { to: '/staff/reports/history', label: 'Generated Reports', icon: BarChart3 },
  { to: '/staff/users', label: 'Users', icon: Users },
  { to: '/staff/settings', label: 'Settings', icon: Settings },
];

const StaffSessionContext = createContext(null);

function StaffSessionProvider({ children }) {
  const [session, setSession] = useState({ user: null, loading: true, error: '' });
  useEffect(() => observeStaffAuth(
    user => setSession({ user, loading: false, error: '' }),
    error => setSession({ user: null, loading: false, error: error.message }),
  ), []);
  return <StaffSessionContext.Provider value={session}>{children}</StaffSessionContext.Provider>;
}

function RequireStaffRole() {
  const { user, loading, error } = useContext(StaffSessionContext);
  if (loading) return <p role="status" className="p-6">Loading staff session…</p>;
  if (!user && !error) return <Navigate to="/auth" replace />;

  if (!user || !isStaffRole(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black">Access restricted</h1>
          <p className="mt-3 text-slate-600">This monitoring and reporting portal is for authorized DMC staff users.</p>
          {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
          <Link className="mt-4 inline-block text-blue-700" to="/auth">Back to staff login</Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

function StaffLayout() {
  const location = useLocation();
  const { user } = useContext(StaffSessionContext);
  const [logoutError, setLogoutError] = useState('');
  const roleLabel = Object.entries(registrationRoles).find(([, role]) => role === user.role)?.[0];
  async function logout() {
    try {
      await logoutStaff();
    } catch {
      setLogoutError('Unable to sign out. Please try again.');
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="w-72 bg-[#071b35] text-white">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-lg font-black text-white">D</div>
            <div>
              <div className="text-lg font-black">DMC</div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Disaster Management Centre</div>
            </div>
          </div>

          <nav className="space-y-2 px-3 py-4">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${isActive ? 'bg-white/10 text-white ring-1 ring-white/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <Search size={16} className="text-slate-500" />
                <input className="w-48 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" placeholder="Search" />
              </div>
              <div className="flex items-center gap-4">
                <button type="button" className="relative rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600">
                  <Bell size={16} />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                </button>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">DO</div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{user.name || user.email}</div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{roleLabel}</div>
                  </div>
                </div>
                <button type="button" onClick={logout} className="text-sm text-blue-700">Sign out</button>
              </div>
            </div>
          </header>
          <main className="p-6">
            {logoutError && <p role="alert">{logoutError}</p>}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default function StaffRoutes() {
  return (
    <StaffSessionProvider>
    <ReportGenerationProvider>
      <Routes>
        <Route element={<RequireStaffRole />}>
          <Route element={<StaffLayout />}>
            <Route index element={<Navigate to="monitoring" replace />} />
            <Route path="monitoring" element={<MonitoringDashboardPage />} />
            <Route path="warnings" element={<HazardWarningsPage />} />
            <Route path="warnings/create" element={<CreateHazardWarningPage />} />
            <Route path="warnings/success" element={<WarningSuccessPage />} />
            <Route path="warnings/:warningId" element={<WarningDetailsPage />} />
            <Route path="hazard-reports" element={<StaffHazardReportsPage />} />
            <Route path="hazard-reports/map" element={<StaffHazardReportsMapPage />} />
            <Route path="hazard-reports/:reportId" element={<StaffHazardReportDetailsPage />} />
            <Route path="monitoring/:district" element={<DistrictResponseOverviewPage />} />
            <Route path="monitoring/:district/realtime" element={<RealtimeMonitoringPage />} />
            <Route path="monitoring/:district/resources" element={<ResourcesSheltersMonitoringPage />} />
            <Route path="reports/generate" element={<GenerateReportPage />} />
            <Route path="reports/generate/configure" element={<ConfigureReportPage />} />
            <Route path="reports/generate/preview" element={<ReportPreviewPage />} />
            <Route path="reports/generate/progress" element={<ReportGenerationPage />} />
            <Route path="reports/:reportId" element={<ReportDetailsPage />} />
            <Route path="reports/history" element={<GeneratedReportsPage />} />
            <Route path="*" element={<div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-700 shadow-sm">Page not found.</div>} />
          </Route>
        </Route>
      </Routes>
    </ReportGenerationProvider>
    </StaffSessionProvider>
  );
}

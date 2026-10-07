import { useEffect } from 'react';
import { NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Activity, BarChart3, Bell, FileText, House, LayoutDashboard, MapPinned, Search, Settings, Users } from 'lucide-react';
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

const navItems = [
  { to: '/staff/monitoring', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/staff/monitoring/Colombo', label: 'District Overview', icon: MapPinned },
  { to: '/staff/monitoring/Colombo/realtime', label: 'Real-Time Monitoring', icon: Activity },
  { to: '/staff/monitoring/Colombo/resources', label: 'Resources & Shelters', icon: House },
  { to: '/staff/reports/generate', label: 'Generate Reports', icon: FileText },
  { to: '/staff/reports/history', label: 'Generated Reports', icon: BarChart3 },
  { to: '/staff/users', label: 'Users', icon: Users },
  { to: '/staff/settings', label: 'Settings', icon: Settings },
];

function RequireStaffRole() {
  const role = typeof window !== 'undefined' ? (localStorage.getItem('dmcStaffRole') || 'DMC_OFFICER') : 'DMC_OFFICER';
  const allowedRoles = ['DMC_OFFICER', 'DISTRICT_OFFICER', 'NGO_OFFICER'];

  if (!allowedRoles.includes(role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black">Access restricted</h1>
          <p className="mt-3 text-slate-600">This monitoring and reporting portal is for authorized DMC staff users.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

function StaffLayout() {
  const location = useLocation();

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
                    <div className="text-sm font-bold text-slate-800">DMC Officer</div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Officer</div>
                  </div>
                </div>
              </div>
            </div>
          </header>
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default function StaffRoutes() {
  return (
    <ReportGenerationProvider>
      <Routes>
        <Route element={<RequireStaffRole />}>
          <Route element={<StaffLayout />}>
            <Route index element={<Navigate to="monitoring" replace />} />
            <Route path="monitoring" element={<MonitoringDashboardPage />} />
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
  );
}

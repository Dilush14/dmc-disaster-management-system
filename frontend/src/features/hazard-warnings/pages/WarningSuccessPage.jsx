import { Link } from 'react-router-dom';
import { CheckCircle2, LayoutDashboard } from 'lucide-react';

export default function WarningSuccessPage() {
  return <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-10 text-center shadow-sm"><CheckCircle2 className="mx-auto text-emerald-500" size={64}/><h1 className="mt-5 text-3xl font-black">Hazard Warning Published Successfully</h1><p className="mx-auto mt-3 max-w-lg text-slate-600">The warning has been published and notifications are being sent to the selected channels.</p><div className="mt-8 rounded-xl bg-slate-50 p-5 text-left text-sm"><div className="flex justify-between"><span className="text-slate-500">Reference no.</span><b>HW-2026-015</b></div><div className="mt-3 flex justify-between"><span className="text-slate-500">Status</span><b className="text-emerald-700">Active</b></div></div><Link to="/staff/warnings" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white"><LayoutDashboard size={16}/> Back to Hazard Warnings</Link></div>;
}

import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Users,
  Award,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Building2,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const DashboardTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [companyStats, setCompanyStats] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('ALL');

  useEffect(() => {
    loadDashboard();
  }, [selectedCourse]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardReports({ course: selectedCourse });
      const compRes = await api.getCompanyReports();
      setData(res);
      setCompanyStats(compRes.companyStats || []);
    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-900 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading placement analytics & policy metrics...</p>
        </div>
      </div>
    );
  }

  const { summary, courseStats } = data;
  const { studentTotals, offerTotals, compensation, switchingStats, pendingCases, policyViolationsCount } = summary;

  // Chart data
  const courseChartData = courseStats.map((c: any) => ({
    name: c.course_code,
    Total: c.total_students,
    Placed: c.placed_students,
    Unplaced: c.unplaced_students,
    'Avg CTC': parseFloat((c.avg_package || 0).toFixed(1)),
    'Placement %': c.total_students > 0 ? Math.round((c.placed_students / c.total_students) * 100) : 0
  }));

  const categoryPieData = [
    { name: 'Category A+ (≥16 LPA)', value: offerTotals.category_a_plus_offers || 0, color: '#10b981' },
    { name: 'Category A (10–16 LPA)', value: offerTotals.category_a_offers || 0, color: '#3b82f6' },
    { name: 'Category B (6–10 LPA)', value: offerTotals.category_b_offers || 0, color: '#f59e0b' },
    { name: 'Category C (<6 LPA)', value: offerTotals.category_c_offers || 0, color: '#94a3b8' }
  ].filter(d => d.value > 0);

  const offerTypePieData = [
    { name: 'Internship Only (I)', value: studentTotals.internship_only_students || 0, color: '#8b5cf6' },
    { name: 'FTE Only (F)', value: studentTotals.fte_only_students || 0, color: '#0284c7' },
    { name: 'Internship + PPO/FTE (I+F)', value: studentTotals.internship_ppo_fte_students || 0, color: '#059669' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Placement Performance & Policy Compliance Summary
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
              Session 2026–27
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time tracking of NFSU student profiles, recruitment offers, compensation distributions, and switching pools.
          </p>
        </div>

        {/* Course Filter Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Filter Course:</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
          >
            <option value="ALL">All Five Programmes</option>
            <option value="M.Tech. CS">M.Tech. CS</option>
            <option value="M.Tech. AIDS">M.Tech. AIDS</option>
            <option value="B.Tech.–M.Tech. CS">B.Tech.–M.Tech. CS</option>
            <option value="M.Sc. CS">M.Sc. CS</option>
            <option value="M.Sc. DFIS">M.Sc. DFIS</option>
          </select>
        </div>
      </div>

      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Total Registered */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Registered</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{studentTotals.registered_students}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {studentTotals.eligible_students} Eligible · {studentTotals.pending_verification_students} Pending Verification
          </div>
        </div>

        {/* Unique Placed Students vs Total Offers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Unique Placed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{studentTotals.placed_students}</div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <span>{offerTotals.total_offers_received} Total Offers Received</span>
          </div>
        </div>

        {/* Unplaced Students */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Unplaced Active</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800">{studentTotals.unplaced_students}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            Available for ongoing drives
          </div>
        </div>

        {/* Highest FTE CTC */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Highest FTE CTC</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">₹{compensation.fte.highest} <span className="text-xs font-normal text-slate-500">LPA</span></div>
          <div className="mt-1 text-[11px] text-slate-500">
            Max Annual CTC offered
          </div>
        </div>

        {/* Average & Median FTE CTC */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>FTE CTC Metrics</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">
            Avg: ₹{compensation.fte.average} <span className="text-xs font-normal text-slate-500">LPA</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-600 font-medium">
            Median: ₹{compensation.fte.median} LPA
          </div>
        </div>
      </div>

      {/* Internship Stipend vs FTE CTC Separation Callout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stipend Highlights */}
        <div className="bg-linear-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Internship Stipend Statistics (Separate)
            </h3>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/80 rounded-lg p-2 border border-purple-100">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Highest</div>
              <div className="text-sm font-bold text-purple-900">₹{(compensation.stipend.highest).toLocaleString()}</div>
              <div className="text-[9px] text-slate-400">/ month</div>
            </div>
            <div className="bg-white/80 rounded-lg p-2 border border-purple-100">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Average</div>
              <div className="text-sm font-bold text-purple-900">₹{Math.round(compensation.stipend.average).toLocaleString()}</div>
              <div className="text-[9px] text-slate-400">/ month</div>
            </div>
            <div className="bg-white/80 rounded-lg p-2 border border-purple-100">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Median</div>
              <div className="text-sm font-bold text-purple-900">₹{Math.round(compensation.stipend.median).toLocaleString()}</div>
              <div className="text-[9px] text-slate-400">/ month</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-purple-700">
            Reported separately from annual CTC to ensure accurate institutional compensation auditing.
          </p>
        </div>

        {/* Switching Pool Breakdown */}
        <div className="bg-linear-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4 text-amber-600" />
            Switching Policy Eligibility Pool
          </h3>
          <div className="mt-2 space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between items-center bg-white/70 px-2 py-1 rounded border border-amber-100">
              <span>Category A (Eligible for A+ Only):</span>
              <span className="font-bold text-blue-700">{switchingStats.category_a_eligible_for_a_plus || 0} students</span>
            </div>
            <div className="flex justify-between items-center bg-white/70 px-2 py-1 rounded border border-amber-100">
              <span>Category B (Eligible for ≥1.5x CTC):</span>
              <span className="font-bold text-amber-700">{switchingStats.category_b_eligible_for_1_5x || 0} students</span>
            </div>
            <div className="flex justify-between items-center bg-white/70 px-2 py-1 rounded border border-amber-100">
              <span>Category C (Eligible for B, A, A+):</span>
              <span className="font-bold text-purple-700">{switchingStats.category_c_eligible_for_higher || 0} students</span>
            </div>
            <div className="flex justify-between items-center bg-white/70 px-2 py-1 rounded border border-amber-100">
              <span>Category A+ (Out of placement process):</span>
              <span className="font-bold text-emerald-700">{switchingStats.category_a_plus_completed_no_switch || 0} placed</span>
            </div>
          </div>
        </div>

        {/* Policy Compliance & Pending Cases */}
        <div className="bg-linear-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            Pending Cases & Compliance Alerts
          </h3>
          <div className="mt-2 space-y-2 text-xs text-slate-700">
            <div className="flex justify-between items-center">
              <span>Pending Offer Acceptance (24h Window):</span>
              <span className="font-bold text-amber-700">{offerTotals.pending_acceptance_offers || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Pending Joining Verification:</span>
              <span className="font-bold text-slate-800">{pendingCases.pending_joining || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Pending NOC Requests:</span>
              <span className="font-bold text-blue-700">{pendingCases.pending_noc || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Flagged Policy Violations:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-xs ${
                policyViolationsCount.pending_reviews > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {policyViolationsCount.pending_reviews || 0} cases
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course-wise Placement Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Course-Wise Placement Outcomes (5 Programmes)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Placed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Unplaced" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Offer Category Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Company Category Tier Distribution
          </h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(' ')[0]} ${name.split(' ')[1]} (${((percent || 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {categoryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Programme Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Detailed Course-Wise Placement Statistics
          </h3>
          <span className="text-xs text-slate-500 font-normal">NFSU School of Cyber Security & Digital Forensics</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3 text-center">Enrolled</th>
                <th className="px-4 py-3 text-center">Placed</th>
                <th className="px-4 py-3 text-center">Placement %</th>
                <th className="px-4 py-3 text-center">Internship (I)</th>
                <th className="px-4 py-3 text-center">FTE (F)</th>
                <th className="px-4 py-3 text-center">I + PPO/FTE</th>
                <th className="px-4 py-3 text-right">Highest CTC</th>
                <th className="px-4 py-3 text-right">Avg CTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {courseStats.map((c: any) => {
                const placementRate = c.total_students > 0 ? Math.round((c.placed_students / c.total_students) * 100) : 0;
                return (
                  <tr key={c.course_code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div>{c.course_name}</div>
                      <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-mono">
                        {c.course_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{c.total_students}</td>
                    <td className="px-4 py-3 text-center text-emerald-600 font-bold">{c.placed_students}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        placementRate >= 75 ? 'bg-emerald-100 text-emerald-800' :
                        placementRate >= 50 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {placementRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{c.internship_only}</td>
                    <td className="px-4 py-3 text-center">{c.fte_only}</td>
                    <td className="px-4 py-3 text-center">{c.internship_ppo_fte}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {c.highest_package ? `₹${c.highest_package} LPA` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {c.avg_package ? `₹${c.avg_package.toFixed(2)} LPA` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

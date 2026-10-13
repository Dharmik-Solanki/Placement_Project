import React, { useState } from 'react';
import { User, Role } from '../types';
import { api, setToken } from '../services/api';
import {
  GraduationCap,
  Lock,
  User as UserIcon,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('nfsu@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username, password);
      setToken(res.token);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (presetUser: string, presetPass: string) => {
    setUsername(presetUser);
    setPassword(presetPass);
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(presetUser, presetPass);
      setToken(res.token);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-900 flex items-center justify-center text-white mx-auto shadow-md">
            <GraduationCap className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-3">NFSU Placement Cell Portal</h2>
          <p className="text-xs text-slate-500 mt-0.5">National Forensic Sciences University · Session 2026–27</p>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-5 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Username or Institutional Email</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs transition-colors"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        {/* 1-Click Quick Demo Personas */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
            1-Click Demo Evaluation Personas:
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickLogin('admin', 'nfsu@2026')}
              className="p-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-left transition-colors"
            >
              <div className="font-bold text-red-900 flex items-center justify-between">
                <span>Admin</span>
                <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
              </div>
              <div className="text-[10px] text-red-700">Full System Control</div>
            </button>

            <button
              onClick={() => handleQuickLogin('officer', 'nfsu@2026')}
              className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-left transition-colors"
            >
              <div className="font-bold text-blue-900 flex items-center justify-between">
                <span>Officer</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-[10px] text-blue-700">Drives & Attendance</div>
            </button>

            <button
              onClick={() => handleQuickLogin('coord_dfis', 'nfsu@2026')}
              className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-left transition-colors"
            >
              <div className="font-bold text-emerald-900 flex items-center justify-between">
                <span>Coordinator</span>
                <Users className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-[10px] text-emerald-700">M.Sc. DFIS Scoped</div>
            </button>

            <button
              onClick={() => handleQuickLogin('student_arjun', 'student123')}
              className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-left transition-colors"
            >
              <div className="font-bold text-amber-900 flex items-center justify-between">
                <span>Student</span>
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-[10px] text-amber-700">Arjun (Candidate View)</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { User, Role } from '../types';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Briefcase,
  FileCheck,
  ShieldCheck,
  ClipboardList,
  History,
  LogOut,
  ChevronDown,
  UserCheck
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onSwitchRole: (role: Role, course?: string, company?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  onSwitchRole
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Analytics & Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Student Database', icon: Users },
    { id: 'drives', label: 'Recruitment Drives', icon: Briefcase },
    { id: 'offers', label: 'Offers & History', icon: FileCheck },
    { id: 'policy', label: 'Policy Rule Engine', icon: ShieldCheck },
    { id: 'attendance', label: 'Attendance & Violations', icon: ClipboardList },
    ...(user?.role === 'admin' ? [{ id: 'audit', label: 'Audit Trail', icon: History }] : []),
  ];

  const roleLabels: Record<Role, { title: string; badge: string; color: string }> = {
    admin: { title: 'Placement Administrator', badge: 'Full Access', color: 'bg-red-500/10 text-red-700 border-red-200' },
    officer: { title: 'Placement Officer', badge: 'Operations', color: 'bg-blue-500/10 text-blue-700 border-blue-200' },
    coordinator: { title: 'Course Coordinator', badge: user?.assigned_course || 'Course Scoped', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
    company: { title: 'Corporate Recruiter', badge: user?.company_name || 'Recruiter', color: 'bg-purple-500/10 text-purple-700 border-purple-200' },
    student: { title: 'Student', badge: user?.student_name ? `${user.student_name} (${user.student_course})` : 'Student', color: 'bg-amber-500/10 text-amber-700 border-amber-200' },
  };

  const currentRoleInfo = user ? roleLabels[user.role] : null;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold tracking-wide">NATIONAL FORENSIC SCIENCES UNIVERSITY (NFSU)</span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300 hidden sm:inline">Student Placement Cell (Guidelines 2026–27)</span>
        </div>

        {/* Demo Role Switcher Quick Pill */}
        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <span className="text-slate-400">Switch Persona:</span>
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-medium capitalize">{user?.role}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {roleMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-64 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-normal"
                onMouseLeave={() => setRoleMenuOpen(false)}
              >
                <div className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  Select Persona to Evaluate:
                </div>
                <button
                  onClick={() => { onSwitchRole('admin'); setRoleMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span className="font-medium text-slate-900">Placement Admin</span>
                  <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded">All Permissions</span>
                </button>
                <button
                  onClick={() => { onSwitchRole('officer'); setRoleMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span className="font-medium text-slate-900">Placement Officer</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Manage Drives</span>
                </button>
                <button
                  onClick={() => { onSwitchRole('coordinator', 'M.Sc. DFIS'); setRoleMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span className="font-medium text-slate-900">Coordinator (M.Sc. DFIS)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Course Scoped</span>
                </button>
                <button
                  onClick={() => { onSwitchRole('company', undefined, 'Palo Alto Networks'); setRoleMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span className="font-medium text-slate-900">Recruiter (Palo Alto)</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">A+ Company</span>
                </button>
                <button
                  onClick={() => { onSwitchRole('student'); setRoleMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span className="font-medium text-slate-900">Student (Arjun Mehta)</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Candidate Portal</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            title="Log out"
            className="p-1 text-slate-400 hover:text-white transition-colors ml-1"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">NFSU Placement Cell</h1>
                <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  Session 2026–27
                </span>
              </div>
              <p className="text-xs text-slate-500">Policy-Driven Placement Automation & Compliance Engine</p>
            </div>
          </div>

          {/* Current User Badge */}
          {user && currentRoleInfo && (
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-800">{user.username}</div>
                <div className="text-[11px] text-slate-500">{currentRoleInfo.title}</div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${currentRoleInfo.color}`}>
                {currentRoleInfo.badge}
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto border-t border-slate-100 py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

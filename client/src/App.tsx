import React, { useState, useEffect } from 'react';
import { User, Role } from './types';
import { api, setToken, removeToken } from './services/api';
import { Navbar } from './components/Navbar';
import { DashboardTab } from './components/DashboardTab';
import { StudentsTab } from './components/StudentsTab';
import { DrivesTab } from './components/DrivesTab';
import { OffersTab } from './components/OffersTab';
import { PolicySimulatorTab } from './components/PolicySimulatorTab';
import { AttendanceComplianceTab } from './components/AttendanceComplianceTab';
import { AuditLogsTab } from './components/AuditLogsTab';
import { LoginModal } from './components/LoginModal';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    try {
      const res = await api.getMe();
      if (res.user) {
        setCurrentUser(res.user);
      }
    } catch {
      // Not logged in or invalid token
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    removeToken();
    setCurrentUser(null);
  };

  const handleSwitchRole = async (role: Role, course?: string, company?: string) => {
    try {
      const res = await api.demoSwitch(role, course, company);
      setToken(res.token);
      setCurrentUser(res.user);
    } catch (err: any) {
      alert(`Role switch error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-400 border-t-amber-400 rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold tracking-wider text-slate-300">
            INITIALIZING NFSU PLACEMENT CELL PORTAL (2026–27)...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {!currentUser ? (
        <LoginModal onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          <Navbar
            user={currentUser}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
            onSwitchRole={handleSwitchRole}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'students' && <StudentsTab currentUser={currentUser} />}
            {activeTab === 'drives' && <DrivesTab currentUser={currentUser} />}
            {activeTab === 'offers' && <OffersTab currentUser={currentUser} />}
            {activeTab === 'policy' && <PolicySimulatorTab />}
            {activeTab === 'attendance' && <AttendanceComplianceTab currentUser={currentUser} />}
            {activeTab === 'audit' && currentUser.role === 'admin' && <AuditLogsTab currentUser={currentUser} />}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 py-4 mt-8">
            <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
              <p className="font-semibold text-slate-700">
                National Forensic Sciences University (NFSU) · Student Placement Cell
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Compliant with Student Placement Guidelines for 2026–27 Session · Covered Programmes: M.Tech. CS, M.Tech. AIDS, B.Tech.–M.Tech. CS, M.Sc. CS, M.Sc. DFIS
              </p>
            </div>
          </footer>
        </>
      )}
    </div>
  );
};

export default App;

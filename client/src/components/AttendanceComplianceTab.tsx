import React, { useState, useEffect } from 'react';
import { User, Drive, Student, PolicyViolation, AttendanceRecord } from '../types';
import { api } from '../services/api';
import {
  ClipboardList,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileCheck,
  Plus,
  RefreshCw,
  X,
  UserCheck
} from 'lucide-react';

interface AttendanceComplianceTabProps {
  currentUser: User | null;
}

export const AttendanceComplianceTab: React.FC<AttendanceComplianceTabProps> = ({ currentUser }) => {
  const [violations, setViolations] = useState<PolicyViolation[]>([]);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Record Attendance Form
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedDriveId, setSelectedDriveId] = useState<number | ''>('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [activityType, setActivityType] = useState<'PPT' | 'Online Test' | 'Technical Interview' | 'HR Interview'>('PPT');
  const [status, setStatus] = useState<'Present' | 'Absent' | 'Excused'>('Present');
  const [excuseReason, setExcuseReason] = useState('');

  // Emergency Waiver Modal
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [waiverStudentId, setWaiverStudentId] = useState<number | null>(null);
  const [waiverViolationId, setWaiverViolationId] = useState<number | null>(null);
  const [waiverReason, setWaiverReason] = useState('');

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'officer';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const vRes = await api.getPolicyViolations();
      const dRes = await api.getDrives();
      const sRes = await api.getStudents({ limit: 100 });
      setViolations(vRes.violations || []);
      setDrives(dRes.drives || []);
      setStudents(sRes.students || []);

      if (dRes.drives?.length > 0) setSelectedDriveId(dRes.drives[0].id);
      if (sRes.students?.length > 0) setSelectedStudentId(sRes.students[0].id);
    } catch (err) {
      console.error('Error loading attendance & compliance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriveId || !selectedStudentId) return;

    try {
      const res = await api.recordAttendance({
        drive_id: Number(selectedDriveId),
        student_id: Number(selectedStudentId),
        activity_type: activityType,
        status,
        excuse_reason: excuseReason
      });

      alert(res.message);
      setRecordModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Error recording attendance: ${err.message}`);
    }
  };

  const handleGrantWaiver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiverStudentId || !waiverReason) return;

    try {
      const res = await api.grantEmergencyWaiver(waiverStudentId, waiverReason, waiverViolationId || undefined);
      alert(res.message);
      setWaiverModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Error granting waiver: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-700" />
            Recruitment Attendance & Absenteeism Exclusion Policy
          </h2>
          <p className="text-xs text-slate-500">
            Automates the NFSU 3-drive ban penalty for unexcused recruitment absenteeism, with administrative emergency waiver workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              onClick={() => setRecordModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Record Activity Attendance</span>
            </button>
          )}
        </div>
      </div>

      {/* Policy Violations & Compliance Queue */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Flagged Policy Violations & Disciplinary Review Queue
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {violations.filter(v => v.status === 'FLAGGED').length} Active Flags Requiring Review
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading policy violation cases...</div>
          ) : violations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic">No policy violations flagged. All candidates in compliance.</div>
          ) : (
            violations.map((v) => {
              const isFlagged = v.status === 'FLAGGED';
              const isWaived = v.status === 'WAIVED';

              return (
                <div key={v.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{v.student_name}</span>
                      <span className="font-mono text-[10px] text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                        {v.placement_id}
                      </span>
                      <span className="text-[10px] text-slate-500">{v.course}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        v.violation_type === 'ABSENTEEISM' ? 'bg-red-100 text-red-800' :
                        v.violation_type === 'UNAUTHORIZED_SWITCHING' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {v.violation_type}
                      </span>
                    </div>

                    <p className="mt-1.5 text-slate-700">{v.description}</p>
                    <div className="mt-1 text-[10px] text-slate-400">
                      Logged at: {v.timestamp} {v.company_name ? `· Drive: ${v.company_name}` : ''}
                      {v.action_taken && <span className="font-medium text-emerald-700 ml-2">Action: {v.action_taken}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      isFlagged ? 'bg-red-600 text-white' :
                      isWaived ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {v.status}
                    </span>

                    {/* Emergency Exception Waiver Trigger */}
                    {canManage && isFlagged && (
                      <button
                        onClick={() => {
                          setWaiverStudentId(v.student_id);
                          setWaiverViolationId(v.id);
                          setWaiverReason('');
                          setWaiverModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-semibold transition-colors shadow-2xs"
                      >
                        Grant Emergency Exception
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RECORD ATTENDANCE MODAL */}
      {recordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Drive Activity Attendance</h3>
              <button onClick={() => setRecordModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordAttendance} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Select Drive *</label>
                <select
                  required
                  value={selectedDriveId}
                  onChange={(e) => setSelectedDriveId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                >
                  {drives.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.drive_code} - {d.company_name} (Cat {d.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Select Student *</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.placement_id}) · {s.course}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Activity Type *</label>
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  >
                    <option value="PPT">Pre-Placement Talk (PPT)</option>
                    <option value="Online Test">Online Test</option>
                    <option value="Technical Interview">Technical Interview</option>
                    <option value="HR Interview">HR Interview</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Attendance Status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent (Triggers 3-Drive Ban!)</option>
                    <option value="Excused">Excused (Approved Prior Leave)</option>
                  </select>
                </div>
              </div>

              {status === 'Absent' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 text-xs">
                  <span className="font-bold">⚠️ NFSU Placement Guideline Policy Warning:</span> Marking this candidate as unexcused Absent will automatically enforce a 3-drive exclusion penalty and register a policy violation.
                </div>
              )}

              {status === 'Excused' && (
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Documented Excuse Reason</label>
                  <input
                    type="text"
                    required
                    placeholder="Medical emergency or prior university representation..."
                    value={excuseReason}
                    onChange={(e) => setExcuseReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRecordModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-md font-semibold"
                >
                  Submit Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMERGENCY EXCEPTION WAIVER MODAL */}
      {waiverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Authorize Emergency Policy Waiver</h3>
              <button onClick={() => setWaiverModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGrantWaiver} className="mt-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Placement Administrator / Officer authorization: Approving an emergency exception resets the candidate's 3-drive ban and marks the disciplinary flag as WAIVED.
              </p>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Official Waiver Justification *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Documented proof verified by Placement Cell / Competent Authority..."
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setWaiverModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold"
                >
                  Approve Exception Waiver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { AuditLog, User } from '../types';
import { api } from '../services/api';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Eye,
  X,
  FileText
} from 'lucide-react';

interface AuditLogsTabProps {
  currentUser: User | null;
}

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({ currentUser }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, [selectedAction, selectedEntity]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        action: selectedAction,
        entity_type: selectedEntity,
        limit: 100
      });
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-700" />
            Tamper-Evident Administrative Audit Trail
            <span className="text-[10px] bg-red-100 text-red-800 font-semibold px-2 py-0.5 rounded-full border border-red-200">
              Administrator Access Only
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Immutable tracking of student record mutations, offer events, CSV exports, policy waivers, and authorization checks.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="ALL">All Actions</option>
            <option value="STUDENT_CREATE">STUDENT_CREATE</option>
            <option value="STUDENT_UPDATE">STUDENT_UPDATE</option>
            <option value="OFFER_CREATE">OFFER_CREATE</option>
            <option value="OFFER_ACCEPTED">OFFER_ACCEPTED</option>
            <option value="EMERGENCY_EXCEPTION_WAIVER">EMERGENCY_EXCEPTION_WAIVER</option>
            <option value="EXPORT_STUDENT_CSV">EXPORT_STUDENT_CSV</option>
            <option value="IMPORT_STUDENTS_CSV">IMPORT_STUDENTS_CSV</option>
          </select>

          {/* Entity Filter */}
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="ALL">All Entities</option>
            <option value="student">student</option>
            <option value="offer">offer</option>
            <option value="drive">drive</option>
            <option value="policy_violation">policy_violation</option>
            <option value="user">user</option>
          </select>

          <button
            onClick={loadAuditLogs}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor / Role</th>
                <th className="px-4 py-3">Action Event</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Reason / Context</th>
                <th className="px-4 py-3 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">Loading audit records...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">No audit logs found.</td>
                </tr>
              ) : (
                logs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{log.username}</div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          {log.user_role}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700">{log.entity_type}</span>
                        {log.entity_id && (
                          <span className="text-[10px] text-slate-400 block font-mono">ID: {log.entity_id}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={log.reason}>
                        {log.reason || '—'}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="Inspect before/after state diff"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Diff Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded">
                  Audit Log #{selectedLog.id}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedLog.action}</h3>
                <p className="text-xs text-slate-500">
                  By {selectedLog.username} ({selectedLog.user_role}) at {selectedLog.timestamp}
                </p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-semibold">Documented Rationale: </span>
                <span className="text-slate-800">{selectedLog.reason || 'N/A'}</span>
              </div>

              {/* State Snapshots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h4 className="text-slate-500 font-bold uppercase text-[10px] mb-1">Before State:</h4>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono h-48">
                    {selectedLog.before_state ? JSON.stringify(selectedLog.before_state, null, 2) : 'null (No previous state)'}
                  </pre>
                </div>
                <div>
                  <h4 className="text-slate-500 font-bold uppercase text-[10px] mb-1">After State:</h4>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto text-[11px] font-mono h-48">
                    {selectedLog.after_state ? JSON.stringify(selectedLog.after_state, null, 2) : 'null'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

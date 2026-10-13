import React, { useState, useEffect } from 'react';
import { Offer, User, Student } from '../types';
import { api } from '../services/api';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Building,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  X,
  FileText
} from 'lucide-react';

interface OffersTabProps {
  currentUser: User | null;
}

export const OffersTab: React.FC<OffersTabProps> = ({ currentUser }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [filterAcceptance, setFilterAcceptance] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Issue Offer Modal
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [companyName, setCompanyName] = useState('');
  const [offerType, setOfferType] = useState<'I' | 'F' | 'I+F'>('F');
  const [ftePackage, setFtePackage] = useState(12.5);
  const [internshipStipend, setInternshipStipend] = useState(0);
  const [internshipPeriod, setInternshipPeriod] = useState('6 Months');
  const [ppoStatus, setPpoStatus] = useState<'N/A' | 'Pending' | 'Offered' | 'Accepted' | 'Declined'>('N/A');
  const [deadlineHours, setDeadlineHours] = useState(24);
  const [forceOverride, setForceOverride] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);

  // Joining / NOC Modal
  const [joiningModalOpen, setJoiningModalOpen] = useState(false);
  const [activeOffer, setActiveOffer] = useState<Offer | null>(null);
  const [joiningStatus, setJoiningStatus] = useState('Pending');
  const [nocStatus, setNocStatus] = useState('Pending');
  const [joiningRemarks, setJoiningRemarks] = useState('');

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'officer';
  const isStudent = currentUser?.role === 'student';

  useEffect(() => {
    loadOffers();
    if (canManage) {
      loadStudents();
    }
  }, [filterAcceptance, filterCategory]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const res = await api.getOffers({
        offer_acceptance: filterAcceptance,
        category: filterCategory
      });
      setOffers(res.offers || []);
    } catch (err) {
      console.error('Error fetching offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await api.getStudents({ limit: 100 });
      setStudentsList(res.students || []);
    } catch (err) {
      console.error('Error loading students:', err);
    }
  };

  const handleAcceptance = async (offerId: number, status: 'Accepted' | 'Declined') => {
    const actionText = status === 'Accepted' ? 'accept' : 'decline';
    if (!confirm(`Are you sure you want to ${actionText} this offer? This will update your active placement record under NFSU guidelines.`)) return;

    try {
      await api.updateOfferAcceptance(offerId, status, `Candidate marked ${status}`);
      loadOffers();
      alert(`Offer successfully marked as ${status}.`);
    } catch (err: any) {
      alert(`Error updating acceptance: ${err.message}`);
    }
  };

  const handleIssueOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    setPolicyError(null);
    try {
      await api.createOffer({
        student_id: selectedStudentId,
        company_name: companyName,
        offer_type: offerType,
        fte_package: ftePackage,
        internship_stipend: internshipStipend,
        internship_period: internshipPeriod,
        ppo_status: ppoStatus,
        acceptance_deadline_hours: deadlineHours,
        force_override: forceOverride
      });
      setIssueModalOpen(false);
      loadOffers();
      alert('Offer successfully issued and recorded in placement history.');
    } catch (err: any) {
      setPolicyError(err.message);
    }
  };

  const handleUpdateJoiningNoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOffer) return;

    try {
      await api.updateJoiningNoc(activeOffer.id, {
        joining_status: joiningStatus,
        noc_status: nocStatus,
        remarks: joiningRemarks
      });
      setJoiningModalOpen(false);
      loadOffers();
      alert('Joining and NOC status updated.');
    } catch (err: any) {
      alert(`Error updating: ${err.message}`);
    }
  };

  // Helper for 24-hour remaining countdown
  const getRemainingTime = (deadlineStr: string) => {
    const diff = new Date(deadlineStr).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  };

  return (
    <div className="space-y-5">
      {/* Top Filter and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            Placement Offers History & 24h Acceptance Registry
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
              Full History Preserved
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Immutable log of all job offers, stipends, 24-hour response deadlines, PPOs, and NOC clearances.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={filterAcceptance}
            onChange={(e) => setFilterAcceptance(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="ALL">All Acceptance States</option>
            <option value="Pending">Pending (Active Window)</option>
            <option value="Accepted">Accepted</option>
            <option value="Declined">Declined</option>
            <option value="Expired">Expired (Window Passed)</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="A+">Category A+ (≥16 LPA)</option>
            <option value="A">Category A (10–16 LPA)</option>
            <option value="B">Category B (6–10 LPA)</option>
            <option value="C">Category C (&lt;6 LPA)</option>
          </select>

          {canManage && (
            <button
              onClick={() => { setIssueModalOpen(true); setPolicyError(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Issue Offer</span>
            </button>
          )}
        </div>
      </div>

      {/* Offers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Company & Category</th>
                <th className="px-4 py-3">Offer Classification</th>
                <th className="px-4 py-3 text-right">Compensation</th>
                <th className="px-4 py-3 text-center">24h Acceptance Window</th>
                <th className="px-4 py-3 text-center">PPO / NOC / Joining</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">Loading offers registry...</td>
                </tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">No offers found.</td>
                </tr>
              ) : (
                offers.map((offer) => {
                  const isPending = offer.offer_acceptance === 'Pending';
                  const remaining = getRemainingTime(offer.acceptance_deadline);
                  const isExpired = remaining === 'Expired' && isPending;

                  return (
                    <tr key={offer.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Student */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{offer.student_name}</div>
                        <span className="text-[10px] font-mono text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                          {offer.placement_id}
                        </span>
                        <div className="text-[10px] text-slate-500">{offer.course}</div>
                      </td>

                      {/* Company & Category */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {offer.company_name}
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            offer.category === 'A+' ? 'bg-emerald-600 text-white' :
                            offer.category === 'A' ? 'bg-blue-600 text-white' :
                            offer.category === 'B' ? 'bg-amber-600 text-white' : 'bg-slate-600 text-white'
                          }`}>
                            Cat {offer.category}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">Issued: {offer.offer_date}</div>
                      </td>

                      {/* Offer Type */}
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          offer.offer_type === 'I+F' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          offer.offer_type === 'F' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {offer.offer_type === 'I+F' ? 'Internship + FTE' : offer.offer_type === 'F' ? 'FTE Only' : 'Internship Only'}
                        </span>
                      </td>

                      {/* Compensation */}
                      <td className="px-4 py-3 text-right">
                        {offer.fte_package > 0 && (
                          <div className="font-bold text-emerald-700 text-xs">
                            ₹{offer.fte_package} LPA
                          </div>
                        )}
                        {offer.internship_stipend > 0 && (
                          <div className="text-[11px] text-purple-700 font-medium">
                            ₹{offer.internship_stipend.toLocaleString()}/mo
                          </div>
                        )}
                      </td>

                      {/* 24h Window & Acceptance */}
                      <td className="px-4 py-3 text-center">
                        <div className="space-y-1">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            offer.offer_acceptance === 'Accepted' ? 'bg-emerald-100 text-emerald-800' :
                            offer.offer_acceptance === 'Declined' ? 'bg-red-100 text-red-800' :
                            isExpired || offer.offer_acceptance === 'Expired' ? 'bg-slate-200 text-slate-700' :
                            'bg-amber-100 text-amber-800 animate-pulse'
                          }`}>
                            {offer.offer_acceptance}
                          </span>

                          {isPending && !isExpired && (
                            <div className="text-[10px] font-semibold text-amber-700 flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{remaining}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* PPO / NOC / Joining */}
                      <td className="px-4 py-3 text-center text-[10px] text-slate-600 space-y-0.5">
                        <div>PPO: <span className="font-semibold text-slate-800">{offer.ppo_status}</span></div>
                        <div>Joining: <span className="font-semibold text-slate-800">{offer.joining_status}</span></div>
                        <div>NOC: <span className="font-semibold text-blue-700">{offer.noc_status}</span></div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Student accept/decline buttons */}
                          {isPending && !isExpired && (
                            <>
                              <button
                                onClick={() => handleAcceptance(offer.id, 'Accepted')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[10px] flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Accept
                              </button>
                              <button
                                onClick={() => handleAcceptance(offer.id, 'Declined')}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-[10px] flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" /> Decline
                              </button>
                            </>
                          )}

                          {canManage && (
                            <button
                              onClick={() => {
                                setActiveOffer(offer);
                                setJoiningStatus(offer.joining_status);
                                setNocStatus(offer.noc_status);
                                setJoiningRemarks(offer.remarks || '');
                                setJoiningModalOpen(true);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium"
                            >
                              Update Status
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ISSUE OFFER MODAL WITH POLICY ENGINE VALIDATION */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-700" />
                Issue Recruitment Offer (Policy-Checked)
              </h3>
              <button onClick={() => setIssueModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssueOffer} className="mt-4 space-y-3 text-xs">
              {policyError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 text-xs">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-600" /> Policy Violation Conflict:
                  </div>
                  <p className="mt-1">{policyError}</p>
                  {currentUser?.role === 'admin' && (
                    <label className="mt-2 flex items-center gap-1.5 font-bold text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forceOverride}
                        onChange={(e) => setForceOverride(e.target.checked)}
                      />
                      <span>Administrator Emergency Override (Authorize Exception)</span>
                    </label>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-medium mb-1">Select Student Candidate *</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                >
                  <option value="">-- Choose Candidate --</option>
                  {studentsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.placement_id}) · {s.course} · {s.placement_status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Palo Alto Networks"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Offer Classification *</label>
                  <select
                    value={offerType}
                    onChange={(e) => setOfferType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  >
                    <option value="I">Internship only (I)</option>
                    <option value="F">FTE only (F)</option>
                    <option value="I+F">Internship + PPO/FTE (I+F)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">FTE Annual CTC (LPA)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ftePackage}
                    onChange={(e) => setFtePackage(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Internship Stipend (INR/mo)</label>
                  <input
                    type="number"
                    value={internshipStipend}
                    onChange={(e) => setInternshipStipend(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">PPO Status</label>
                  <select
                    value={ppoStatus}
                    onChange={(e) => setPpoStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  >
                    <option value="N/A">N/A</option>
                    <option value="Pending">Pending</option>
                    <option value="Offered">Offered</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Acceptance Window (Hours)</label>
                  <input
                    type="number"
                    value={deadlineHours}
                    onChange={(e) => setDeadlineHours(parseInt(e.target.value, 10) || 24)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-md font-semibold"
                >
                  Issue Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOINING / NOC MODAL */}
      {joiningModalOpen && activeOffer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Update Joining & NOC Status: {activeOffer.company_name}
              </h3>
              <button onClick={() => setJoiningModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateJoiningNoc} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Joining Status</label>
                <select
                  value={joiningStatus}
                  onChange={(e) => setJoiningStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                >
                  <option value="Pending">Pending</option>
                  <option value="Joined">Joined</option>
                  <option value="Not Joined">Not Joined</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">NOC Status (No Objection Certificate)</label>
                <select
                  value={nocStatus}
                  onChange={(e) => setNocStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                >
                  <option value="N/A">N/A</option>
                  <option value="Pending">Pending Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Administrative Remarks</label>
                <textarea
                  rows={2}
                  value={joiningRemarks}
                  onChange={(e) => setJoiningRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setJoiningModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-md font-semibold"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

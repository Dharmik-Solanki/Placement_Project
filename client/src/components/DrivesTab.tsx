import React, { useState, useEffect } from 'react';
import { Drive, User } from '../types';
import { api } from '../services/api';
import {
  Briefcase,
  Plus,
  Calendar,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  FileCheck,
  X
} from 'lucide-react';

interface DrivesTabProps {
  currentUser: User | null;
}

export const DrivesTab: React.FC<DrivesTabProps> = ({ currentUser }) => {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedOfferType, setSelectedOfferType] = useState('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [eligibilityModalOpen, setEligibilityModalOpen] = useState(false);
  const [evaluatingDrive, setEvaluatingDrive] = useState<Drive | null>(null);
  const [candidatePool, setCandidatePool] = useState<any | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  // New Drive Form
  const [formData, setFormData] = useState({
    drive_code: '',
    company_name: '',
    offer_type: 'F' as 'I' | 'F' | 'I+F',
    fte_package: 14.0,
    internship_stipend: 0,
    internship_duration: '6 Months',
    min_cgpa: 7.5,
    max_backlogs: 0,
    eligible_courses: ['M.Sc. DFIS', 'M.Tech. CS', 'M.Tech. AIDS'],
    batch: '2025-27',
    drive_date: new Date().toISOString().split('T')[0],
    acceptance_deadline_hours: 24,
    description: ''
  });

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'officer';

  useEffect(() => {
    loadDrives();
  }, [selectedCategory, selectedOfferType]);

  const loadDrives = async () => {
    setLoading(true);
    try {
      const res = await api.getDrives({
        category: selectedCategory,
        offer_type: selectedOfferType
      });
      setDrives(res.drives || []);
    } catch (err) {
      console.error('Error fetching drives:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDrive(formData);
      setCreateModalOpen(false);
      loadDrives();
      alert('Recruitment Drive published successfully.');
    } catch (err: any) {
      alert(`Error creating drive: ${err.message}`);
    }
  };

  const openCandidateEligibility = async (drive: Drive) => {
    setEvaluatingDrive(drive);
    setEligibilityModalOpen(true);
    setEvalLoading(true);
    try {
      const res = await api.getCandidatesEligibility(drive.id);
      setCandidatePool(res);
    } catch (err: any) {
      alert(`Error evaluating candidates: ${err.message}`);
    } finally {
      setEvalLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            Campus Recruitment Drives & Company Engagement
            <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
              Session 2026–27
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Automated category enforcement (A+, A, B, C) and policy checks for all recruitment opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="A+">Category A+ (≥16 LPA)</option>
            <option value="A">Category A (10–16 LPA)</option>
            <option value="B">Category B (6–10 LPA)</option>
            <option value="C">Category C (&lt;6 LPA)</option>
          </select>

          {/* Offer Type filter */}
          <select
            value={selectedOfferType}
            onChange={(e) => setSelectedOfferType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="ALL">All Offer Types</option>
            <option value="I">Internship (I)</option>
            <option value="F">Full-Time (FTE)</option>
            <option value="I+F">Internship + FTE (I+F)</option>
          </select>

          {canManage && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Create Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* Drives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs">Loading drives...</div>
        ) : drives.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs">No drives match current filter criteria.</div>
        ) : (
          drives.map((drive) => {
            const isCompleted = drive.status === 'Completed';
            return (
              <div
                key={drive.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {drive.drive_code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{drive.company_name}</h3>
                    </div>
                    {/* Category Pill */}
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      drive.category === 'A+' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      drive.category === 'A' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                      drive.category === 'B' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}>
                      Cat {drive.category}
                    </span>
                  </div>

                  {/* Compensation Details */}
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Offer Type:</span>
                      <span className="font-semibold text-slate-800">
                        {drive.offer_type === 'I+F' ? 'Internship + PPO/FTE' : drive.offer_type === 'F' ? 'FTE Only' : 'Internship Only'}
                      </span>
                    </div>
                    {drive.fte_package > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Annual FTE CTC:</span>
                        <span className="font-bold text-emerald-700">₹{drive.fte_package} LPA</span>
                      </div>
                    )}
                    {drive.internship_stipend > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Internship Stipend:</span>
                        <span className="font-semibold text-purple-700">₹{drive.internship_stipend.toLocaleString()}/month</span>
                      </div>
                    )}
                  </div>

                  {/* Eligibility criteria */}
                  <div className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Cutoff:</span>
                      <span className="font-semibold text-slate-800">Min CGPA {drive.min_cgpa} · Max {drive.max_backlogs} Backlogs</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-slate-400 font-medium">Eligible:</span>
                      <div className="flex flex-wrap gap-1">
                        {drive.eligible_courses?.map((c) => (
                          <span key={c} className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.2 rounded border border-blue-100 font-mono">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Drive Date: {drive.drive_date} · 24h Deadline Window</span>
                    </div>
                  </div>
                </div>

                {/* Footer and Policy Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    drive.status === 'Completed' ? 'bg-slate-100 text-slate-600' :
                    drive.status === 'Ongoing' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {drive.status}
                  </span>

                  {/* Candidate Eligibility Evaluator */}
                  <button
                    onClick={() => openCandidateEligibility(drive)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-800 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors border border-blue-200"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Evaluate Eligible Pool</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CANDIDATE ELIGIBILITY POOL EVALUATION MODAL (POLICY ENGINE INTEGRATION) */}
      {eligibilityModalOpen && evaluatingDrive && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                  {evaluatingDrive.drive_code}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Candidate Policy Evaluation Pool: {evaluatingDrive.company_name} (Cat {evaluatingDrive.category})
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time rule engine evaluation across all NFSU students based on guidelines 2026–27.
                </p>
              </div>
              <button onClick={() => setEligibilityModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {evalLoading ? (
              <div className="py-20 text-center text-xs text-slate-500">
                <div className="w-6 h-6 border-3 border-blue-800 border-t-amber-400 rounded-full animate-spin mx-auto mb-2"></div>
                Evaluating policy rules across cohort...
              </div>
            ) : candidatePool && (
              <>
                {/* Summary Pills */}
                <div className="grid grid-cols-4 gap-3 my-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Evaluated</div>
                    <div className="text-lg font-bold text-slate-900">{candidatePool.total_evaluated}</div>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
                    <div className="text-[10px] text-emerald-700 font-semibold uppercase">Eligible to Apply</div>
                    <div className="text-lg font-bold text-emerald-700">{candidatePool.eligible_count}</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                    <div className="text-[10px] text-red-700 font-semibold uppercase">Policy Blocked</div>
                    <div className="text-lg font-bold text-red-700">{candidatePool.blocked_count}</div>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-center">
                    <div className="text-[10px] text-amber-700 font-semibold uppercase">Review / Pending</div>
                    <div className="text-lg font-bold text-amber-700">{candidatePool.review_count}</div>
                  </div>
                </div>

                {/* Candidates List with Explainable Reasons */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {candidatePool.evaluations.map((item: any) => {
                    const { student, evaluation } = item;
                    const isAllowed = evaluation.allowed;
                    const isBlocked = evaluation.status === 'BLOCKED';

                    return (
                      <div
                        key={student.id}
                        className={`p-3 rounded-lg border text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2 ${
                          isAllowed ? 'bg-emerald-50/50 border-emerald-200' :
                          isBlocked ? 'bg-red-50/50 border-red-200' : 'bg-amber-50/50 border-amber-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{student.name}</span>
                            <span className="text-[10px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {student.placement_id}
                            </span>
                            <span className="text-[10px] text-blue-700 font-medium">{student.course}</span>
                            <span className="text-[10px] text-slate-500">CGPA: {student.cgpa}</span>
                          </div>

                          {/* Reasons Explanation */}
                          <div className="mt-1 text-[11px]">
                            {evaluation.reasons.length > 0 ? (
                              <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                                {evaluation.reasons.map((r: string, idx: number) => (
                                  <li key={idx} className={isBlocked ? 'text-red-700 font-medium' : 'text-amber-700'}>
                                    {r}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-emerald-700 font-medium">
                                ✓ Fully compliant with NFSU switching and academic eligibility criteria.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 self-start md:self-auto shrink-0">
                          {isAllowed ? (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-full font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> ALLOWED
                            </span>
                          ) : isBlocked ? (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white rounded-full font-bold text-[10px]">
                              <XCircle className="w-3 h-3" /> BLOCKED
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-full font-bold text-[10px]">
                              <AlertTriangle className="w-3 h-3" /> REVIEW
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CREATE DRIVE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Publish New Recruitment Drive</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDrive} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Drive Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="DRV-2026-008"
                    value={formData.drive_code}
                    onChange={(e) => setFormData({ ...formData, drive_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Google Cloud"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Offer Type *</label>
                  <select
                    value={formData.offer_type}
                    onChange={(e) => setFormData({ ...formData, offer_type: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  >
                    <option value="I">Internship only (I)</option>
                    <option value="F">FTE only (F)</option>
                    <option value="I+F">Internship + PPO/FTE (I+F)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">FTE Package (LPA) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.fte_package}
                    onChange={(e) => setFormData({ ...formData, fte_package: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Internship Stipend (INR/mo)</label>
                  <input
                    type="number"
                    value={formData.internship_stipend}
                    onChange={(e) => setFormData({ ...formData, internship_stipend: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Min CGPA Cutoff</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.min_cgpa}
                    onChange={(e) => setFormData({ ...formData, min_cgpa: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Eligible Programmes</label>
                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 border border-slate-200 rounded-md text-[11px]">
                  {['M.Tech. CS', 'M.Tech. AIDS', 'B.Tech.–M.Tech. CS', 'M.Sc. CS', 'M.Sc. DFIS'].map((prog) => {
                    const isChecked = formData.eligible_courses.includes(prog);
                    return (
                      <label key={prog} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, eligible_courses: [...formData.eligible_courses, prog] });
                            } else {
                              setFormData({ ...formData, eligible_courses: formData.eligible_courses.filter((c) => c !== prog) });
                            }
                          }}
                        />
                        <span>{prog}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Drive Date</label>
                  <input
                    type="date"
                    required
                    value={formData.drive_date}
                    onChange={(e) => setFormData({ ...formData, drive_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Acceptance Window (Hours)</label>
                  <input
                    type="number"
                    value={formData.acceptance_deadline_hours}
                    onChange={(e) => setFormData({ ...formData, acceptance_deadline_hours: parseInt(e.target.value, 10) || 24 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Job Description & Remarks</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-md font-semibold"
                >
                  Publish Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

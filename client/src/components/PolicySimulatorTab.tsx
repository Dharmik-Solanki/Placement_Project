import React, { useState, useEffect } from 'react';
import { Student, Drive, PolicyEvaluation } from '../types';
import { api } from '../services/api';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  BookOpen,
  Info,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const PolicySimulatorTab: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulation inputs
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [useCustomStudent, setUseCustomStudent] = useState(false);

  // Custom Student state
  const [customStudent, setCustomStudent] = useState({
    placement_id: 'NFSU/2026/MOCK/099',
    name: 'Test Candidate',
    course: 'M.Sc. DFIS',
    cgpa: 8.5,
    backlogs: 0,
    registration_status: 'Registered',
    eligibility_status: 'Eligible',
    placement_status: 'FTE Only',
    active_category: 'B',
    fte_package: 7.0,
    active_offer_type: 'F',
    drives_banned_remaining: 0
  });

  // Target Drive state
  const [targetDrive, setTargetDrive] = useState({
    company_name: 'Hypothetical Cyber Corp',
    offer_type: 'F' as 'I' | 'F' | 'I+F',
    fte_package: 11.0,
    internship_stipend: 0,
    min_cgpa: 7.5,
    max_backlogs: 0,
    eligible_courses: ['M.Sc. DFIS', 'M.Tech. CS', 'M.Tech. AIDS']
  });

  const [evaluation, setEvaluation] = useState<PolicyEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const sRes = await api.getStudents({ limit: 100 });
      const dRes = await api.getDrives();
      setStudents(sRes.students || []);
      setDrives(dRes.drives || []);

      if (sRes.students?.length > 0) {
        setSelectedStudentId(sRes.students[0].id);
      }
    } catch (err) {
      console.error('Error loading simulation initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    setEvaluating(true);
    try {
      const payload: any = {
        target_drive: targetDrive
      };

      if (useCustomStudent) {
        payload.mock_student = customStudent;
      } else if (selectedStudentId) {
        payload.student_id = selectedStudentId;
      }

      const res = await api.simulatePolicy(payload);
      setEvaluation(res.evaluation);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              Interactive NFSU Policy Rule Simulator (2026–27 Guidelines)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Simulate candidate switching rules, offer-type constraints (I, F, I+F), 1.5x CTC multiplier logic, and absenteeism penalty exclusions with explainable output.
            </p>
          </div>

          <button
            onClick={runSimulation}
            disabled={evaluating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors self-start sm:self-auto"
          >
            <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{evaluating ? 'Evaluating...' : 'Evaluate Policy Compliance'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Candidate Profile Box */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Candidate Profile
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={useCustomStudent}
                    onChange={(e) => setUseCustomStudent(e.target.checked)}
                  />
                  <span>Custom Mock Candidate</span>
                </label>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              {!useCustomStudent ? (
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Select Registered Student</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.placement_id}) · {s.course} · {s.placement_status} ({s.fte_package ? `₹${s.fte_package} LPA` : '0 LPA'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1">Programme</label>
                      <select
                        value={customStudent.course}
                        onChange={(e) => setCustomStudent({ ...customStudent, course: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                      >
                        <option value="M.Tech. CS">M.Tech. CS</option>
                        <option value="M.Tech. AIDS">M.Tech. AIDS</option>
                        <option value="B.Tech.–M.Tech. CS">B.Tech.–M.Tech. CS</option>
                        <option value="M.Sc. CS">M.Sc. CS</option>
                        <option value="M.Sc. DFIS">M.Sc. DFIS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1">Registration Status</label>
                      <select
                        value={customStudent.registration_status}
                        onChange={(e) => setCustomStudent({ ...customStudent, registration_status: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                      >
                        <option value="Registered">Registered</option>
                        <option value="Deregistered">Deregistered</option>
                        <option value="Not Registered">Not Registered</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1">Current Placement Status</label>
                      <select
                        value={customStudent.placement_status}
                        onChange={(e) => setCustomStudent({ ...customStudent, placement_status: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                      >
                        <option value="Unplaced">Unplaced</option>
                        <option value="Internship Only">Internship Only</option>
                        <option value="FTE Only">FTE Only</option>
                        <option value="Internship + PPO/FTE">Internship + PPO/FTE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1">Current Existing CTC (LPA)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={customStudent.fte_package}
                        onChange={(e) => setCustomStudent({ ...customStudent, fte_package: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1">CGPA</label>
                      <input
                        type="number"
                        step="0.1"
                        value={customStudent.cgpa}
                        onChange={(e) => setCustomStudent({ ...customStudent, cgpa: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1">Backlogs</label>
                      <input
                        type="number"
                        value={customStudent.backlogs}
                        onChange={(e) => setCustomStudent({ ...customStudent, backlogs: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[11px] mb-1">Ban Drives</label>
                      <input
                        type="number"
                        value={customStudent.drives_banned_remaining}
                        onChange={(e) => setCustomStudent({ ...customStudent, drives_banned_remaining: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hypothetical Target Drive Box */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-200">
              2. Target Recruitment Opportunity
            </h3>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Target Company</label>
                  <input
                    type="text"
                    value={targetDrive.company_name}
                    onChange={(e) => setTargetDrive({ ...targetDrive, company_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Target Offer Type</label>
                  <select
                    value={targetDrive.offer_type}
                    onChange={(e) => setTargetDrive({ ...targetDrive, offer_type: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                  >
                    <option value="I">Internship only (I)</option>
                    <option value="F">FTE only (F)</option>
                    <option value="I+F">Internship + PPO/FTE (I+F)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Target Package CTC (LPA)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={targetDrive.fte_package}
                    onChange={(e) => setTargetDrive({ ...targetDrive, fte_package: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5 font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-slate-400">
                    Category: {targetDrive.fte_package >= 16 ? 'A+ (≥16)' : targetDrive.fte_package >= 10 ? 'A (10–16)' : targetDrive.fte_package >= 6 ? 'B (6–10)' : 'C (<6)'}
                  </span>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Min CGPA Required</label>
                  <input
                    type="number"
                    step="0.1"
                    value={targetDrive.min_cgpa}
                    onChange={(e) => setTargetDrive({ ...targetDrive, min_cgpa: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Eligible Programmes</label>
                <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md text-[11px]">
                  {['M.Tech. CS', 'M.Tech. AIDS', 'B.Tech.–M.Tech. CS', 'M.Sc. CS', 'M.Sc. DFIS'].map((p) => (
                    <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={targetDrive.eligible_courses.includes(p)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTargetDrive({ ...targetDrive, eligible_courses: [...targetDrive.eligible_courses, p] });
                          } else {
                            setTargetDrive({ ...targetDrive, eligible_courses: targetDrive.eligible_courses.filter((c) => c !== p) });
                          }
                        }}
                      />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Output: Explainable Decision Engine (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs min-h-[480px]">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-200">
              3. Policy Rule Engine Decision & Compliance Explanation
            </h3>

            {!evaluation ? (
              <div className="py-24 text-center">
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">Ready to Simulate</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Click the "Evaluate Policy Compliance" button above to execute automated validation against official NFSU placement guidelines.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* Final Verdict Banner */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  evaluation.allowed ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                  evaluation.status === 'BLOCKED' ? 'bg-red-50 border-red-300 text-red-900' :
                  'bg-amber-50 border-amber-300 text-amber-900'
                }`}>
                  <div className="flex items-center gap-3">
                    {evaluation.allowed ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    ) : evaluation.status === 'BLOCKED' ? (
                      <XCircle className="w-8 h-8 text-red-600" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-amber-600" />
                    )}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider">
                        Compliance Verdict:
                      </div>
                      <div className="text-lg font-black tracking-tight">
                        {evaluation.status === 'ALLOWED' ? '✓ CANDIDATE ALLOWED TO PARTICIPATE' :
                         evaluation.status === 'BLOCKED' ? '✕ CANDIDATE STRICTLY BLOCKED BY POLICY' :
                         '⚠ REFERRED FOR PLACEMENT CELL REVIEW'}
                      </div>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                    evaluation.allowed ? 'bg-emerald-600 text-white' :
                    evaluation.status === 'BLOCKED' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {evaluation.status}
                  </span>
                </div>

                {/* Explanatory Reasons List */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Executive Policy Justification:
                  </h4>
                  {evaluation.reasons.length === 0 ? (
                    <p className="text-xs text-emerald-800 font-medium">
                      All criteria passed. Candidate satisfies academic eligibility, CGPA cutoffs, programme eligibility, and NFSU category switching criteria.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-xs">
                      {evaluation.reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className={`mt-0.5 font-bold ${evaluation.status === 'BLOCKED' ? 'text-red-600' : 'text-amber-600'}`}>•</span>
                          <span className="text-slate-800 font-medium">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Step-by-Step Rule Checklist Breakdown */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Policy Rule Checklist Verification:
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {evaluation.breakdown && Object.entries(evaluation.breakdown).map(([key, item]: [string, any]) => (
                      <div
                        key={key}
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          item.passed ? 'bg-white border-slate-200 text-slate-800' : 'bg-red-50/70 border-red-200 text-red-900 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {item.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                          )}
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                        </div>
                        <span className="text-[11px] font-mono">{item.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* NFSU Policy Cheat Sheet Box */}
          <div className="bg-linear-to-br from-blue-900 to-indigo-950 text-white p-5 rounded-xl shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 mb-3">
              <BookOpen className="w-4 h-4 text-amber-300" />
              NFSU Student Placement Guidelines 2026–27 Switching Matrix
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                <div className="font-bold text-emerald-300">Category A+</div>
                <div className="text-[10px] text-slate-300">≥ ₹16 LPA</div>
                <div className="text-[10px] text-slate-300 mt-1">No switching. Process complete.</div>
              </div>
              <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                <div className="font-bold text-blue-300">Category A</div>
                <div className="text-[10px] text-slate-300">₹10–16 LPA</div>
                <div className="text-[10px] text-slate-300 mt-1">Switching allowed ONLY to A+.</div>
              </div>
              <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                <div className="font-bold text-amber-300">Category B</div>
                <div className="text-[10px] text-slate-300">₹6–10 LPA</div>
                <div className="text-[10px] text-slate-300 mt-1">New package must be ≥ 1.5x.</div>
              </div>
              <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
                <div className="font-bold text-purple-300">Category C</div>
                <div className="text-[10px] text-slate-300">&lt; ₹6 LPA</div>
                <div className="text-[10px] text-slate-300 mt-1">Eligible for B, A, or A+ upgrades.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

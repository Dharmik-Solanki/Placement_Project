import React, { useState, useEffect } from 'react';
import { Student, User } from '../types';
import { api } from '../services/api';
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Eye,
  Edit2,
  Archive,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Building,
  GraduationCap
} from 'lucide-react';

interface StudentsTabProps {
  currentUser: User | null;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({ currentUser }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedEligibility, setSelectedEligibility] = useState('ALL');
  const [selectedRegistration, setSelectedRegistration] = useState('ALL');

  // Modals state
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentDetailsLoading, setStudentDetailsLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);

  // New Student Form
  const [formData, setFormData] = useState({
    placement_id: '',
    name: '',
    mobile: '',
    email: '',
    course: 'M.Sc. DFIS',
    batch: '2025-27',
    cgpa: 8.0,
    backlogs: 0,
    registration_status: 'Registered',
    eligibility_status: 'Pending Verification',
    remarks: ''
  });

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'officer';
  const isCoordinator = currentUser?.role === 'coordinator';

  useEffect(() => {
    loadStudents();
  }, [selectedCourse, selectedStatus, selectedEligibility, selectedRegistration]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await api.getStudents({
        course: selectedCourse,
        placement_status: selectedStatus,
        eligibility_status: selectedEligibility,
        registration_status: selectedRegistration,
        search
      });
      setStudents(res.students || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStudents();
  };

  const openStudentDetails = async (id: number) => {
    setStudentDetailsLoading(true);
    try {
      const res = await api.getStudent(id);
      setSelectedStudent(res);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStudentDetailsLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createStudent(formData as any);
      setAddModalOpen(false);
      loadStudents();
      alert('Student created successfully.');
    } catch (err: any) {
      alert(`Error creating student: ${err.message}`);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent?.id) return;
    try {
      await api.updateStudent(editingStudent.id, editingStudent);
      setEditModalOpen(false);
      loadStudents();
      alert('Student record updated successfully.');
    } catch (err: any) {
      alert(`Error updating student: ${err.message}`);
    }
  };

  const handleArchive = async (id: number) => {
    if (!confirm('Are you sure you want to archive this student record?')) return;
    try {
      await api.archiveStudent(id, true);
      loadStudents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    const data = new FormData();
    data.append('file', importFile);
    try {
      const res = await api.importStudentsCsv(data);
      setImportResult(res.results);
      loadStudents();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, Placement ID, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </form>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadStudents}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            {/* CSV Export */}
            <a
              href={api.exportStudentsCsvUrl({ course: selectedCourse, placement_status: selectedStatus })}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>

            {/* CSV Import (Admin / Officer) */}
            {canManage && (
              <button
                onClick={() => { setImportModalOpen(true); setImportResult(null); }}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
            )}

            {/* Add Student (Admin / Officer) */}
            {canManage && (
              <button
                onClick={() => setAddModalOpen(true)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium bg-blue-900 hover:bg-blue-800 text-white rounded-lg transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Add Student</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Course filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Course:</span>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-medium"
            >
              <option value="ALL">All Programmes</option>
              <option value="M.Tech. CS">M.Tech. CS</option>
              <option value="M.Tech. AIDS">M.Tech. AIDS</option>
              <option value="B.Tech.–M.Tech. CS">B.Tech.–M.Tech. CS</option>
              <option value="M.Sc. CS">M.Sc. CS</option>
              <option value="M.Sc. DFIS">M.Sc. DFIS</option>
            </select>
          </div>

          {/* Placement Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Placement:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800"
            >
              <option value="ALL">All Placement Statuses</option>
              <option value="Unplaced">Unplaced</option>
              <option value="Internship Only">Internship Only</option>
              <option value="FTE Only">FTE Only</option>
              <option value="Internship + PPO/FTE">Internship + PPO/FTE</option>
            </select>
          </div>

          {/* Eligibility Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Eligibility:</span>
            <select
              value={selectedEligibility}
              onChange={(e) => setSelectedEligibility(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800"
            >
              <option value="ALL">All Eligibility</option>
              <option value="Eligible">Eligible</option>
              <option value="Ineligible">Ineligible</option>
              <option value="Pending Verification">Pending Verification</option>
            </select>
          </div>

          {/* Registration Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Registration:</span>
            <select
              value={selectedRegistration}
              onChange={(e) => setSelectedRegistration(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800"
            >
              <option value="ALL">All Registrations</option>
              <option value="Registered">Registered</option>
              <option value="Deregistered">Deregistered</option>
              <option value="Not Registered">Not Registered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Placement ID</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Course & Batch</th>
                <th className="px-4 py-3 text-center">CGPA / Backlogs</th>
                <th className="px-4 py-3 text-center">Reg / Elig</th>
                <th className="px-4 py-3">Placement Status</th>
                <th className="px-4 py-3">Company & Package</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">Loading student database...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">No student records match the active criteria.</td>
                </tr>
              ) : (
                students.map((student) => {
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Placement ID */}
                      <td className="px-4 py-3 font-mono font-semibold text-blue-900">
                        {student.placement_id}
                        {student.drives_banned_remaining > 0 && (
                          <span className="block text-[10px] text-red-600 font-sans font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            {student.drives_banned_remaining} Drive Ban Active
                          </span>
                        )}
                      </td>

                      {/* Name & Contact */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{student.name}</div>
                        <div className="text-[11px] text-slate-500">{student.email}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{student.mobile}</div>
                      </td>

                      {/* Course */}
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{student.course}</span>
                        <div className="text-[10px] text-slate-400">{student.batch}</div>
                      </td>

                      {/* CGPA / Backlogs */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-slate-900">{student.cgpa}</span>
                        <div className={`text-[10px] ${student.backlogs > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                          {student.backlogs} Backlog{student.backlogs !== 1 ? 's' : ''}
                        </div>
                      </td>

                      {/* Registration & Eligibility */}
                      <td className="px-4 py-3 text-center space-y-1">
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                            student.registration_status === 'Registered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            student.registration_status === 'Deregistered' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {student.registration_status}
                          </span>
                        </div>
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                            student.eligibility_status === 'Eligible' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            student.eligibility_status === 'Ineligible' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {student.eligibility_status}
                          </span>
                        </div>
                      </td>

                      {/* Placement Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          student.placement_status === 'Unplaced' ? 'bg-slate-100 text-slate-600' :
                          student.placement_status === 'Internship + PPO/FTE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          student.placement_status === 'FTE Only' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          'bg-purple-100 text-purple-800 border border-purple-300'
                        }`}>
                          {student.placement_status}
                        </span>
                      </td>

                      {/* Company & Compensation */}
                      <td className="px-4 py-3">
                        {student.active_company ? (
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {student.active_company}
                              {student.active_category && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  student.active_category === 'A+' ? 'bg-emerald-600 text-white' :
                                  student.active_category === 'A' ? 'bg-blue-600 text-white' :
                                  student.active_category === 'B' ? 'bg-amber-600 text-white' :
                                  'bg-slate-600 text-white'
                                }`}>
                                  Cat {student.active_category}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {student.fte_package > 0 && <span className="font-medium text-emerald-700">₹{student.fte_package} LPA FTE </span>}
                              {student.internship_stipend > 0 && <span className="text-purple-700">· ₹{student.internship_stipend.toLocaleString()}/mo</span>}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openStudentDetails(student.id)}
                            title="View Full Placement History & Profile"
                            className="p-1.5 text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(canManage || isCoordinator) && (
                            <button
                              onClick={() => { setEditingStudent(student); setEditModalOpen(true); }}
                              title="Edit Record"
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {currentUser?.role === 'admin' && (
                            <button
                              onClick={() => handleArchive(student.id)}
                              title="Archive Record"
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Archive className="w-4 h-4" />
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

      {/* STUDENT PROFILE & PLACEMENT HISTORY MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  {selectedStudent.student.placement_id}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedStudent.student.name}</h3>
                <p className="text-xs text-slate-500">{selectedStudent.student.course} · Batch {selectedStudent.student.batch}</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Registration</div>
                <div className="font-semibold text-slate-900">{selectedStudent.student.registration_status}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Eligibility</div>
                <div className="font-semibold text-slate-900">{selectedStudent.student.eligibility_status}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Placement Status</div>
                <div className="font-bold text-emerald-700">{selectedStudent.student.placement_status}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">CGPA / Backlogs</div>
                <div className="font-semibold text-slate-900">{selectedStudent.student.cgpa} ({selectedStudent.student.backlogs} backlogs)</div>
              </div>
            </div>

            {/* Preserved Placement History Section */}
            <div className="mt-6">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-700" />
                Preserved Placement Offer History ({selectedStudent.offers.length} Events)
              </h4>
              {selectedStudent.offers.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-3 bg-slate-50 rounded-lg text-center">
                  No previous offer events recorded for this candidate.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedStudent.offers.map((offer: any) => (
                    <div key={offer.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-2">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {offer.company_name}
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-800 text-white">
                            Cat {offer.category}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-100 text-blue-800">
                            Type: {offer.offer_type}
                          </span>
                        </div>
                        <div className="text-slate-600 mt-1">
                          {offer.fte_package > 0 && <span>FTE CTC: ₹{offer.fte_package} LPA · </span>}
                          {offer.internship_stipend > 0 && <span>Stipend: ₹{offer.internship_stipend.toLocaleString()}/mo · </span>}
                          <span>Offer Date: {offer.offer_date}</span>
                        </div>
                        {offer.remarks && <p className="text-[11px] text-slate-500 mt-1 italic">{offer.remarks}</p>}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          offer.offer_acceptance === 'Accepted' ? 'bg-emerald-100 text-emerald-800' :
                          offer.offer_acceptance === 'Declined' ? 'bg-red-100 text-red-800' :
                          offer.offer_acceptance === 'Expired' ? 'bg-slate-200 text-slate-700' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          Acceptance: {offer.offer_acceptance}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Joining: {offer.joining_status} · NOC: {offer.noc_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance & Disciplinary Flags */}
            <div className="mt-6 border-t border-slate-200 pt-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Attendance & Policy Violations History
              </h4>
              {selectedStudent.violations.length === 0 ? (
                <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  ✓ Clean compliance record. No disciplinary exclusions or policy violations on file.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedStudent.violations.map((v: any) => (
                    <div key={v.id} className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-900">
                      <div className="flex items-center justify-between font-bold">
                        <span>{v.violation_type} ({v.status})</span>
                        <span className="text-[10px] text-red-700">{v.timestamp}</span>
                      </div>
                      <p className="mt-1 text-[11px]">{v.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Register New NFSU Student</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateStudent} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Placement ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="NFSU/2026/DFIS/010"
                    value={formData.placement_id}
                    onChange={(e) => setFormData({ ...formData, placement_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Institutional Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="student@nfsu.ac.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 9876543210"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Programme *</label>
                  <select
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  >
                    <option value="M.Tech. CS">M.Tech. CS</option>
                    <option value="M.Tech. AIDS">M.Tech. AIDS</option>
                    <option value="B.Tech.–M.Tech. CS">B.Tech.–M.Tech. CS</option>
                    <option value="M.Sc. CS">M.Sc. CS</option>
                    <option value="M.Sc. DFIS">M.Sc. DFIS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Academic Batch *</label>
                  <input
                    type="text"
                    required
                    value={formData.batch}
                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={formData.cgpa}
                    onChange={(e) => setFormData({ ...formData, cgpa: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Active Backlogs</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.backlogs}
                    onChange={(e) => setFormData({ ...formData, backlogs: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-md font-semibold"
                >
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Update Student: {editingStudent.name} ({editingStudent.placement_id})
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateStudent} className="mt-4 space-y-3 text-xs">
              {/* Coordinator can only update eligibility */}
              {isCoordinator ? (
                <>
                  <p className="text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                    Coordinator permission: You can verify departmental academic eligibility and add administrative remarks.
                  </p>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Eligibility Status *</label>
                    <select
                      value={editingStudent.eligibility_status}
                      onChange={(e) => setEditingStudent({ ...editingStudent, eligibility_status: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                    >
                      <option value="Eligible">Eligible</option>
                      <option value="Ineligible">Ineligible</option>
                      <option value="Pending Verification">Pending Verification</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Coordinator Remarks</label>
                    <textarea
                      rows={3}
                      value={editingStudent.remarks || ''}
                      onChange={(e) => setEditingStudent({ ...editingStudent, remarks: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Registration Status</label>
                      <select
                        value={editingStudent.registration_status}
                        onChange={(e) => setEditingStudent({ ...editingStudent, registration_status: e.target.value as any })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                      >
                        <option value="Registered">Registered</option>
                        <option value="Deregistered">Deregistered</option>
                        <option value="Not Registered">Not Registered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Eligibility Status</label>
                      <select
                        value={editingStudent.eligibility_status}
                        onChange={(e) => setEditingStudent({ ...editingStudent, eligibility_status: e.target.value as any })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                      >
                        <option value="Eligible">Eligible</option>
                        <option value="Ineligible">Ineligible</option>
                        <option value="Pending Verification">Pending Verification</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">CGPA</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingStudent.cgpa}
                        onChange={(e) => setEditingStudent({ ...editingStudent, cgpa: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Backlogs</label>
                      <input
                        type="number"
                        value={editingStudent.backlogs}
                        onChange={(e) => setEditingStudent({ ...editingStudent, backlogs: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Absenteeism Ban Remaining (Drives)</label>
                    <input
                      type="number"
                      min="0"
                      max="3"
                      value={editingStudent.drives_banned_remaining}
                      onChange={(e) => setEditingStudent({ ...editingStudent, drives_banned_remaining: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Administrative Remarks</label>
                    <textarea
                      rows={2}
                      value={editingStudent.remarks || ''}
                      onChange={(e) => setEditingStudent({ ...editingStudent, remarks: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-md p-2"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-md font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Batch Import Students (CSV)</h3>
              <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleImportSubmit} className="mt-4 space-y-4 text-xs">
              <p className="text-slate-600">
                Upload a CSV file containing columns: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">placement_id, name, email, mobile, course, batch, cgpa, backlogs</code>.
              </p>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs"
                />
              </div>

              {importResult && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">Import Outcome:</div>
                  <div className="text-emerald-700">✓ Successfully imported: {importResult.imported}</div>
                  <div className="text-amber-700">⚠ Skipped / Duplicates: {importResult.skipped}</div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!importFile}
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-md font-semibold"
                >
                  Upload & Process
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

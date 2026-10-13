export type Role = 'admin' | 'officer' | 'coordinator' | 'company' | 'student';

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  assigned_course?: string | null;
  company_name?: string | null;
  student_id?: number | null;
  mfa_enabled?: number;
  student_name?: string;
  student_course?: string;
  placement_status?: string;
}

export interface Student {
  id: number;
  placement_id: string;
  name: string;
  mobile: string;
  email: string;
  course: string;
  batch: string;
  cgpa: number;
  backlogs: number;
  registration_status: 'Registered' | 'Deregistered' | 'Not Registered';
  eligibility_status: 'Eligible' | 'Ineligible' | 'Pending Verification';
  placement_status: 'Unplaced' | 'Internship Only' | 'FTE Only' | 'Internship + PPO/FTE';
  active_company?: string | null;
  active_offer_type?: 'I' | 'F' | 'I+F' | null;
  active_category?: 'A+' | 'A' | 'B' | 'C' | null;
  internship_stipend: number;
  internship_period?: string | null;
  fte_package: number;
  ppo_status: 'N/A' | 'Pending' | 'Offered' | 'Accepted' | 'Declined';
  offer_acceptance: 'Pending' | 'Accepted' | 'Declined' | 'Expired';
  joining_status: 'Pending' | 'Joined' | 'Not Joined';
  offer_date?: string | null;
  remarks?: string;
  drives_banned_remaining: number;
  noc_status: 'N/A' | 'Pending' | 'Approved' | 'Rejected';
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface Drive {
  id: number;
  drive_code: string;
  company_name: string;
  category: 'A+' | 'A' | 'B' | 'C';
  offer_type: 'I' | 'F' | 'I+F';
  fte_package: number;
  internship_stipend: number;
  internship_duration?: string;
  min_cgpa: number;
  max_backlogs: number;
  eligible_courses: string[];
  batch: string;
  drive_date: string;
  acceptance_deadline_hours: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
  description?: string;
  stats?: {
    total_offers: number;
    accepted_offers: number;
    pending_offers: number;
  };
}

export interface Offer {
  id: number;
  student_id: number;
  student_name: string;
  placement_id: string;
  course: string;
  batch?: string;
  email?: string;
  mobile?: string;
  drive_id?: number | null;
  drive_code?: string;
  company_name: string;
  category: 'A+' | 'A' | 'B' | 'C';
  offer_type: 'I' | 'F' | 'I+F';
  fte_package: number;
  internship_stipend: number;
  internship_period?: string | null;
  ppo_status: 'N/A' | 'Pending' | 'Offered' | 'Accepted' | 'Declined';
  offer_acceptance: 'Pending' | 'Accepted' | 'Declined' | 'Expired';
  joining_status: 'Pending' | 'Joined' | 'Not Joined';
  offer_date: string;
  acceptance_deadline: string;
  is_off_campus: number;
  noc_required: number;
  noc_status: 'N/A' | 'Pending' | 'Approved' | 'Rejected';
  remarks?: string;
}

export interface AttendanceRecord {
  id: number;
  drive_id: number;
  student_id: number;
  student_name?: string;
  placement_id?: string;
  course?: string;
  activity_type: 'PPT' | 'Online Test' | 'Technical Interview' | 'HR Interview';
  status: 'Present' | 'Absent' | 'Excused';
  excuse_reason?: string;
  excuse_approved: number;
  recorded_by_user?: string;
  timestamp: string;
}

export interface PolicyViolation {
  id: number;
  student_id: number;
  student_name: string;
  placement_id: string;
  course: string;
  company_name?: string;
  drive_code?: string;
  violation_type: 'ABSENTEEISM' | 'UNAUTHORIZED_SWITCHING' | 'CONCURRENT_OFFER_CONFLICT' | 'REGISTRATION_BYPASS' | 'OTHER';
  description: string;
  status: 'FLAGGED' | 'UNDER_REVIEW' | 'WAIVED' | 'PENALTY_ENFORCED';
  action_taken?: string;
  reviewer_username?: string;
  timestamp: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  username: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  before_state?: any;
  after_state?: any;
  ip_address?: string;
  reason?: string;
  timestamp: string;
}

export interface PolicyEvaluation {
  allowed: boolean;
  status: 'ALLOWED' | 'BLOCKED' | 'FLAGGED_FOR_REVIEW';
  reasons: string[];
  breakdown: {
    registration?: { passed: boolean; detail: string };
    eligibility?: { passed: boolean; detail: string };
    absenteeism?: { passed: boolean; detail: string };
    courseMatch?: { passed: boolean; detail: string };
    cgpaCheck?: { passed: boolean; detail: string };
    backlogCheck?: { passed: boolean; detail: string };
    offerTypeCheck?: { passed: boolean; detail: string };
    switchingCheck?: { passed: boolean; detail: string };
  };
  targetCategory: 'A+' | 'A' | 'B' | 'C';
  evaluationTimestamp: string;
}

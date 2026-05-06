export type UserRole = 'user' | 'moderator' | 'admin';
export type AccessStatus = 'active' | 'locked' | 'emergency_unlocked';
export type OrgRole = 'owner' | 'moderator' | 'member';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  access_status: AccessStatus;
  discipline_score: number;
  productivity_score: number;
  xp: number;
  streak: number;
  longest_streak: number;
  level: number;
  freeze_tokens: number;
  bio: string;
  theme: string;
  unlocked_themes: string;
  org_id: string | null;
  org_role: OrgRole | null;
  created_at: string;
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  description: string;
  invite_code: string | null;
  owner_id: string;
  is_open: boolean;
  member_count: number;
  created_at: string;
  my_role?: OrgRole | null;
}

export interface OrgMember {
  user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  org_role: OrgRole | null;
  xp: number;
  level: number;
  streak: number;
  access_status: string;
  joined: string;
}

export type TaskDifficulty = 'easy' | 'medium' | 'hard' | 'insane';

export interface Task {
  id: string;
  title: string;
  description: string;
  difficulty: TaskDifficulty;
  points: number;
  is_required: boolean;
  proof_required: boolean;
  proof_instructions: string;
  task_date: string;
  deadline: string;
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
}

export type SubmissionStatus =
  | 'assigned'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type ProofType =
  | 'image'
  | 'pdf'
  | 'stopwatch'
  | 'code_screenshot'
  | 'github_link'
  | 'notes';

export interface Submission {
  id: string;
  user_id: string;
  task_id: string;
  status: SubmissionStatus;
  proof_type: ProofType | null;
  proof_image_path: string | null;
  proof_pdf_path: string | null;
  stopwatch_image_path: string | null;
  proof_url: string | null;
  notes: string;
  admin_feedback: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  points_awarded: number;
  created_at: string;
}

export interface TaskWithSubmission {
  task: Task;
  submission: Submission | null;
}

export interface AdminSubmissionRow {
  submission: Submission;
  task_title: string | null;
  user_name: string | null;
  user_email: string | null;
  proof_signed_url: string | null;
  external_url: string | null;
}

export type EmergencyStatus = 'pending' | 'approved' | 'rejected';

export interface EmergencyRequest {
  id: string;
  user_id: string;
  reason: string;
  proof_path: string | null;
  status: EmergencyStatus;
  admin_response: string;
  reviewed_at: string | null;
  unlock_until: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar_url: string | null;
  discipline_score: number;
  productivity_score: number;
  xp: number;
  streak: number;
}

export interface DailyAnalytics {
  id: string;
  user_id: string;
  date: string;
  tasks_assigned: number;
  tasks_submitted: number;
  tasks_approved: number;
  tasks_rejected: number;
  productivity_score: number;
  discipline_score: number;
  focus_score: number;
  study_minutes: number;
  points_earned: number;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  target_per_week: number;
  week: { date: string; done: boolean }[];
  current_streak: number;
}

export interface Badge {
  code: string;
  name: string;
  description: string;
  emoji: string;
  tier: 'bronze' | 'silver' | 'gold' | 'mythic';
  earned?: boolean;
  earned_at?: string | null;
}

export interface Reflection {
  date: string;
  sleep_hours: number | null;
  mood: number | null;
  energy: number | null;
  shipped: string;
  blocked: string;
  tomorrow: string;
  rating: number | null;
}

export interface PublicProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
  bio: string;
  level: number;
  xp: number;
  streak: number;
  longest_streak: number;
  discipline_score: number;
  tasks_approved: number;
  badges: Badge[];
  joined: string;
}

export interface ShopItem {
  code: string;
  name: string;
  cost: number;
  preview: string;
  owned: boolean;
}

export interface ShopState {
  xp: number;
  freeze_tokens: number;
  current_theme: string;
  themes: ShopItem[];
  freeze_token: { cost: number; name: string; icon: string };
}

export interface NudgeResponse {
  tone: 'positive' | 'warning' | 'neutral';
  headline: string;
  body: string;
  burnout: { score: number; signal: string };
  procrastination: { score: number; signal: string };
  source?: 'groq' | 'local';
}

export interface DailyQuote {
  text: string;
  author: string;
  source: 'groq' | 'local';
}

export interface Squad {
  id: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  group_streak_mode: boolean;
  streak: number;
  longest_streak: number;
  member_count: number;
}

export interface SquadDetail extends Squad {
  members: {
    user_id: string;
    name: string;
    avatar_url: string | null;
    role: string;
    xp: number;
    streak: number;
    level: number;
  }[];
}

export interface SquadRanking {
  rank: number;
  squad_id: string;
  name: string;
  emoji: string;
  color: string;
  streak: number;
  total_xp: number;
  member_count: number;
}

export interface Buddy {
  pair_id: string;
  buddy: {
    user_id: string;
    name: string;
    avatar_url: string | null;
    level: number;
    xp: number;
    streak: number;
    approved_today: number;
  };
  since: string;
}

export interface BuddyCandidate {
  user_id: string;
  name: string;
  level: number;
  xp: number;
  streak: number;
}

export interface IncomingBuddyRequest {
  pair_id: string;
  from: { user_id: string; name: string; level: number; xp: number };
  created_at: string;
}

export interface GitHubVerifyResult {
  verified: boolean;
  error?: string;
  kind?: 'commit' | 'pull_request';
  owner?: string;
  repo?: string;
  sha?: string;
  number?: number;
  title?: string;
  message?: string;
  author_name?: string;
  state?: string;
  merged?: boolean;
  additions?: number;
  deletions?: number;
  files_changed?: number;
  html_url?: string;
}

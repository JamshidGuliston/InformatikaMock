// ====================== ACCOUNTS ======================

export interface Teacher {
  id: string;
  email: string;
  full_name: string;
  avatar?: string;
  bio?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  teacher: string;
  email: string;
  password?: string;
  full_name: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ====================== COURSES ======================

export interface ContentType {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface Module {
  id: string;
  teacher: string;
  title: string;
  description?: string;
  thumbnail?: string;
  order_index: number;
  is_sequential: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  module: string;
  title: string;
  description?: string;
  order_index: number;
  is_sequential: boolean;
  required_completion_percent: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  assignments?: Assignment[];
}

export interface LessonContent {
  id: string;
  lesson: string;
  content_type: ContentType | null;
  title: string;
  content?: string;
  file_url?: string;
  video_url?: string;
  order_index: number;
  created_at: string;
}

export interface ModuleContent {
  id: string;
  module: string;
  content_type: ContentType | null;
  title: string;
  content?: string;
  file_url?: string;
  video_url?: string;
  order_index: number;
  created_at: string;
}

// ====================== ASSIGNMENTS ======================

export interface AssignmentType {
  id: string;
  name: string;
  description?: string;
  config_schema?: Record<string, unknown>;
  is_auto_graded: boolean;
}

export interface Assignment {
  id: string;
  lesson: string;
  assignment_type: AssignmentType | null;
  title: string;
  description?: string;
  total_points: number;
  time_limit?: number;       // minutes
  attempts_allowed: number;
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  questions?: Question[];
}

export interface Question {
  id: string;
  assignment: string;
  question_text: string;
  question_data: QuestionData;
  correct_answer: CorrectAnswer;
  points: number;
  order_index: number;
  explanation?: string;
}

// Question data types per question type
export interface MultipleChoiceData {
  options: string[];
}

export interface TrueFalseData {
  statement: string;
}

export interface MatchingData {
  pairs: { left: string; right: string }[];
}

export interface FillBlankData {
  text: string;          // "Python ____ tilida yozilgan"
  blanks: number;
}

export interface OrderingData {
  items: string[];
}

export type QuestionData =
  | MultipleChoiceData
  | TrueFalseData
  | MatchingData
  | FillBlankData
  | OrderingData
  | Record<string, unknown>;

export type CorrectAnswer =
  | string            // single choice index or true/false
  | string[]          // multiple choices
  | Record<string, string>  // matching: {left: right}
  | number[]          // ordering
  | unknown;

// ====================== PROGRESS ======================

export interface StudentModuleEnrollment {
  id: string;
  student: string;
  module: string;
  enrolled_at: string;
  completed_at?: string;
  progress_percent: number;
}

export interface StudentLessonProgress {
  id: string;
  student: string;
  lesson: string;
  is_unlocked: boolean;
  started_at?: string;
  completed_at?: string;
  completion_percent: number;
}

export interface AssignmentAttempt {
  id: string;
  student: string;
  assignment: string;
  attempt_number: number;
  started_at: string;
  submitted_at?: string;
  score?: number;
  max_score: number;
  percentage?: string;
  is_passed?: boolean;
  answers?: QuestionAnswer[];
}

export interface QuestionAnswer {
  id: string;
  attempt: string;
  question: string;
  answer_data: unknown;
  is_correct?: boolean;
  points_earned: number;
  feedback?: string;
  answered_at: string;
}

// ====================== API RESPONSE ======================

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// ====================== AUTH (LOCAL) ======================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  student: Student | null;
  isLoggedIn: boolean;
}

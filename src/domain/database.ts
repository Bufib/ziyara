export type AppRole = 'admin' | 'medical_staff' | 'organization_team' | 'user';
export type MemberType = 'brother' | 'sister';

export type UserProfile = {
  created_at: string;
  display_name: string;
  id: number;
  member_type: MemberType | null;
  party_size: number;
  role: AppRole;
  updated_at: string;
  user_id: string;
};

export type AdminUserSummary = {
  display_name: string;
  party_size: number;
  role: AppRole;
  user_id: string;
};

export type GroupCheck = {
  closed_at: string | null;
  created_at: string;
  created_by_profile_id: number | null;
  id: number;
  question: string;
};

export type GroupCheckResponse = {
  answer: boolean;
  check_id: number;
  created_at: string;
  id: number;
  profile_id: number;
  updated_at: string;
};

export type AdminGroupCheckResult = {
  answer: boolean;
  display_name: string;
};

export type QuestionRound = {
  closed_at: string | null;
  created_at: string;
  id: number;
};

export type AnonymousQuestion = {
  checked_at: string | null;
  created_at: string;
  id: number;
  is_checked: boolean;
  question: string;
  round_id: number;
};

export type QuestionSubmissionLimit = {
  profile_id: number;
  round_id: number;
  submission_count: number;
};

export type RoleAssignmentAudit = {
  changed_by_profile_id: number | null;
  created_at: string;
  id: number;
  new_role: AppRole;
  previous_role: AppRole;
  target_user_id: string;
};

export type Database = {
  public: {
    Tables: {
      anonymous_questions: {
        Insert: {
          checked_at?: string | null;
          created_at?: string;
          id?: never;
          is_checked?: boolean;
          question: string;
          round_id: number;
        };
        Relationships: [];
        Row: AnonymousQuestion;
        Update: {
          checked_at?: string | null;
          is_checked?: boolean;
        };
      };
      group_check_responses: {
        Insert: {
          answer: boolean;
          check_id: number;
          created_at?: string;
          id?: never;
          profile_id: number;
          updated_at?: string;
        };
        Relationships: [];
        Row: GroupCheckResponse;
        Update: {
          answer?: boolean;
          updated_at?: string;
        };
      };
      group_checks: {
        Insert: {
          closed_at?: string | null;
          created_at?: string;
          created_by_profile_id?: number | null;
          id?: never;
          question: string;
        };
        Relationships: [];
        Row: GroupCheck;
        Update: {
          closed_at?: string | null;
        };
      };
      profiles: {
        Insert: {
          created_at?: string;
          display_name: string;
          id?: never;
          member_type?: MemberType | null;
          party_size?: number;
          role?: AppRole;
          updated_at?: string;
          user_id: string;
        };
        Relationships: [];
        Row: UserProfile;
        Update: {
          display_name?: string;
          member_type?: MemberType | null;
          party_size?: number;
          role?: AppRole;
          updated_at?: string;
        };
      };
      question_rounds: {
        Insert: {
          closed_at?: string | null;
          created_at?: string;
          id?: never;
        };
        Relationships: [];
        Row: QuestionRound;
        Update: {
          closed_at?: string | null;
        };
      };
      question_submission_limits: {
        Insert: {
          profile_id: number;
          round_id: number;
          submission_count?: number;
        };
        Relationships: [];
        Row: QuestionSubmissionLimit;
        Update: {
          submission_count?: number;
        };
      };
      role_assignment_audit: {
        Insert: {
          changed_by_profile_id?: number | null;
          created_at?: string;
          id?: never;
          new_role: AppRole;
          previous_role: AppRole;
          target_user_id: string;
        };
        Relationships: [];
        Row: RoleAssignmentAudit;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_group_check_results: {
        Args: { p_check_id: number };
        Returns: AdminGroupCheckResult[];
      };
      admin_list_users: {
        Args: never;
        Returns: AdminUserSummary[];
      };
      admin_set_user_role: {
        Args: { p_role: AppRole; p_user_id: string };
        Returns: UserProfile;
      };
      is_admin: {
        Args: never;
        Returns: boolean;
      };
      close_group_check: {
        Args: { p_check_id: number };
        Returns: GroupCheck;
      };
      close_question_round: {
        Args: { p_round_id: number };
        Returns: QuestionRound;
      };
      open_question_round: {
        Args: never;
        Returns: QuestionRound;
      };
      respond_to_group_check: {
        Args: { p_answer: boolean; p_check_id: number };
        Returns: GroupCheckResponse;
      };
      start_group_check: {
        Args: { p_question: string };
        Returns: GroupCheck;
      };
      set_anonymous_question_checked: {
        Args: { p_is_checked: boolean; p_question_id: number };
        Returns: AnonymousQuestion;
      };
      submit_anonymous_question: {
        Args: { p_question: string; p_round_id: number };
        Returns: AnonymousQuestion;
      };
    };
    Enums: {
      app_role: AppRole;
      member_type: MemberType;
    };
    CompositeTypes: Record<string, never>;
  };
};

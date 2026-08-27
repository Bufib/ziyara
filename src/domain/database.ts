export type AppRole = 'admin' | 'medical_staff' | 'organization_team' | 'user';
export type BusBoardingStatus = 'boarded' | 'on_way' | 'problem';
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
  answer: boolean | null;
  display_name: string;
  party_size: number;
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
  target_user_id: string | null;
};

export type Trip = {
  archived_at: string | null;
  created_at: string;
  created_by_profile_id: number | null;
  id: number;
  name: string;
};

export type TripBus = {
  created_at: string;
  id: number;
  name: string;
  sort_order: number;
  trip_id: number;
};

export type TripParticipant = {
  bus_id: number | null;
  created_at: string;
  display_name: string;
  id: number;
  participant_code: string;
  profile_id: number | null;
  trip_id: number;
  updated_at: string;
};

export type BusBoarding = {
  closed_at: string | null;
  created_by_profile_id: number | null;
  departure_at: string;
  id: number;
  opened_at: string;
  title: string;
  trip_id: number;
};

export type BusBoardingResponse = {
  boarding_id: number;
  created_at: string;
  id: number;
  participant_id: number;
  status: BusBoardingStatus;
  trip_id: number;
  updated_at: string;
  updated_by_profile_id: number | null;
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
      bus_boarding_responses: {
        Insert: {
          boarding_id: number;
          created_at?: string;
          id?: never;
          participant_id: number;
          status: BusBoardingStatus;
          trip_id: number;
          updated_at?: string;
          updated_by_profile_id?: number | null;
        };
        Relationships: [];
        Row: BusBoardingResponse;
        Update: {
          status?: BusBoardingStatus;
          updated_at?: string;
          updated_by_profile_id?: number | null;
        };
      };
      bus_boardings: {
        Insert: {
          closed_at?: string | null;
          created_by_profile_id?: number | null;
          departure_at: string;
          id?: never;
          opened_at?: string;
          title: string;
          trip_id: number;
        };
        Relationships: [];
        Row: BusBoarding;
        Update: {
          closed_at?: string | null;
          departure_at?: string;
          title?: string;
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
          target_user_id?: string | null;
        };
        Relationships: [];
        Row: RoleAssignmentAudit;
        Update: never;
      };
      trip_buses: {
        Insert: {
          created_at?: string;
          id?: never;
          name: string;
          sort_order?: number;
          trip_id: number;
        };
        Relationships: [];
        Row: TripBus;
        Update: {
          name?: string;
          sort_order?: number;
        };
      };
      trip_participants: {
        Insert: {
          bus_id?: number | null;
          created_at?: string;
          display_name: string;
          id?: never;
          participant_code: string;
          profile_id?: number | null;
          trip_id: number;
          updated_at?: string;
        };
        Relationships: [];
        Row: TripParticipant;
        Update: {
          bus_id?: number | null;
          display_name?: string;
          participant_code?: string;
          profile_id?: number | null;
          updated_at?: string;
        };
      };
      trips: {
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by_profile_id?: number | null;
          id?: never;
          name: string;
        };
        Relationships: [];
        Row: Trip;
        Update: {
          archived_at?: string | null;
          name?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_archive_trip: {
        Args: { p_trip_id: number };
        Returns: Trip;
      };
      admin_close_bus_boarding: {
        Args: { p_boarding_id: number };
        Returns: BusBoarding;
      };
      admin_create_trip: {
        Args: { p_name: string };
        Returns: Trip;
      };
      admin_create_trip_bus: {
        Args: { p_name: string; p_trip_id: number };
        Returns: TripBus;
      };
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
      admin_set_bus_boarding_status: {
        Args: {
          p_boarding_id: number;
          p_participant_id: number;
          p_status: BusBoardingStatus;
        };
        Returns: BusBoardingResponse;
      };
      admin_start_bus_boarding: {
        Args: { p_departure_at: string; p_title: string; p_trip_id: number };
        Returns: BusBoarding;
      };
      admin_upsert_trip_participant: {
        Args: {
          p_bus_id: number | null;
          p_display_name: string;
          p_participant_code: string;
          p_trip_id: number;
          p_user_id: string | null;
        };
        Returns: TripParticipant;
      };
      can_delete_account: {
        Args: { p_user_id: string };
        Returns: boolean;
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
      is_trip_member: {
        Args: { p_trip_id: number };
        Returns: boolean;
      };
      respond_to_group_check: {
        Args: { p_answer: boolean; p_check_id: number };
        Returns: GroupCheckResponse;
      };
      respond_to_bus_boarding: {
        Args: {
          p_boarding_id: number;
          p_participant_id: number;
          p_status: BusBoardingStatus;
        };
        Returns: BusBoardingResponse;
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
      bus_boarding_status: BusBoardingStatus;
      member_type: MemberType;
    };
    CompositeTypes: Record<string, never>;
  };
};

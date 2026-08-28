export type AppRole = 'admin' | 'medical_staff' | 'organization_team' | 'user';
export type BusBoardingStatus = 'boarded' | 'on_way' | 'problem' | 'read';
export type MemberType = 'brother' | 'sister';
export type TripGuidanceStatus =
  | 'almost_there'
  | 'at_meeting_point'
  | 'lost'
  | 'medical_help'
  | 'on_way'
  | 'problem';

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
  reminder_interval_minutes: number;
  title: string;
  trip_id: number;
  urgent_before_minutes: number;
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

export type BusBoardingEscalation = {
  boarding_id: number;
  escalated_at: string;
  escalated_by_display_name: string;
  escalated_by_profile_id: number | null;
  id: number;
  participant_id: number;
  trip_id: number;
};

export type PushNotificationDevice = {
  created_at: string;
  expo_push_token: string;
  id: number;
  locale: 'ar' | 'de' | 'en';
  platform: 'android' | 'ios';
  profile_id: number;
  updated_at: string;
};

export type GeneralAlarmNotificationAttempt = {
  accepted_at: string | null;
  boarding_id: number;
  claimed_at: string;
  error_code: string | null;
  expected_status: BusBoardingStatus;
  id: number;
  participant_id: number;
  push_device_id: number;
  reminder_slot: number;
};

export type GeneralAlarmNotificationClaim = {
  attempt_id: number;
  boarding_id: number;
  departure_at: string;
  expected_status: BusBoardingStatus;
  expo_push_token: string;
  is_urgent: boolean;
  locale: string;
  participant_code: string;
  participant_id: number;
  platform: string;
  title: string;
};

export type TripGuidanceUpdate = {
  acts: string | null;
  closed_at: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  current_place_name: string;
  current_place_slug: string | null;
  departure_at: string;
  description: string | null;
  distance_hint: string | null;
  id: number;
  meeting_latitude: number | null;
  meeting_longitude: number | null;
  meeting_point: string;
  next_program_name: string;
  published_at: string;
  published_by_profile_id: number | null;
  relevant_gate: string | null;
  trip_id: number;
  updated_at: string;
};

export type TripGuidanceResponse = {
  acknowledged_at: string | null;
  acknowledged_by_display_name: string | null;
  acknowledged_by_profile_id: number | null;
  created_at: string;
  guidance_id: number;
  id: number;
  participant_id: number;
  status: TripGuidanceStatus;
  trip_id: number;
  updated_at: string;
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
      bus_boarding_escalations: {
        Insert: {
          boarding_id: number;
          escalated_at?: string;
          escalated_by_display_name: string;
          escalated_by_profile_id?: number | null;
          id?: never;
          participant_id: number;
          trip_id: number;
        };
        Relationships: [];
        Row: BusBoardingEscalation;
        Update: {
          escalated_at?: string;
          escalated_by_display_name?: string;
          escalated_by_profile_id?: number | null;
        };
      };
      bus_boardings: {
        Insert: {
          closed_at?: string | null;
          created_by_profile_id?: number | null;
          departure_at: string;
          id?: never;
          opened_at?: string;
          reminder_interval_minutes?: number;
          title: string;
          trip_id: number;
          urgent_before_minutes?: number;
        };
        Relationships: [];
        Row: BusBoarding;
        Update: {
          closed_at?: string | null;
          departure_at?: string;
          reminder_interval_minutes?: number;
          title?: string;
          urgent_before_minutes?: number;
        };
      };
      general_alarm_notification_attempts: {
        Insert: {
          accepted_at?: string | null;
          boarding_id: number;
          claimed_at?: string;
          error_code?: string | null;
          expected_status: BusBoardingStatus;
          id?: never;
          participant_id: number;
          push_device_id: number;
          reminder_slot: number;
        };
        Relationships: [];
        Row: GeneralAlarmNotificationAttempt;
        Update: {
          accepted_at?: string | null;
          error_code?: string | null;
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
      push_notification_devices: {
        Insert: {
          created_at?: string;
          expo_push_token: string;
          id?: never;
          locale?: 'ar' | 'de' | 'en';
          platform: 'android' | 'ios';
          profile_id: number;
          updated_at?: string;
        };
        Relationships: [];
        Row: PushNotificationDevice;
        Update: {
          expo_push_token?: string;
          locale?: 'ar' | 'de' | 'en';
          platform?: 'android' | 'ios';
          profile_id?: number;
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
      trip_guidance_responses: {
        Insert: {
          acknowledged_at?: string | null;
          acknowledged_by_display_name?: string | null;
          acknowledged_by_profile_id?: number | null;
          created_at?: string;
          guidance_id: number;
          id?: never;
          participant_id: number;
          status: TripGuidanceStatus;
          trip_id: number;
          updated_at?: string;
        };
        Relationships: [];
        Row: TripGuidanceResponse;
        Update: {
          acknowledged_at?: string | null;
          acknowledged_by_display_name?: string | null;
          acknowledged_by_profile_id?: number | null;
          status?: TripGuidanceStatus;
          updated_at?: string;
        };
      };
      trip_guidance_updates: {
        Insert: {
          acts?: string | null;
          closed_at?: string | null;
          current_latitude?: number | null;
          current_longitude?: number | null;
          current_place_name: string;
          current_place_slug?: string | null;
          departure_at: string;
          description?: string | null;
          distance_hint?: string | null;
          id?: never;
          meeting_latitude?: number | null;
          meeting_longitude?: number | null;
          meeting_point: string;
          next_program_name: string;
          published_at?: string;
          published_by_profile_id?: number | null;
          relevant_gate?: string | null;
          trip_id: number;
          updated_at?: string;
        };
        Relationships: [];
        Row: TripGuidanceUpdate;
        Update: {
          acts?: string | null;
          closed_at?: string | null;
          current_latitude?: number | null;
          current_longitude?: number | null;
          current_place_name?: string;
          current_place_slug?: string | null;
          departure_at?: string;
          description?: string | null;
          distance_hint?: string | null;
          meeting_latitude?: number | null;
          meeting_longitude?: number | null;
          meeting_point?: string;
          next_program_name?: string;
          relevant_gate?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_archive_trip: {
        Args: { p_trip_id: number };
        Returns: Trip;
      };
      admin_escalate_bus_boarding_participant: {
        Args: { p_boarding_id: number; p_participant_id: number };
        Returns: BusBoardingEscalation;
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
      admin_acknowledge_trip_guidance_problem: {
        Args: { p_response_id: number };
        Returns: TripGuidanceResponse;
      };
      admin_publish_trip_guidance: {
        Args: {
          p_acts: string;
          p_current_latitude: number | null;
          p_current_longitude: number | null;
          p_current_place_name: string;
          p_current_place_slug: string;
          p_departure_at: string;
          p_description: string;
          p_distance_hint: string;
          p_meeting_latitude: number | null;
          p_meeting_longitude: number | null;
          p_meeting_point: string;
          p_next_program_name: string;
          p_relevant_gate: string;
          p_trip_id: number;
        };
        Returns: TripGuidanceUpdate;
      };
      admin_update_trip_guidance: {
        Args: {
          p_acts: string;
          p_current_latitude: number | null;
          p_current_longitude: number | null;
          p_current_place_name: string;
          p_current_place_slug: string;
          p_departure_at: string;
          p_description: string;
          p_distance_hint: string;
          p_guidance_id: number;
          p_meeting_latitude: number | null;
          p_meeting_longitude: number | null;
          p_meeting_point: string;
          p_next_program_name: string;
          p_relevant_gate: string;
        };
        Returns: TripGuidanceUpdate;
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
      can_dispatch_general_alarm: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      claim_due_general_alarm_notifications: {
        Args: never;
        Returns: GeneralAlarmNotificationClaim[];
      };
      complete_general_alarm_notification_attempts: {
        Args: {
          p_accepted: boolean;
          p_attempt_ids: number[];
          p_error_code: string;
        };
        Returns: undefined;
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
      respond_to_trip_guidance: {
        Args: {
          p_guidance_id: number;
          p_participant_id: number;
          p_status: TripGuidanceStatus;
        };
        Returns: TripGuidanceResponse;
      };
      respond_to_bus_boarding: {
        Args: {
          p_boarding_id: number;
          p_participant_id: number;
          p_status: BusBoardingStatus;
        };
        Returns: BusBoardingResponse;
      };
      register_push_notification_device: {
        Args: {
          p_expo_push_token: string;
          p_locale: 'ar' | 'de' | 'en';
          p_platform: 'android' | 'ios';
        };
        Returns: undefined;
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
      unregister_push_notification_device: {
        Args: { p_expo_push_token: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: AppRole;
      bus_boarding_status: BusBoardingStatus;
      member_type: MemberType;
      trip_guidance_status: TripGuidanceStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

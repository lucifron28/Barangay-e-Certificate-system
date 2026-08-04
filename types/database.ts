import type {
  CertificateType,
  PaymentStatus,
  MockPaymentStatus,
  ProfileRole,
  RequestStatus,
} from "@/types/enums";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Profile = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  age: number | null;
  address_sitio: string | null;
  date_of_birth: string | null;
  civil_status: string | null;
  contact_number: string | null;
  gender: string | null;
  occupation: string | null;
  email: string;
  username: string | null;
  password_hash: string | null;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
};

export type CertificateRequest = {
  id: string;
  request_number: string;
  resident_id: string;
  certificate_type: CertificateType;
  purpose: string;
  status: RequestStatus;
  remarks: string | null;
  submitted_data: Json;
  control_number: string | null;
  fee_amount: number;
  payment_status: PaymentStatus;
  date_requested: string;
  date_accepted: string | null;
  date_released: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PickupSchedule = {
  id: string;
  request_id: string;
  pickup_date: string;
  pickup_time: string;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CertificateRecord = {
  id: string;
  request_id: string;
  certificate_type: CertificateType;
  resident_id: string;
  date_issued: string;
  prepared_by: string | null;
  control_number: string | null;
  template_data: Json;
  pdf_path: string | null;
  certificate_number: string | null;
  status: "draft" | "issued" | "revoked" | "expired";
  issuance_mode: "fully_online_demo" | "hybrid_physical_original";
  issued_at: string | null;
  issued_by: string | null;
  certificate_snapshot: Json;
  pdf_sha256: string | null;
  verification_expires_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  revocation_reason: string | null;
  replacement_record_id: string | null;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  user_id: string | null;
  role: string;
  action: string;
  affected_table: string | null;
  affected_record_id: string | null;
  remarks: string | null;
  created_at: string;
};

export type NotificationLog = {
  id: string;
  request_id: string | null;
  recipient_email: string;
  subject: string;
  message: string;
  status: string;
  provider_response: Json | null;
  created_at: string;
};

export type Payment = {
  id: string;
  request_id: string;
  resident_id: string;
  provider: string;
  provider_transaction_id: string;
  amount: number;
  currency: string;
  status: MockPaymentStatus;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SystemSetting = {
  id: string;
  key: string;
  value: Json;
  created_at: string;
  updated_at: string;
};

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: never[];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        Profile,
        Partial<Omit<Profile, "created_at" | "updated_at">> & {
          auth_user_id?: string | null;
          email: string;
          full_name: string;
          role?: ProfileRole;
        },
        Partial<Omit<Profile, "id" | "auth_user_id" | "created_at">>
      >;
      certificate_requests: TableDefinition<
        CertificateRequest,
        Partial<
          Omit<
            CertificateRequest,
            "id" | "request_number" | "created_at" | "updated_at"
          >
        > & {
          resident_id: string;
          certificate_type: CertificateType;
          purpose: string;
          submitted_data: Json;
        },
        Partial<Omit<CertificateRequest, "id" | "created_at">>
      >;
      pickup_schedules: TableDefinition<
        PickupSchedule,
        Partial<Omit<PickupSchedule, "id" | "created_at" | "updated_at">> & {
          request_id: string;
          pickup_date: string;
          pickup_time: string;
        },
        Partial<Omit<PickupSchedule, "id" | "created_at">>
      >;
      certificate_records: TableDefinition<
        CertificateRecord,
        Partial<Omit<CertificateRecord, "id" | "created_at">> & {
          request_id: string;
          certificate_type: CertificateType;
          resident_id: string;
          date_issued: string;
          template_data: Json;
        },
        Partial<Omit<CertificateRecord, "id" | "created_at">>
      >;
      activity_logs: TableDefinition<
        ActivityLog,
        Partial<Omit<ActivityLog, "id" | "created_at">> & {
          role: string;
          action: string;
        },
        Partial<Omit<ActivityLog, "id" | "created_at">>
      >;
      notification_logs: TableDefinition<
        NotificationLog,
        Partial<Omit<NotificationLog, "id" | "created_at">> & {
          recipient_email: string;
          subject: string;
          message: string;
          status: string;
        },
        Partial<Omit<NotificationLog, "id" | "created_at">>
      >;
      system_settings: TableDefinition<
        SystemSetting,
        Partial<Omit<SystemSetting, "id" | "created_at" | "updated_at">> & {
          key: string;
          value: Json;
        },
        Partial<Omit<SystemSetting, "id" | "created_at">>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

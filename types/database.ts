import type {
  CertificateType,
  PaymentRecordStatus,
  PaymentStatus,
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

export type CertificateSnapshot = {
  certificate_number: string;
  request_number: string;
  control_number: string | null;
  certificate_type: CertificateType;
  purpose: string;
  date_issued: string;
  issued_at: string;
  verification_expires_at: string;
  issuance_mode: "fully_online_demo";
  holder_full_name: string;
  holder_age: number | null;
  holder_address_sitio: string | null;
  holder_contact_number: string | null;
  holder_birthdate: string | null;
  holder_place_of_birth: string | null;
  holder_years_of_residency: number | null;
  prepared_by_display_name: string;
  authorized_official_display_name: string;
  authorized_official_role?: string;
  signature_representation_type:
    | "visual_name_placeholder"
    | "visual_signature_image";
  signature_image_key?: string | null;
  signature_image_provider?: "local" | "vercel_blob" | null;
  signature_image_sha256?: string | null;
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
  pdf_storage_provider: "local" | "vercel_blob";
  pdf_storage_key: string | null;
  certificate_number: string | null;
  status: "draft" | "issued" | "revoked" | "expired";
  issuance_mode: "fully_online_demo";
  issued_at: string | null;
  issued_by: string | null;
  certificate_snapshot: CertificateSnapshot;
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
  status: PaymentRecordStatus;
  submitted_at: string | null;
  transaction_datetime: string | null;
  proof_storage_provider: "local" | "vercel_blob" | null;
  proof_storage_key: string | null;
  proof_sha256: string | null;
  paid_at: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_remarks: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentEvent = {
  id: string;
  payment_id: string;
  event_type: string;
  payload: Json;
  created_at: string;
};

export type PaymentMethodConfig = {
  enabled: boolean;
  merchantName: string;
  qrStorageProvider: "local" | "vercel_blob" | null;
  qrStorageKey: string | null;
  qrUpdatedAt: string | null;
};

export type PaymentReceivingSettings = {
  gcash: PaymentMethodConfig;
  maya: PaymentMethodConfig;
};

export type PaymentWithDetails = Payment & {
  request?: CertificateRequest;
  resident?: Profile;
  reviewer?: Profile | null;
  events?: PaymentEvent[];
};

export type SystemSetting = {
  id: string;
  key: string;
  value: Json;
  created_at: string;
  updated_at: string;
};
export type CertificateVerificationDto = {
  certificateNumber: string;
  certificateType: CertificateType;
  dateIssued: string;
  expiresAt: string;
  fullName: string;
  pdfSha256: string | null;
  replacementRecordId: string | null;
  shortCode: string;
  status: "valid" | "expired" | "revoked" | "replaced";
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
      payments: TableDefinition<
        Payment,
        Partial<Omit<Payment, "id" | "created_at" | "updated_at">> & {
          amount: number;
          provider: string;
          provider_transaction_id: string;
          request_id: string;
          resident_id: string;
          status: PaymentRecordStatus;
        },
        Partial<Omit<Payment, "id" | "created_at">>
      >;
      payment_events: TableDefinition<
        PaymentEvent,
        Partial<Omit<PaymentEvent, "id" | "created_at">> & {
          event_type: string;
          payment_id: string;
        },
        Partial<Omit<PaymentEvent, "id" | "created_at">>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getProfileById,
  getRequestById,
  getResidentRequestById,
  getSystemSettings as getSqliteSystemSettings,
  listActivityLogs as listSqliteActivityLogs,
  listAllRequests,
  listPickupSchedules as listSqlitePickupSchedules,
  listResidentHistory,
  listResidentRequests as listSqliteResidentRequests,
  listResidents as listSqliteResidents,
  listSchedulableRequests as listSqliteSchedulableRequests,
  type ActivityLogWithUser,
  type RequestWithResident,
  type ScheduleWithRequest,
  type SystemSettings,
} from "@/lib/db/sqlite/queries";
import { getDatabaseProvider } from "@/lib/db/provider";
import type { Database, PickupSchedule, Profile } from "@/types/database";

export type { ActivityLogWithUser, RequestWithResident, ScheduleWithRequest, SystemSettings };

type Supabase = SupabaseClient<Database> | null;

function requireSupabase(supabase: Supabase) {
  if (!supabase) {
    throw new Error("Supabase client is not available in this mode.");
  }

  return supabase;
}

export async function listResidentRequests(
  residentId: string,
  supabase: Supabase,
) {
  if (getDatabaseProvider() === "sqlite") {
    return listSqliteResidentRequests(residentId);
  }

  const { data } = await requireSupabase(supabase)
    .from("certificate_requests")
    .select("*, resident:profiles!certificate_requests_resident_id_fkey(*), pickup_schedules(*)")
    .eq("resident_id", residentId)
    .order("date_requested", { ascending: false });

  return (data ?? []) as RequestWithResident[];
}

export async function listAdminRequests(supabase: Supabase) {
  if (getDatabaseProvider() === "sqlite") {
    return listAllRequests();
  }

  const { data } = await requireSupabase(supabase)
    .from("certificate_requests")
    .select("*, resident:profiles!certificate_requests_resident_id_fkey(*), pickup_schedules(*)")
    .order("date_requested", { ascending: false });

  return (data ?? []) as RequestWithResident[];
}

export async function getResidentRequest(
  id: string,
  residentId: string,
  supabase: Supabase,
) {
  if (getDatabaseProvider() === "sqlite") {
    return getResidentRequestById(id, residentId);
  }

  const { data } = await requireSupabase(supabase)
    .from("certificate_requests")
    .select("*, resident:profiles!certificate_requests_resident_id_fkey(*), pickup_schedules(*)")
    .eq("id", id)
    .eq("resident_id", residentId)
    .maybeSingle();

  return data as RequestWithResident | null;
}

export async function getAdminRequest(id: string, supabase: Supabase) {
  if (getDatabaseProvider() === "sqlite") {
    return getRequestById(id);
  }

  const { data } = await requireSupabase(supabase)
    .from("certificate_requests")
    .select("*, resident:profiles!certificate_requests_resident_id_fkey(*), pickup_schedules(*)")
    .eq("id", id)
    .maybeSingle();

  return data as RequestWithResident | null;
}

export async function listSchedulableRequests(supabase: Supabase) {
  if (getDatabaseProvider() === "sqlite") {
    return listSqliteSchedulableRequests();
  }

  const { data } = await requireSupabase(supabase)
    .from("certificate_requests")
    .select("*, resident:profiles!certificate_requests_resident_id_fkey(*), pickup_schedules(*)")
    .in("status", ["accepted", "ready_for_pickup"])
    .order("date_requested", { ascending: false });

  return (data ?? []) as RequestWithResident[];
}

export async function listPickupSchedules(supabase: Supabase) {
  if (getDatabaseProvider() === "sqlite") {
    return listSqlitePickupSchedules();
  }

  const { data } = await requireSupabase(supabase)
    .from("pickup_schedules")
    .select(
      "*, request:certificate_requests!pickup_schedules_request_id_fkey(*, resident:profiles!certificate_requests_resident_id_fkey(*), pickup_schedules(*))",
    )
    .order("pickup_date", { ascending: true });

  return (data ?? []) as ScheduleWithRequest[];
}

export async function listResidents(supabase: Supabase) {
  if (getDatabaseProvider() === "sqlite") {
    return listSqliteResidents();
  }

  const { data } = await requireSupabase(supabase)
    .from("profiles")
    .select("*")
    .eq("role", "resident")
    .order("created_at", { ascending: false });

  return (data ?? []) as Profile[];
}

export async function getResidentRecord(id: string, supabase: Supabase) {
  if (getDatabaseProvider() === "sqlite") {
    return {
      profile: getProfileById(id),
      requests: listResidentHistory(id),
    };
  }

  const [{ data: profile }, { data: requests }] = await Promise.all([
    requireSupabase(supabase).from("profiles").select("*").eq("id", id).maybeSingle(),
    requireSupabase(supabase)
      .from("certificate_requests")
      .select("*, resident:profiles!certificate_requests_resident_id_fkey(*), pickup_schedules(*)")
      .eq("resident_id", id)
      .order("date_requested", { ascending: false }),
  ]);

  return {
    profile: profile as Profile | null,
    requests: (requests ?? []) as RequestWithResident[],
  };
}

export async function listActivityLogs(supabase: Supabase) {
  if (getDatabaseProvider() === "sqlite") {
    return listSqliteActivityLogs();
  }

  const { data } = await requireSupabase(supabase)
    .from("activity_logs")
    .select("*, user:profiles!activity_logs_user_id_fkey(full_name, email)")
    .order("created_at", { ascending: false });

  return (data ?? []) as ActivityLogWithUser[];
}

export async function getSystemSettings(supabase: Supabase): Promise<SystemSettings> {
  if (getDatabaseProvider() === "sqlite") {
    return getSqliteSystemSettings();
  }

  const { data } = await requireSupabase(supabase)
    .from("system_settings")
    .select("key, value");
  const rows = (data ?? []) as { key: string; value: unknown }[];
  const map = new Map(rows.map((row) => [row.key, row.value]));

  return {
    barangayCaptainName:
      (map.get("barangay_captain_name") as string | undefined) ??
      "Barangay Captain Name",
    signatureImagePath:
      (map.get("signature_image_path") as string | undefined) ?? null,
  };
}

export function filterRequests(
  requests: RequestWithResident[],
  params: Record<string, string | string[] | undefined>,
) {
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  };

  return requests.filter((request) => {
    const type = read("certificate_type");
    const status = read("status");
    const residentName = read("resident_name").toLowerCase();
    const from = read("date_from");
    const to = read("date_to");
    const month = read("month");
    const year = read("year");
    const dateRequested = read("date_requested");
    const requestedDate = request.date_requested.slice(0, 10);

    return (
      (!type || request.certificate_type === type) &&
      (!status || request.status === status) &&
      (!residentName ||
        request.resident?.full_name.toLowerCase().includes(residentName)) &&
      (!from || requestedDate >= from) &&
      (!to || requestedDate <= to) &&
      (!month || String(new Date(request.date_requested).getMonth() + 1) === month) &&
      (!year || String(new Date(request.date_requested).getFullYear()) === year) &&
      (!dateRequested || requestedDate === dateRequested)
    );
  });
}

export function flattenPickup(schedule: PickupSchedule | undefined) {
  return schedule
    ? `${schedule.pickup_date} ${schedule.pickup_time}`
    : "Not scheduled";
}

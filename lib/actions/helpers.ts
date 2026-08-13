import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSqliteProvider } from "@/lib/db/provider";
import { createActivityLog } from "@/lib/db/queries";
import type { Database, Profile } from "@/types/database";

export function firstZodError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

export function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export function redirectWithMessage(path: string, message: string): never {
  redirect(`${path}?message=${encodeURIComponent(message)}`);
}

export async function logActivity({
  action,
  affectedRecordId,
  affectedTable,
  profile,
  remarks,
  supabase,
}: {
  action: string;
  affectedRecordId?: string;
  affectedTable?: string;
  profile: Profile;
  remarks?: string;
  supabase: SupabaseClient<Database> | null;
}) {
  if (isSqliteProvider()) {
    await createActivityLog({
      action,
      affected_record_id: affectedRecordId,
      affected_table: affectedTable,
      profile,
      remarks,
    });
    return;
  }

  if (!supabase) {
    return;
  }

  await supabase.from("activity_logs").insert({
    action,
    affected_record_id: affectedRecordId,
    affected_table: affectedTable,
    remarks,
    role: profile.role,
    user_id: profile.id,
  });
}

"use server";

import {
  firstZodError,
  logActivity,
  redirectWithError,
  redirectWithMessage,
} from "@/lib/actions/helpers";
import { requireResident } from "@/lib/auth/guards";
import { isSqliteProvider } from "@/lib/db/provider";
import { updateProfile } from "@/lib/db/sqlite/queries";
import { profileUpdateSchema } from "@/lib/validations/profile";

export async function updateResidentProfileAction(formData: FormData) {
  const context = await requireResident();

  if (context.setupMissing) {
    redirectWithError("/resident/account", "Supabase is not configured yet.");
  }

  const parsed = profileUpdateSchema.safeParse({
    full_name: formData.get("full_name"),
    age: formData.get("age"),
    address_sitio: formData.get("address_sitio"),
    date_of_birth: formData.get("date_of_birth"),
    civil_status: formData.get("civil_status"),
    contact_number: formData.get("contact_number"),
    gender: formData.get("gender"),
    occupation: formData.get("occupation"),
    username: formData.get("username"),
  });

  if (!parsed.success) {
    redirectWithError("/resident/account", firstZodError(parsed.error));
  }

  if (isSqliteProvider()) {
    const profile = updateProfile(context.profile.id, {
      address_sitio: parsed.data.address_sitio,
      age: parsed.data.age ?? null,
      civil_status: parsed.data.civil_status || null,
      contact_number: parsed.data.contact_number,
      date_of_birth: parsed.data.date_of_birth || null,
      full_name: parsed.data.full_name,
      gender: parsed.data.gender || null,
      occupation: parsed.data.occupation || null,
      username: parsed.data.username || null,
    });

    if (!profile) {
      redirectWithError(
        "/resident/account",
        "Unable to update profile. Please try again.",
      );
    }

    await logActivity({
      action: "Updated resident information",
      affectedRecordId: context.profile.id,
      affectedTable: "profiles",
      profile,
      remarks: "Resident updated their own profile.",
      supabase: context.supabase,
    });

    redirectWithMessage("/resident/account", "Profile updated.");
  }

  const { error } = await context.supabase!
    .from("profiles")
    .update({
      address_sitio: parsed.data.address_sitio,
      age: parsed.data.age ?? null,
      civil_status: parsed.data.civil_status || null,
      contact_number: parsed.data.contact_number,
      date_of_birth: parsed.data.date_of_birth || null,
      full_name: parsed.data.full_name,
      gender: parsed.data.gender || null,
      occupation: parsed.data.occupation || null,
      username: parsed.data.username || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", context.profile.id);

  if (error) {
    redirectWithError(
      "/resident/account",
      "Unable to update profile. Please try again.",
    );
  }

  await logActivity({
    action: "Updated resident information",
    affectedRecordId: context.profile.id,
    affectedTable: "profiles",
    profile: context.profile,
    remarks: "Resident updated their own profile.",
    supabase: context.supabase,
  });

  redirectWithMessage("/resident/account", "Profile updated.");
}

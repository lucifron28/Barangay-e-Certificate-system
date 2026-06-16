import type { ProfileRole } from "@/types/enums";

export function isAdminRole(role: ProfileRole | string | null | undefined) {
  return (
    role === "main_admin" ||
    role === "barangay_secretary" ||
    role === "admin"
  );
}

export function roleHome(role: ProfileRole | string | null | undefined) {
  return isAdminRole(role) ? "/admin/dashboard" : "/resident/dashboard";
}

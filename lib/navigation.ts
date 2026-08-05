import {
  Activity,
  CalendarDays,
  ClipboardList,
  FileText,
  Home,
  LayoutDashboard,
  Printer,
  Settings,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { IssuanceMode } from "@/lib/services/issuance-mode";

const residentNavItems = [
  {
    href: "/resident/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/resident/request-certificate",
    label: "Request Certificate",
    icon: FileText,
  },
  {
    href: "/resident/my-requests",
    label: "My Requests",
    icon: ClipboardList,
  },
  {
    href: "/resident/certificates",
    label: "My Certificates",
    icon: FileText,
  },
  {
    href: "/resident/account",
    label: "Account",
    icon: UserRound,
  },
] as const;

const residentPickupNavItem = {
  href: "/resident/pickup-schedule",
  label: "Pickup Schedule",
  icon: CalendarDays,
} as const;

const adminNavItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/certificate-requests",
    label: "Certificate Requests",
    icon: ClipboardList,
  },
  {
    href: "/admin/resident-records",
    label: "Resident Records",
    icon: UsersRound,
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: Printer,
  },
  {
    href: "/admin/activity-log",
    label: "Activity Log",
    icon: Activity,
  },
  {
    href: "/admin/account",
    label: "Account",
    icon: UserRound,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
  },
] as const;

const adminPickupNavItem = {
  href: "/admin/pickup-schedules",
  label: "Pickup Schedules",
  icon: CalendarDays,
} as const;

export function getResidentNavItems(mode: IssuanceMode) {
  return mode === "hybrid_physical_original"
    ? [...residentNavItems.slice(0, 4), residentPickupNavItem, ...residentNavItems.slice(4)]
    : residentNavItems;
}

export function getAdminNavItems(mode: IssuanceMode) {
  return mode === "hybrid_physical_original"
    ? [...adminNavItems.slice(0, 3), adminPickupNavItem, ...adminNavItems.slice(3)]
    : adminNavItems;
}

export const publicNavItems = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "/about",
    label: "About",
    icon: FileText,
  },
] as const;

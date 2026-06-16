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

export const residentNavItems = [
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
    href: "/resident/pickup-schedule",
    label: "Pickup Schedule",
    icon: CalendarDays,
  },
  {
    href: "/resident/account",
    label: "Account",
    icon: UserRound,
  },
] as const;

export const adminNavItems = [
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
    href: "/admin/pickup-schedules",
    label: "Pickup Schedules",
    icon: CalendarDays,
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

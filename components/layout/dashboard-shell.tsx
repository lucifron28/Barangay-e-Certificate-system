import Link from "next/link";
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { isAdminRole } from "@/lib/auth/roles";
import { getInitials } from "@/lib/utils/format";
import type { Profile } from "@/types/database";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

type DashboardShellProps = {
  children: React.ReactNode;
  navItems: readonly NavItem[];
  profile: Profile;
  title: string;
};

export function DashboardShell({
  children,
  navItems,
  profile,
  title,
}: DashboardShellProps) {
  return (
    <div className="drawer lg:drawer-open">
      <input id="dashboard-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex min-h-screen flex-col bg-base-200">
        <header className="navbar no-print sticky top-0 z-20 border-b border-base-300 bg-base-100/95 px-3 backdrop-blur sm:px-4">
          <div className="navbar-start min-w-0 gap-1 sm:gap-2">
            <label
              htmlFor="dashboard-drawer"
              className="btn btn-ghost btn-square lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" aria-hidden />
            </label>
            <div className="min-w-0">
              <p className="text-xs uppercase text-base-content/60">{title}</p>
              <p className="text-sm font-bold sm:hidden">Barangay Bato</p>
              <h1 className="hidden text-base font-bold sm:block lg:text-lg">
                Barangay Bato e-Certificate System
              </h1>
            </div>
          </div>
          <div className="navbar-end shrink-0 gap-1 sm:gap-3">
            <div className="hidden md:block">
              <ThemeSwitcher />
            </div>
            <div className="dropdown dropdown-end">
              <button
                className="btn btn-ghost gap-2"
                type="button"
                aria-label={`Open account menu for ${profile.full_name}`}
              >
                <div className="avatar placeholder">
                  <div className="w-9 rounded-full bg-primary text-primary-content">
                    <span className="text-xs">{getInitials(profile.full_name)}</span>
                  </div>
                </div>
                <span className="hidden max-w-40 truncate text-sm md:inline">
                  {profile.full_name}
                </span>
              </button>
              <div className="menu dropdown-content z-30 mt-3 w-64 rounded-lg border border-base-300 bg-base-100 p-3 shadow">
                <p className="px-3 py-2 text-sm font-semibold">
                  {profile.full_name}
                </p>
                <p className="px-3 pb-3 text-xs text-base-content/65">
                  {profile.email}
                </p>
                <div className="px-3 pb-3 md:hidden">
                  <ThemeSwitcher />
                </div>
                <form action={logoutAction}>
                  <button className="btn btn-outline btn-sm w-full" type="submit">
                    <LogOut className="size-4" aria-hidden />
                    Logout
                  </button>
                </form>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
      <div className="drawer-side no-print z-30">
        <label
          htmlFor="dashboard-drawer"
          aria-label="Close navigation"
          className="drawer-overlay"
        />
        <aside className="min-h-full w-72 border-r border-base-300 bg-base-100 p-4">
          <Link
            href={isAdminRole(profile.role) ? "/admin/dashboard" : "/resident/dashboard"}
            className="mb-6 flex items-center gap-3 rounded-lg px-2 py-3"
          >
            <div className="rounded-lg bg-primary p-2 text-primary-content">
              <ShieldCheck className="size-5" aria-hidden />
            </div>
            <div>
              <p className="font-bold leading-tight">Barangay Bato</p>
              <p className="text-xs text-base-content/60">Mauban, Quezon</p>
            </div>
          </Link>
          <ul className="menu gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link href={item.href} className="gap-3">
                    <Icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}

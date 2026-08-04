import Link from "next/link";
import { FileText, LogIn, Menu, UserPlus } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { publicNavItems } from "@/lib/navigation";

export function PublicNavbar() {
  return (
    <div className="navbar sticky top-0 z-30 border-b border-base-300 bg-base-100/95 px-3 shadow-sm backdrop-blur sm:px-4 lg:px-8">
      <div className="navbar-start min-w-0">
        <Link href="/" className="btn btn-ghost min-h-11 gap-2 px-2 text-left">
          <FileText className="size-5 text-primary" aria-hidden />
          <span className="leading-tight">
            <span className="block text-sm font-bold">Barangay Bato</span>
            <span className="block text-xs font-normal text-base-content/65">
              e-Certificate
            </span>
          </span>
        </Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal gap-1 px-1">
          {publicNavItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="navbar-end shrink-0 gap-1 sm:gap-2">
        <div className="hidden lg:block">
          <ThemeSwitcher />
        </div>
        <Link href="/login" className="btn btn-ghost btn-sm">
          <LogIn className="size-4" aria-hidden />
          Login
        </Link>
        <Link href="/register" className="btn btn-primary btn-sm">
          <UserPlus className="size-4" aria-hidden />
          Register
        </Link>
        <details className="dropdown dropdown-end lg:hidden">
          <summary className="btn btn-ghost btn-square btn-sm" aria-label="Open navigation menu">
            <Menu className="size-5" aria-hidden />
          </summary>
          <ul className="menu dropdown-content z-40 mt-3 w-60 rounded-lg border border-base-300 bg-base-100 p-2 shadow">
            {publicNavItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
            <li className="mt-2 border-t border-base-300 pt-2">
              <ThemeSwitcher />
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
}

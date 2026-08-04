import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone?: "default" | "primary" | "success" | "warning" | "error" | "info";
};

const toneClass: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-base-content",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: StatCardProps) {
  return (
    <div className="flex min-h-28 min-w-0 items-start justify-between gap-3 rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase text-base-content/60">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      </div>
      <Icon className={`size-6 shrink-0 ${toneClass[tone]}`} aria-hidden />
    </div>
  );
}

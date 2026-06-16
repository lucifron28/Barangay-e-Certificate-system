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
    <div className="stats rounded-lg border border-base-300 bg-base-100 shadow-sm">
      <div className="stat gap-2">
        <div className={`stat-figure ${toneClass[tone]}`}>
          <Icon className="size-7" aria-hidden />
        </div>
        <div className="stat-title text-xs uppercase tracking-normal">{label}</div>
        <div className="stat-value text-2xl">{value}</div>
      </div>
    </div>
  );
}

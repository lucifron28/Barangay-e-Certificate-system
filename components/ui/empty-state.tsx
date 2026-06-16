import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-base-300 bg-base-100 p-8 text-center">
      <Icon className="mx-auto mb-3 size-10 text-base-content/50" aria-hidden />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-base-content/70">
        {description}
      </p>
    </div>
  );
}

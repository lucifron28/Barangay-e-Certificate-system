import type { ReactNode } from "react";

type MobileRecordField = {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
};

type MobileRecordCardProps = {
  title: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  fields: MobileRecordField[];
  actions?: ReactNode;
};

export function MobileRecordCard({
  title,
  description,
  status,
  fields,
  actions,
}: MobileRecordCardProps) {
  return (
    <article className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="break-words text-sm font-bold">{title}</div>
          {description ? (
            <div className="mt-1 text-sm text-base-content/70">{description}</div>
          ) : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {fields.map((field) => (
          <div key={field.label} className={field.fullWidth ? "col-span-2" : "min-w-0"}>
            <dt className="text-xs font-medium uppercase text-base-content/55">
              {field.label}
            </dt>
            <dd className="mt-1 break-words text-sm font-medium">{field.value}</dd>
          </div>
        ))}
      </dl>
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}

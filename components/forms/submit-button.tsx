"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  pendingText?: string;
};

export function SubmitButton({
  children,
  className = "btn btn-primary",
  disabled = false,
  pendingText = "Saving...",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={disabled || pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  containerClassName?: string;
};

export function PasswordInput({
  className = "",
  containerClassName = "",
  disabled,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative w-full ${containerClassName}`.trim()}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={`input input-bordered w-full pr-10 ${className}`.trim()}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => setVisible((prev) => !prev)}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-base-content/60 transition-colors hover:text-base-content focus:outline-none disabled:pointer-events-none disabled:opacity-50"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <EyeOff className="size-4.5" aria-hidden />
        ) : (
          <Eye className="size-4.5" aria-hidden />
        )}
      </button>
    </div>
  );
}

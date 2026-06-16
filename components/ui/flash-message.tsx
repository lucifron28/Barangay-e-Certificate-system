type FlashMessageProps = {
  error?: string | string[];
  message?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function FlashMessage({ error, message }: FlashMessageProps) {
  const errorText = first(error);
  const messageText = first(message);

  if (!errorText && !messageText) {
    return null;
  }

  return (
    <div
      className={`alert ${errorText ? "alert-error" : "alert-success"} mb-6`}
      role="status"
    >
      <span>{errorText ?? messageText}</span>
    </div>
  );
}

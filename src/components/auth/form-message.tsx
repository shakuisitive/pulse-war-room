export function FormMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) {
    return null;
  }

  return (
    <p
      role={error ? "alert" : "status"}
      className={
        error
          ? "rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive"
          : "rounded-md bg-success-bg px-3 py-2 text-sm text-success"
      }
    >
      {error ?? success}
    </p>
  );
}

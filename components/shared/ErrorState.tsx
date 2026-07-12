import { AlertTriangle } from "lucide-react";

export function ErrorState({
  title = "Something went wrong",
  body,
  retry,
}: {
  title?: string;
  body?: string;
  retry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 border border-loss/50 bg-loss/5 px-6 py-10 text-center"
    >
      <AlertTriangle size={22} className="text-loss-text" aria-hidden />
      <p className="font-display text-base font-bold text-loss-text">{title}</p>
      {body && <p className="max-w-md text-sm text-ink-2">{body}</p>}
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="min-h-11 border border-line px-4 text-sm font-medium hover:border-ink-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}

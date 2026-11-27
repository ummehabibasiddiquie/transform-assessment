import { saveTrackDuration } from "@/lib/library-actions";
import { SubmitButton } from "@/components/SubmitButton";

export function RoleDurationForm({
  code,
  durationMin,
  returnTo,
}: {
  code: string;
  durationMin: number;
  returnTo: string;
}) {
  return (
    <form action={saveTrackDuration} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="sr-only" htmlFor={`duration-${code}`}>
        Paper minutes for this role
      </label>
      <input
        id={`duration-${code}`}
        name="durationMin"
        type="number"
        min={15}
        max={120}
        defaultValue={durationMin}
        className="w-20 rounded-md border border-staff-line bg-staff-bg px-2 py-1.5 text-staff-strong outline-none focus:border-staff-accent"
      />
      <span className="text-xs text-staff-muted">min</span>
      <SubmitButton
        pendingText="Saving…"
        className="rounded-md border border-staff-line px-2.5 py-1.5 text-xs text-staff-strong"
      >
        Save
      </SubmitButton>
    </form>
  );
}

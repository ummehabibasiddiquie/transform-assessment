const inputClass =
  "w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2.5 text-staff-strong outline-none focus:border-staff-accent";

const TYPES = ["MCQ", "SHORT", "PRACTICAL", "MULTI_SELECT", "NUMERIC", "CLASSIFICATION", "MATCHING", "RANKING"];

type TaskFields = {
  title: string;
  family?: string;
  instructions: string;
  referenceMaterial?: string;
  evidenceNotes?: string;
  timeLimitMin: number | null;
  aiAllowed: boolean;
  responseType?: string;
  optionsJson?: string;
};

function optionsText(optionsJson?: string) {
  if (!optionsJson) return "";
  try {
    const parsed = JSON.parse(optionsJson) as { id?: string; label?: string }[];
    if (!Array.isArray(parsed)) return "";
    return parsed
      .filter((row) => row?.id && row?.label)
      .map((row) => `${row.id}. ${row.label}`)
      .join("\n");
  } catch {
    return "";
  }
}

export function TaskEditorForm({
  action,
  task,
  versionId,
  candidateId,
  trackCode,
  paperId,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  task?: TaskFields & { id?: string };
  versionId: string;
  candidateId?: string;
  trackCode?: string;
  paperId?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="versionId" value={versionId} />
      {task?.id ? <input type="hidden" name="taskId" value={task.id} /> : null}
      {candidateId ? <input type="hidden" name="candidateId" value={candidateId} /> : null}
      {trackCode ? <input type="hidden" name="trackCode" value={trackCode} /> : null}
      {paperId ? <input type="hidden" name="paperId" value={paperId} /> : null}

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Title</span>
        <input name="title" required defaultValue={task?.title} className={inputClass} />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Type</span>
        <select name="responseType" defaultValue={task?.responseType ?? "SHORT"} className={inputClass}>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
          Candidate instructions
        </span>
        <textarea
          name="instructions"
          required
          rows={8}
          defaultValue={task?.instructions}
          className={inputClass}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
          Options (one per line, for MCQ)
        </span>
        <textarea name="options" rows={4} defaultValue={optionsText(task?.optionsJson)} className={inputClass} />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
          Reference material (optional)
        </span>
        <textarea
          name="referenceMaterial"
          rows={4}
          defaultValue={task?.referenceMaterial}
          className={inputClass}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
          What the evaluator should look for
        </span>
        <textarea
          name="evidenceNotes"
          rows={4}
          defaultValue={task?.evidenceNotes}
          className={inputClass}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
          Time guide (minutes)
        </span>
        <input
          name="timeLimitMin"
          type="number"
          min={1}
          defaultValue={task?.timeLimitMin ?? 15}
          className={inputClass}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-staff-body">
        <input type="checkbox" name="aiAllowed" defaultChecked={task?.aiAllowed ?? false} />
        Candidate may use search and AI
      </label>

      <button className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg">
        {submitLabel}
      </button>
    </form>
  );
}

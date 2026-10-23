const inputClass =
  "w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2.5 text-staff-strong outline-none focus:border-staff-accent";

const FAMILIES = [
  { value: "CUSTOM", label: "Written answer" },
  { value: "A", label: "Learn a rule (A)" },
  { value: "P", label: "Investigate a problem (P)" },
  { value: "R", label: "Research and verify (R)" },
  { value: "C", label: "Requirement change (C)" },
  { value: "M", label: "Internal communication (M)" },
  { value: "I", label: "Improve a process (I)" },
];

type TaskFields = {
  title: string;
  family: string;
  instructions: string;
  referenceMaterial: string;
  evidenceNotes: string;
  timeLimitMin: number | null;
  aiAllowed: boolean;
};

export function TaskEditorForm({
  action,
  task,
  versionId,
  candidateId,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  task?: TaskFields & { id?: string };
  versionId: string;
  candidateId?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="versionId" value={versionId} />
      {task?.id ? <input type="hidden" name="taskId" value={task.id} /> : null} 
      {candidateId ? <input type="hidden" name="candidateId" value={candidateId} /> : null}

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Title</span>
        <input name="title" required defaultValue={task?.title} className={inputClass} />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">Task type</span>
        <select name="family" defaultValue={task?.family ?? "CUSTOM"} className={inputClass}>
          {FAMILIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
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
          Reference material (optional)
        </span>
        <textarea
          name="referenceMaterial"
          rows={6}
          defaultValue={task?.referenceMaterial}
          className={inputClass}
          placeholder="Examples, data, or notes the candidate should see"
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
        <input
          type="checkbox"
          name="aiAllowed"
          defaultChecked={task?.aiAllowed ?? true}
        />
        Candidate may use search and AI
      </label>

      <button className="rounded-md bg-staff-accent px-4 py-2.5 text-sm font-medium text-staff-bg">
        {submitLabel}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2.5 text-[#f3efe6] outline-none focus:border-[#d9784a]";

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
        <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">Title</span>
        <input name="title" required defaultValue={task?.title} className={inputClass} />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">Task type</span>
        <select name="family" defaultValue={task?.family ?? "CUSTOM"} className={inputClass}>
          {FAMILIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
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
        <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
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
        <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
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
        <span className="text-xs uppercase tracking-[0.16em] text-[#9aa392]">
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

      <label className="flex items-center gap-2 text-sm text-[#c8cdb8]">
        <input
          type="checkbox"
          name="aiAllowed"
          defaultChecked={task?.aiAllowed ?? true}
        />
        Candidate may use search and AI
      </label>

      <button className="rounded-md bg-[#d9784a] px-4 py-2.5 text-sm font-medium text-[#121612]">
        {submitLabel}
      </button>
    </form>
  );
}

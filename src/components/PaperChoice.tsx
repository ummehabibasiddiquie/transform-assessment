type Option = { value: string; label: string };

const selectClass =
  "w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2.5 text-staff-strong";

export function PaperChoice({
  tracks,
  papers,
}: {
  tracks: Option[];
  papers: Option[];
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
        Role or staff paper
      </span>
      <select name="inviteChoice" required defaultValue="" className={selectClass}>
        <option value="" disabled>
          Select a role, or a paper made in Assessment designer
        </option>
        <optgroup label="Roles — paper is built from the question bank">
          {tracks.map((track) => (
            <option key={track.value} value={`role:${track.value}`}>
              {track.label}
            </option>
          ))}
        </optgroup>
        {papers.length > 0 ? (
          <optgroup label="Staff papers">
            {papers.map((paper) => (
              <option key={paper.value} value={`paper:${paper.value}`}>
                {paper.label}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </label>
  );
}

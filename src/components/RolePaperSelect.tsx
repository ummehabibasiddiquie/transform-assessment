"use client";

type Track = { code: string; label: string };
type PaperOption = { go: string; label: string };

export function RolePaperSelect({
  tracks,
  papers,
  current,
}: {
  tracks: Track[];
  papers: PaperOption[];
  current: string;
}) {
  return (
    <form action="/console/assessment" method="get" className="max-w-xl" key={current || "none"}>
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
          Roles and staff papers
        </span>
        <select
          name="go"
          defaultValue={current}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2.5 text-staff-strong outline-none focus:border-staff-accent"
        >
          <option value="">No role — use a blank paper</option>
          <optgroup label="Roles">
            {tracks.map((track) => (
              <option key={track.code} value={`role:${track.code}`}>
                {track.label}
              </option>
            ))}
          </optgroup>
          {papers.length > 0 ? (
            <optgroup label="Staff papers">
              {papers.map((paper) => (
                <option key={paper.go} value={paper.go}>
                  {paper.label}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>
    </form>
  );
}

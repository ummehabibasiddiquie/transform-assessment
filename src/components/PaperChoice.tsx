"use client";

import { useState } from "react";

type Option = { value: string; label: string };

const selectClass =
  "w-full rounded-md border border-staff-line bg-staff-bg px-3 py-2.5 text-staff-strong";

export function PaperChoice({ tracks, papers }: { tracks: Option[]; papers: Option[] }) {
  const [trackCode, setTrackCode] = useState(tracks[0]?.value ?? "");

  return (
    <>
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
          Role and level
        </span>
        <select
          name="trackCode"
          value={trackCode}
          onChange={(event) => setTrackCode(event.target.value)}
          className={selectClass}
        >
          {tracks.map((track) => (
            <option key={track.value} value={track.value}>
              {track.label}
            </option>
          ))}
          <option value="">Use a fixed paper from the Assessment designer</option>
        </select>
      </label>
      {trackCode === "" ? (
        papers.length > 0 ? (
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.16em] text-staff-muted">
              Fixed paper
            </span>
            <select name="assessmentVersionId" defaultValue={papers[0].value} className={selectClass}>
              {papers.map((paper) => (
                <option key={paper.value} value={paper.value}>
                  {paper.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-staff-accent">
            No fixed paper is published. Publish one in the Assessment designer, or choose a role.
          </p>
        )
      ) : null}
    </>
  );
}
